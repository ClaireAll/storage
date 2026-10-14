import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { deleteOwnOssObject } from "@/utils/oss-server";
import {
  imageReferences,
  validateGraph,
  type AtlasGraph,
} from "@/app/(pages)/home/atlas/atlas-model";

/** 只接受当前用户 atlas 目录的对象地址，避免删除其他业务资源。 */
function imageKey(url: string, userId: string) {
  if (url === "/atlas-example.svg") return null;
  const base = process.env.ALIYUN_OSS_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!base || !url.startsWith(`${base}/`))
    throw new Error("图片地址不属于当前存储");
  const key = decodeURIComponent(url.slice(base.length + 1));
  if (
    !key.startsWith(`atlas/${userId}/`) ||
    key.split("/").some((part) => part === ".." || part === ".")
  )
    throw new Error("图片不属于当前用户");
  return key;
}

/** 为当前用户读取图谱，不通过客户端传入用户身份。 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  try {
    const { data, error } = await createAdminClient()
      .from("atlas_graphs")
      .select("graph,pending_delete_keys")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) throw error;
    if (data?.graph) validateGraph(data.graph);
    return NextResponse.json({
      graph: data?.graph ?? null,
      cleanupPending: Array.isArray(data?.pending_delete_keys)
        ? data.pending_delete_keys.length
        : 0,
    });
  } catch {
    return NextResponse.json(
      { message: "读取知识星图失败，请检查 atlas_graphs 表与服务端配置" },
      { status: 500 },
    );
  }
}

/** 先提交新图及持久清理名单，再删除不再引用的图片；失败名单下次保存重试。 */
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  const userId = session.user.id;
  let graph: AtlasGraph;
  let uploadedKeys: string[] = [];
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 10_000_000)
      throw new Error("图谱过大");
    const payload = await request.json();
    validateGraph(payload.graph);
    graph = payload.graph;
    imageReferences(graph).forEach((url) => imageKey(url, userId));
    if (payload.uploadedUrls !== undefined) {
      if (
        !Array.isArray(payload.uploadedUrls) ||
        payload.uploadedUrls.length > 1000 ||
        !payload.uploadedUrls.every((url: unknown) => typeof url === "string")
      )
        throw new Error("上传资源列表无效");
      uploadedKeys = payload.uploadedUrls
        .map((url: string) => imageKey(url, userId))
        .filter((key: string | null): key is string => !!key);
    }
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "图谱格式无效" },
      { status: 400 },
    );
  }
  try {
    const db = createAdminClient();
    const { data: previous, error: readError } = await db
      .from("atlas_graphs")
      .select("graph,pending_delete_keys,created_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (readError) throw readError;
    const currentKeys = new Set(
      imageReferences(graph)
        .map((url) => imageKey(url, userId))
        .filter((key): key is string => !!key),
    );
    const pending = new Set<string>();
    for (const key of uploadedKeys) if (!currentKeys.has(key)) pending.add(key);
    if (previous?.graph) {
      validateGraph(previous.graph);
      for (const url of imageReferences(previous.graph)) {
        const key = imageKey(url, userId);
        if (key && !currentKeys.has(key)) pending.add(key);
      }
    }
    for (const key of Array.isArray(previous?.pending_delete_keys)
      ? previous.pending_delete_keys
      : []) {
      if (
        typeof key === "string" &&
        key.startsWith(`atlas/${userId}/`) &&
        !currentKeys.has(key)
      )
        pending.add(key);
    }
    const timestamp = new Date().toISOString();
    const { error: saveError } = await db.from("atlas_graphs").upsert(
      {
        user_id: userId,
        graph,
        pending_delete_keys: [...pending],
        created_at: previous?.created_at ?? timestamp,
        update_at: timestamp,
      },
      { onConflict: "user_id" },
    );
    if (saveError) throw saveError;
    const failed: string[] = [];
    let deletedImages = 0;
    const base = process.env.ALIYUN_OSS_PUBLIC_BASE_URL?.replace(/\/$/, "");
    for (const key of pending) {
      try {
        // 再次检查最新引用，避免清理已被其他保存恢复的图片。
        const { data: latest, error } = await db
          .from("atlas_graphs")
          .select("graph")
          .eq("user_id", userId)
          .single();
        if (error) throw error;
        validateGraph(latest.graph);
        if (
          imageReferences(latest.graph).some(
            (url) => imageKey(url, userId) === key,
          )
        )
          continue;
        await deleteOwnOssObject(
          `${base}/${key.split("/").map(encodeURIComponent).join("/")}`,
          userId,
          ["atlas"],
        );
        deletedImages++;
      } catch {
        failed.push(key);
      }
    }
    let cleanupPending = failed.length;
    if (pending.size) {
      const { error } = await db
        .from("atlas_graphs")
        .update({ pending_delete_keys: failed })
        .eq("user_id", userId)
        .eq("update_at", timestamp);
      if (error) cleanupPending = pending.size;
    }
    return NextResponse.json({ saved: true, cleanupPending, deletedImages });
  } catch {
    return NextResponse.json(
      { message: "保存失败，当前编辑内容已保留，请检查数据库配置后重试" },
      { status: 500 },
    );
  }
}

/** 放弃编辑时仅清理本次上传且当前图谱未引用的图片。 */
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  try {
    const { urls } = await request.json();
    if (
      !Array.isArray(urls) ||
      urls.length > 100 ||
      !urls.every((url) => typeof url === "string")
    )
      throw new Error("清理请求无效");
    const { data, error } = await createAdminClient()
      .from("atlas_graphs")
      .select("graph")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) throw error;
    const used = new Set(data?.graph ? imageReferences(data.graph) : []);
    for (const url of urls) {
      imageKey(url, session.user.id);
      if (!used.has(url))
        await deleteOwnOssObject(url, session.user.id, ["atlas"]);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { message: "未保存图片清理失败" },
      { status: 500 },
    );
  }
}
