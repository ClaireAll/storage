"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  NodeResizer,
  Controls,
  useStore,
  SelectionMode,
  MarkerType,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
  type Connection,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Alert,
  App,
  Button,
  ColorPicker,
  Drawer,
  Empty,
  Image,
  Input,
  Spin,
  Segmented,
  Tooltip,
  theme,
  Typography,
} from "antd";
import {
  PlusOutlined,
  SaveOutlined,
  UndoOutlined,
  RedoOutlined,
  SearchOutlined,
  ApartmentOutlined,
  SettingOutlined,
  DeleteOutlined,
  PictureOutlined,
  BgColorsOutlined,
  SelectOutlined,
  DragOutlined,
} from "@ant-design/icons";
import { uploadImageToOss } from "@/utils/oss";
import { HomeContentFullscreenButton } from "../home-content-fullscreen";
import { AtlasEditor } from "./atlas-editor";
import { AtlasInspector } from "./atlas-inspector";
import { opaqueAtlasColor, randomAtlasColor } from "./atlas-colors";
import {
  AtlasAppearancePanel,
  AtlasBackground,
  AtlasVisualEdge,
} from "./atlas-appearance";
import {
  createExampleGraph,
  duplicateEdge,
  emptyDocument,
  imageReferences,
  searchGraph,
  appearancePreset,
  canvasTextColor,
  moveAtlasNodes,
  updateAtlasCategory,
  addAtlasCategory,
  type AtlasAppearance,
  type AtlasGraph,
  type AtlasNode,
  type AtlasEdge,
  type AtlasCategory,
  type AtlasDocument,
} from "./atlas-model";

type NodeData = {
  title: string;
  color: string;
  size: number;
  image?: string;
  fixed: boolean;
  dim: boolean;
  readOnly: boolean;
  resize: (id: string, width: number) => void;
  appearance: AtlasAppearance;
  glow: boolean;
  editing: boolean;
  finishCreate: (title: string) => void;
};
type FlowNode = Node<NodeData, "knowledge">;

/** 圆形知识节点和等比例图片节点，共享连接与选择能力。 */
const KnowledgeNode = memo(function KnowledgeNode({
  id,
  data,
  selected,
}: NodeProps<FlowNode>) {
  const hideLabel = useStore(
    (state) =>
      data.appearance.labelMode === "adaptive" && state.transform[2] < 0.55,
  );
  const glowColor = data.appearance.glowColor ?? data.color;
  const strength = data.appearance.glowStrength / 100;
  const boxShadow =
    data.glow && strength > 0
      ? `0 0 ${4 + 14 * strength}px color-mix(in srgb, ${glowColor} ${Math.round(20 + 45 * strength)}%, transparent)`
      : undefined;
  return (
    <div
      className="group relative flex flex-col items-center"
      style={{ opacity: data.dim ? 0.25 : 1 }}
    >
      {data.image ? (
        <>
          <NodeResizer
            isVisible={selected && !data.readOnly}
            keepAspectRatio
            minWidth={80}
            maxWidth={600}
            onResizeEnd={(_, params) => data.resize(id, params.width)}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.image}
            alt={data.title}
            draggable={false}
            className="h-auto w-full rounded-md border-2 object-contain"
            style={{
              borderColor: selected ? data.color : "transparent",
              boxShadow,
            }}
          />
        </>
      ) : (
        <div
          className="flex items-center justify-center rounded-full border-2"
          style={{
            width: data.size,
            height: data.size,
            backgroundColor:
              data.appearance.nodeStyle === "solid"
                ? data.color
                : data.appearance.nodeStyle === "outline"
                  ? "transparent"
                  : `color-mix(in srgb, ${data.color} 16%, transparent)`,
            borderColor: data.color,
            boxShadow,
            outline: selected ? `3px solid ${data.color}55` : undefined,
          }}
        >
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: data.color }}
          />
        </div>
      )}
      {data.editing ? (
        <Input
          autoFocus
          aria-label="节点名称"
          className="nodrag nopan mt-2 w-44!"
          maxLength={500}
          onBlur={event => data.finishCreate(event.target.value)}
          onPressEnter={event => data.finishCreate(event.currentTarget.value)}
          onKeyDown={event => {
            event.stopPropagation();
            if (event.key === "Escape") data.finishCreate("");
          }}
        />
      ) : <span
        className="mt-2 max-w-44 break-words text-center text-xs leading-5"
        style={{
          color: "var(--atlas-text)",
          visibility:
            hideLabel && !selected && data.size < 58 ? "hidden" : "visible",
        }}
      >
        {data.title}
        {data.fixed ? " · 固定" : ""}
      </span>}
      {!data.readOnly && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
            style={{ background: data.color, width: 10, height: 10 }}
          />
          <Handle
            type="target"
            position={Position.Left}
            className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
            style={{ background: data.color, width: 10, height: 10 }}
          />
        </>
      )}
    </div>
  );
});
const nodeTypes = { knowledge: KnowledgeNode };
const edgeTypes = { atlas: AtlasVisualEdge };

/** 原生全屏时将编辑弹层挂到全屏元素内。 */
function popupContainer() {
  return document.fullscreenElement instanceof HTMLElement
    ? document.fullscreenElement
    : document.body;
}

/** 使用现有主页容器承载画布，不创建额外的页面滚动监听。 */
export function AtlasWorkspace() {
  return (
    <ReactFlowProvider>
      <AtlasCanvas />
    </ReactFlowProvider>
  );
}

/** 管理本地编辑、操作历史、手动保存和离开提醒。 */
function AtlasCanvas() {
  const { token } = theme.useToken();
  const { message, modal } = App.useApp();
  const router = useRouter();
  const [graph, setGraph] = useState<AtlasGraph | null>(null);
  const graphRef = useRef<AtlasGraph | null>(null);
  const [baseline, setBaseline] = useState("");
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [arranging, setArranging] = useState(false);
  const layoutWorker = useRef<Worker | null>(null);
  const savingRef = useRef(false);
  const [readOnly, setReadOnly] = useState(true);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<{
    type: "node" | "edge";
    id: string;
  } | null>(null);
  const [dragPositions, setDragPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [nodeMeasurements, setNodeMeasurements] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [canvasMode, setCanvasMode] = useState<"select" | "pan">("pan");
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set());
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState<AtlasCategory | null>(
    null,
  );
  const [newNode, setNewNode] = useState<{ node: AtlasNode; edge?: AtlasEdge } | null>(null);
  const newNodeRef = useRef<{ node: AtlasNode; edge?: AtlasEdge } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [cleanupPending, setCleanupPending] = useState(0);
  const [historyCount, setHistoryCount] = useState({ undo: 0, redo: 0 });
  const history = useRef<{ undo: AtlasGraph[]; redo: AtlasGraph[] }>({
    undo: [],
    redo: [],
  });
  const flowRef = useRef<ReactFlowInstance<FlowNode> | null>(null);
  const files = useRef(new Map<string, { file: File; uploaded?: string }>());
  const newUploads = useRef(new Set<string>());
  const imageInput = useRef<HTMLInputElement>(null);
  const insertImage = useRef<((url: string) => void) | null>(null);
  const dirty = useMemo(
    () => !!graph && JSON.stringify(graph) !== baseline,
    [graph, baseline],
  );
  const dirtyRef = useRef(false);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  const selectedNode = graph?.nodes.find(
    (node) => selection?.type === "node" && node.id === selection.id,
  );
  const selectedEdge = graph?.edges.find(
    (edge) => selection?.type === "edge" && edge.id === selection.id,
  );

  /** 同步本地状态与引用，历史最多保留一百步。 */
  const change = useCallback((next: AtlasGraph, record = true) => {
    if (record && graphRef.current) {
      history.current.undo.push(graphRef.current);
      history.current.undo = history.current.undo.slice(-100);
      history.current.redo = [];
    }
    graphRef.current = next;
    setGraph(next);
    setHistoryCount({
      undo: history.current.undo.length,
      redo: history.current.redo.length,
    });
  }, []);

  /** 撤销和重做只改变本地草稿，保存时统一提交。 */
  const travel = useCallback(
    (direction: "undo" | "redo") => {
      if (savingRef.current || !graphRef.current) return;
      const next = history.current[direction].pop();
      if (!next) return;
      history.current[direction === "undo" ? "redo" : "undo"].push(
        graphRef.current,
      );
      change(next, false);
    },
    [change],
  );

  /** 获取当前用户图谱，明确区分加载失败与首次空记录。 */
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/atlas", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setLoadError("");
      const next = data.graph ?? createExampleGraph();
      change(next, false);
      setBaseline(data.graph ? JSON.stringify(next) : "");
      setCleanupPending(data.cleanupPending);
      if (!data.graph)
        requestAnimationFrame(() =>
          flowRef.current?.fitView({ padding: 0.18 }),
        );
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "加载失败");
    }
  }, [change]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setReadOnly(media.matches);
    queueMicrotask(update);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(
    () => () => {
      for (const url of files.current.keys()) URL.revokeObjectURL(url);
    },
    [],
  );
  useEffect(() => () => layoutWorker.current?.terminate(), []);

  /** 替换上传成功后的临时地址，数据库中不保存 blob URL。 */
  const replaceImages = useCallback(
    (current: AtlasGraph, replacements: Map<string, string>): AtlasGraph => {
      const document = (doc: AtlasDocument): AtlasDocument => ({
        ...doc,
        ...(doc.attrs
          ? {
              attrs: {
                ...doc.attrs,
                ...(typeof doc.attrs.src === "string" &&
                replacements.has(doc.attrs.src)
                  ? { src: replacements.get(doc.attrs.src) }
                  : {}),
              },
            }
          : {}),
        ...(doc.content ? { content: doc.content.map(document) } : {}),
      });
      return {
        ...current,
        nodes: current.nodes.map((node) => ({
          ...node,
          image: node.image
            ? (replacements.get(node.image) ?? node.image)
            : undefined,
          body: document(node.body),
        })),
      };
    },
    [],
  );

  /** 保存前上传本地图片，成功后按服务端结果处理清理提示和撤销历史。 */
  const save = useCallback(async (): Promise<boolean> => {
    if (newNodeRef.current) {
      message.info("请先完成节点名称");
      return false;
    }
    if (
      savingRef.current ||
      layoutWorker.current ||
      !graphRef.current ||
      readOnly
    )
      return false;
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    try {
      const current = graphRef.current;
      const replacements = new Map<string, string>();
      for (const url of imageReferences(current)) {
        if (!url.startsWith("blob:")) continue;
        const asset = files.current.get(url);
        if (!asset) throw new Error("本地图片已失效，请重新添加");
        if (!asset.uploaded) {
          asset.uploaded = await uploadImageToOss(asset.file, {
            directory: "atlas",
            fileName: `${crypto.randomUUID()}.${asset.file.name.split(".").pop() || "png"}`,
          });
          newUploads.current.add(asset.uploaded);
        }
        replacements.set(url, asset.uploaded);
      }
      const next = replaceImages(
        {
          ...current,
          viewport: flowRef.current?.getViewport() ?? current.viewport,
        },
        replacements,
      );
      const response = await fetch("/api/atlas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          graph: next,
          uploadedUrls: [...newUploads.current],
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      newUploads.current.clear();
      if (result.deletedImages > 0) history.current = { undo: [], redo: [] };
      else {
        history.current.undo = history.current.undo.map((item) =>
          replaceImages(item, replacements),
        );
        history.current.redo = history.current.redo.map((item) =>
          replaceImages(item, replacements),
        );
      }
      change(next, false);
      setBaseline(JSON.stringify(next));
      setCleanupPending(result.cleanupPending);
      message[result.cleanupPending ? "warning" : "success"](
        result.cleanupPending
          ? "图谱已保存，部分图片清理失败，下次保存重试"
          : "知识星图已保存",
      );
      return true;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "保存失败");
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [change, message, readOnly, replaceImages]);

  /** 离开时允许保存、放弃或继续编辑；放弃只清理未入库的新图片。 */
  const askLeave = useCallback(
    (leave: () => void) => {
      if (savingRef.current) return;
      if (!dirtyRef.current) {
        leave();
        return;
      }
      const dialog = modal.confirm({
        getContainer: popupContainer,
        title: "有未保存的改动",
        content: "保存后离开，或放弃当前编辑。",
        footer: (
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button onClick={() => dialog.destroy()}>继续编辑</Button>
            <Button
              danger
              onClick={async () => {
                if (newUploads.current.size) {
                  const response = await fetch("/api/atlas", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ urls: [...newUploads.current] }),
                  });
                  if (!response.ok) message.warning("未保存图片清理失败");
                }
                dirtyRef.current = false;
                dialog.destroy();
                leave();
              }}
            >
              放弃改动
            </Button>
            <Button
              type="primary"
              onClick={async () => {
                if (await save()) {
                  dirtyRef.current = false;
                  dialog.destroy();
                  leave();
                }
              }}
            >
              保存并离开
            </Button>
          </div>
        ),
      });
    },
    [message, modal, save],
  );

  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const keys = (event: KeyboardEvent) => {
      if (readOnly || !(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
      if (
        event.key.toLowerCase() === "z" &&
        !(
          event.target instanceof HTMLElement &&
          event.target.closest("input,textarea,[contenteditable=true]")
        )
      ) {
        event.preventDefault();
        travel(event.shiftKey ? "redo" : "undo");
      }
    };
    const navigate = (event: Event) => {
      if (!dirtyRef.current && !savingRef.current) return;
      event.preventDefault();
      const href = (event as CustomEvent<{ href: string }>).detail.href;
      askLeave(() => router.push(href));
    };
    const links = (event: MouseEvent) => {
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.origin !== location.origin ||
        anchor.href === location.href ||
        event.ctrlKey ||
        event.metaKey ||
        event.button !== 0 ||
        !dirtyRef.current
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      askLeave(() => router.push(anchor.pathname + anchor.search));
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener("keydown", keys);
    window.addEventListener("atlas-before-navigate", navigate);
    document.addEventListener("click", links, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("keydown", keys);
      window.removeEventListener("atlas-before-navigate", navigate);
      document.removeEventListener("click", links, true);
    };
  }, [askLeave, readOnly, router, save, travel]);

  /** 更新当前节点，正文及属性始终留在草稿中。 */
  const patchNode = useCallback(
    (id: string, patch: Partial<AtlasNode>) => {
      const current = graphRef.current;
      if (!current || savingRef.current || readOnly) return;
      change({
        ...current,
        nodes: current.nodes.map((node) =>
          node.id === id ? { ...node, ...patch } : node,
        ),
      });
    },
    [change, readOnly],
  );

  /** 粘贴与拖入只创建本地预览，实际上传由保存触发。 */
  const addImage = useCallback(
    (file: File, insert?: (url: string) => void) => {
      const current = graphRef.current;
      if (!current || savingRef.current || readOnly) return;
      if (
        !file.type.startsWith("image/") ||
        !file.size ||
        file.size > 5 * 1024 * 1024
      ) {
        message.error("请选择不超过 5 MB 的图片");
        return;
      }
      if (!current.categories.length) {
        message.warning("请先创建分类");
        setCategoriesOpen(true);
        return;
      }
      const url = URL.createObjectURL(file);
      files.current.set(url, { file });
      if (insert) {
        insert(url);
        return;
      }
      const id = crypto.randomUUID();
      const position = flowRef.current?.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      }) ?? { x: 300, y: 200 };
      change({
        ...current,
        nodes: [
          ...current.nodes,
          {
            id,
            title: file.name || "图片",
            image: url,
            width: 180,
            categoryId: current.categories[0].id,
            tags: [],
            body: emptyDocument,
            description: "",
            position,
            fixed: false,
          },
        ],
      });
      setSelection({ type: "node", id });
    },
    [change, message, readOnly],
  );

  /** 新节点只在画布上显示草稿，名称提交后一次写入节点和连线。 */
  const beginCreate = (position?: { x: number; y: number }, connection?: { nodeId: string; handleType: "source" | "target" }) => {
    const current = graphRef.current;
    if (!current || readOnly || savingRef.current || newNodeRef.current) return;
    if (!current.categories.length) {
      message.warning("请先创建分类");
      setCategoriesOpen(true);
      return;
    }
    const origin = connection ? current.nodes.find(node => node.id === connection.nodeId) : undefined;
    if (connection && !origin) return;
    const id = crypto.randomUUID();
    const draft = {
      node: {
        id, title: "", categoryId: origin?.categoryId ?? current.categories[0].id,
        tags: [], body: emptyDocument, description: "", fixed: false,
        position: position ?? flowRef.current?.screenToFlowPosition({
          x: window.innerWidth / 2, y: window.innerHeight / 2,
        }) ?? { x: 200, y: 200 },
      },
      edge: connection ? {
        id: crypto.randomUUID(),
        source: connection.handleType === "source" ? connection.nodeId : id,
        target: connection.handleType === "source" ? id : connection.nodeId,
        label: "", directed: false,
      } : undefined,
    };
    newNodeRef.current = draft;
    setNewNode(draft);
    setSelectedNodeIds(new Set([id]));
    setSelectedEdgeIds(new Set());
    setSelection(null);
  };
  const finishCreate = useCallback((value: string) => {
    const draft = newNodeRef.current;
    const current = graphRef.current;
    if (!draft || !current || savingRef.current || readOnly) return;
    newNodeRef.current = null;
    setNewNode(null);
    const title = value.trim();
    if (!title || (draft.edge && !current.nodes.some(node => node.id === (draft.edge!.source === draft.node.id ? draft.edge!.target : draft.edge!.source)))) {
      setSelectedNodeIds(new Set());
      return;
    }
    if (current.nodes.some(node => node.title.toLocaleLowerCase() === title.toLocaleLowerCase()))
      message.info("已有同名节点，已继续创建");
    change({
      ...current,
      nodes: [...current.nodes, { ...draft.node, title }],
      edges: draft.edge ? [...current.edges, draft.edge] : current.edges,
    });
    setSelection({ type: "node", id: draft.node.id });
  }, [change, message, readOnly]);

  /** 原生删除同步到草稿，关联连线一并移除并支持撤销。 */
  const deleteElements = (nodes: { id: string }[], edges: { id: string }[] = []) => {
    const current = graphRef.current;
    if (!current || readOnly || savingRef.current) return;
    const nodeIds = new Set(nodes.map(node => node.id));
    const edgeIds = new Set(edges.map(edge => edge.id));
    change({
      ...current,
      nodes: current.nodes.filter(node => !nodeIds.has(node.id)),
      edges: current.edges.filter(edge => !edgeIds.has(edge.id) && !nodeIds.has(edge.source) && !nodeIds.has(edge.target)),
    });
    setSelection(null);
    setSelectedNodeIds(new Set());
    setSelectedEdgeIds(new Set());
  };
  const deleteNode = (node: AtlasNode) => deleteElements([node]);

  /** 自动布局有固定迭代上限，不持续驱动画面和 React 渲染。 */
  const arrange = () => {
    const current = graphRef.current;
    if (!current || current.nodes.length === 0) return;
    layoutWorker.current?.terminate();
    const worker = new Worker(
      new URL("./atlas-layout.worker.ts", import.meta.url),
    );
    layoutWorker.current = worker;
    setArranging(true);
    worker.onmessage = (
      event: MessageEvent<{ id: string; position: { x: number; y: number } }[]>,
    ) => {
      const positions = new Map(
        event.data.map((point) => [point.id, point.position]),
      );
      const latest = graphRef.current;
      if (latest)
        change({
          ...latest,
          nodes: latest.nodes.map((node) => ({
            ...node,
            position: node.fixed
              ? node.position
              : (positions.get(node.id) ?? node.position),
          })),
        });
      worker.terminate();
      layoutWorker.current = null;
      setArranging(false);
      requestAnimationFrame(() => {
        void flowRef.current?.fitView({ padding: 0.2 });
      });
    };
    worker.onerror = () => {
      worker.terminate();
      layoutWorker.current = null;
      setArranging(false);
      message.error("自动整理失败，原位置已保留");
    };
    worker.postMessage(current);
  };

  const result = useMemo(
    () => (graph ? searchGraph(graph, query) : null),
    [graph, query],
  );
  const appearance = useMemo(
    () => graph?.appearance ?? appearancePreset("clear"),
    [graph?.appearance],
  );
  const canvasBackground = appearance.backgroundColor ?? token.colorBgContainer;
  const canvasForeground = appearance.backgroundColor
    ? canvasTextColor(canvasBackground)
    : token.colorText;
  const topology = useMemo(() => {
    const degree = new Map<string, number>();
    const curve = new Map<string, number>();
    const pairs = new Map<string, number>();
    const categoryColors = new Map(
      graph?.categories.map((category) => [category.id, category.color]) ?? [],
    );
    const colors = new Map(
      graph?.nodes.map((node) => [
        node.id,
        categoryColors.get(node.categoryId),
      ]) ?? [],
    );
    const focus = new Set<string>();
    if (selection?.type === "node") focus.add(selection.id);
    for (const edge of graph?.edges ?? []) {
      for (const id of [edge.source, edge.target])
        degree.set(id, (degree.get(id) ?? 0) + 1);
      const pair = JSON.stringify([edge.source, edge.target].sort());
      curve.set(edge.id, pairs.get(pair) ?? 0);
      pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
      if (
        selection?.type === "node" &&
        (edge.source === selection.id || edge.target === selection.id)
      ) {
        focus.add(edge.source);
        focus.add(edge.target);
      }
    }
    return { degree, curve, focus, colors };
  }, [graph, selection]);
  const resize = useCallback(
    (id: string, width: number) => patchNode(id, { width }),
    [patchNode],
  );
  const finishMove = useCallback((moved: FlowNode[]) => {
    const current = graphRef.current;
    if (!current || savingRef.current || readOnly) return;
    const next = moveAtlasNodes(current, moved);
    if (next !== current) change(next);
    setDragPositions({});
  }, [change, readOnly]);
  const selectionChanged = useCallback(({ nodes, edges }: { nodes: FlowNode[]; edges: { id: string }[] }) => {
    setSelection(nodes.length === 1 && edges.length === 0 ? { type: "node", id: nodes[0].id } : nodes.length === 0 && edges.length === 1 ? { type: "edge", id: edges[0].id } : null);
  }, []);
  const displayedGraph = useMemo(() => graph && newNode ? {
    ...graph,
    nodes: [...graph.nodes, newNode.node],
    edges: newNode.edge ? [...graph.edges, newNode.edge] : graph.edges,
  } : graph, [graph, newNode]);
  const nodes = useMemo<FlowNode[]>(
    () =>
      displayedGraph?.nodes.map((node) => {
        const degree = topology.degree.get(node.id) ?? 0;
        const size = Math.min(76, 28 + Math.sqrt(degree) * 13);
        return {
          id: node.id,
          type: "knowledge",
          position: dragPositions[node.id] ?? node.position,
          measured: nodeMeasurements[node.id],
          selected: selectedNodeIds.has(node.id),
          hidden: node.id !== newNode?.node.id && !result?.visible.has(node.id),
          draggable: !readOnly && !saving && !node.fixed && node.id !== newNode?.node.id,
          style: node.image ? { width: node.width ?? 180 } : undefined,
          data: {
            title: node.title,
            editing: node.id === newNode?.node.id,
            finishCreate,
            image: node.image,
            color:
              graph?.categories.find(
                (category) => category.id === node.categoryId,
              )?.color ?? token.colorPrimary,
            size,
            fixed: node.fixed,
            readOnly: readOnly || saving,
            dim:
              node.id !== newNode?.node.id && (!result?.matched.has(node.id) ||
              (!!topology.focus.size && !topology.focus.has(node.id))),
            resize,
            appearance,
            glow:
              appearance.glowScope === "all" ||
              (appearance.glowScope === "selected" &&
                topology.focus.has(node.id)),
          },
        };
      }) ?? [],
    [
      dragPositions,
      nodeMeasurements,
      newNode,
      finishCreate,
      displayedGraph,
      graph,
      readOnly,
      result,
      saving,
      selectedNodeIds,
      token.colorPrimary,
      topology,
      resize,
      appearance,
    ],
  );
  const edges = useMemo(
    () =>
      (graph ? [...graph.edges, ...(newNode?.edge ? [newNode.edge] : [])] : []).map((edge) => {
        const index = topology.curve.get(edge.id) ?? 0;
        const selected = selectedEdgeIds.has(edge.id);
        const sourceColor =
          topology.colors.get(edge.source) ?? token.colorPrimary;
        const color = selected
          ? token.colorPrimary
          : (appearance.edgeColor ??
            (appearance.edgeGlow ? sourceColor : canvasForeground));
        return {
          ...edge,
          type: "atlas",
          selected,
          hidden:
            edge.id !== newNode?.edge?.id && (!result?.visible.has(edge.source) ||
            !result.visible.has(edge.target)),
          label: edge.label || undefined,
          markerEnd: edge.directed
            ? { type: MarkerType.ArrowClosed, color, width: 12, height: 12 }
            : undefined,
          pathOptions: { curvature: 0.2 + index * 0.2 },
          data: {
            glow: appearance.edgeGlow,
            strength: appearance.glowStrength,
            curvature: 0.2 + index * 0.2,
          },
          style: {
            stroke: color,
            strokeWidth: selected
              ? Math.max(2, appearance.edgeWidth)
              : appearance.edgeWidth,
            opacity:
              query &&
              !result?.matched.has(edge.source) &&
              !result?.matched.has(edge.target)
                ? 0.15
                : edge.id === newNode?.edge?.id ? 1 : appearance.edgeOpacity,
          },
          labelStyle: { fill: canvasForeground, fontSize: 10 },
          labelBgStyle: { fill: canvasBackground },
        };
      }) ?? [],
    [
      graph,
      query,
      result,
      selectedEdgeIds,
      newNode,
      token,
      topology,
      appearance,
      canvasForeground,
      canvasBackground,
    ],
  );
  const connect = (connection: Connection) => {
    if (
      !connection.source ||
      !connection.target ||
      connection.source === connection.target ||
      readOnly ||
      saving
    )
      return;
    const edge = {
      id: crypto.randomUUID(),
      source: connection.source,
      target: connection.target,
      label: "",
      directed: false,
    };
    const current = graphRef.current;
    if (!current || savingRef.current) return;
    if (duplicateEdge(current.edges, edge)) {
      message.info("已存在相同关系");
      return;
    }
    change({ ...current, edges: [...current.edges, edge] });
  };
  /** 关系详情直接更新草稿，拒绝语义重复且不为未变化的值创建撤销记录。 */
  const patchEdge = (id: string, patch: Partial<Pick<AtlasEdge, "label" | "directed">>) => {
    const current = graphRef.current;
    if (!current || readOnly || savingRef.current) return false;
    const edge = current.edges.find(item => item.id === id);
    if (!edge) return false;
    const next = { ...edge, ...patch, label: (patch.label ?? edge.label).trim() };
    if (next.label === edge.label && next.directed === edge.directed) return true;
    if (duplicateEdge(current.edges, next)) {
      message.warning("已存在相同关系");
      return false;
    }
    change({ ...current, edges: current.edges.map(item => item.id === id ? next : item) });
    return true;
  };

  /** 名称提交后才创建分类，空草稿失焦直接丢弃。 */
  const commitCategory = () => {
    const current = graphRef.current;
    if (!current || !categoryDraft || savingRef.current) return;
    try {
      const next = addAtlasCategory(current, categoryDraft);
      if (next !== current) change(next);
      setCategoryDraft(null);
    } catch (error) { message.warning(error instanceof Error ? error.message : "新增分类失败"); }
  };
  const rootStyle = {
    "--atlas-text": canvasForeground,
    "--atlas-bg": token.colorBgContainer,
    "--xy-controls-button-background-color": token.colorBgElevated,
    "--xy-controls-button-background-color-hover": token.colorFillSecondary,
    "--xy-controls-button-color": token.colorText,
    "--xy-controls-button-color-hover": token.colorText,
    "--xy-controls-button-border-color": "var(--home-preview-divider-color)",
    color: token.colorText,
    backgroundColor: token.colorBgContainer,
  } as CSSProperties;

  if (loadError)
    return (
      <div className="w-full p-4">
        <Alert
          type="error"
          title={loadError}
          action={<Button onClick={() => void load()}>重试</Button>}
        />
      </div>
    );
  if (!graph)
    return (
      <div className="flex min-h-96 w-full items-center justify-center">
        <Spin />
      </div>
    );
  return (
    <section
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md max-md:min-h-150"
      style={rootStyle}
      onDoubleClick={(event) => {
        if (
          event.target instanceof Element &&
          event.target.classList.contains("react-flow__pane") &&
          !readOnly &&
          !saving
        )
          beginCreate();
      }}
      onPaste={(event) => {
        if (
          readOnly ||
          saving ||
          (event.target instanceof HTMLElement &&
            event.target.closest("input,textarea"))
        )
          return;
        const image = [...event.clipboardData.items]
          .find((item) => item.type.startsWith("image/"))
          ?.getAsFile();
        if (image) {
          event.preventDefault();
          if (
            event.target instanceof HTMLElement &&
            event.target.closest("[contenteditable=true]")
          )
            return;
          addImage(image);
        }
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDrop={(event) => {
        if (event.dataTransfer.files.length) {
          event.preventDefault();
          [...event.dataTransfer.files].forEach((file) => addImage(file));
        }
      }}
    >
      <header className="home-preview-divider flex shrink-0 flex-wrap items-center gap-x-3 gap-y-3 border-b px-4 py-3">
        <div className="mr-auto flex shrink-0 items-center gap-3">
          <span className="iconfont icon-atlas text-xl" />
          <h1 className="text-base font-semibold">知识星图</h1>
          <HomeContentFullscreenButton />
        </div>
        <Input
          className="w-52! shrink-0 max-md:order-last max-md:w-full!"
          prefix={<SearchOutlined />}
          placeholder="搜索知识"
          aria-label="搜索知识"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <Segmented disabled={saving} value={canvasMode} onChange={mode => setCanvasMode(mode as "select" | "pan")} options={[
              { value: "select", icon: <Tooltip title="选择 / 框选"><SelectOutlined aria-label="选择模式" /></Tooltip> },
              { value: "pan", icon: <Tooltip title="平移画布"><DragOutlined aria-label="平移模式" /></Tooltip> },
            ]} />
            <Tooltip title="新建节点">
              <Button
                aria-label="新建节点"
                icon={<PlusOutlined />}
                disabled={saving}
                onClick={() => beginCreate()}
              />
            </Tooltip>
            <Tooltip title="上传图片">
              <Button
                aria-label="上传图片"
                icon={<PictureOutlined />}
                disabled={saving}
                onClick={() => {
                  insertImage.current = null;
                  imageInput.current?.click();
                }}
              />
            </Tooltip>
            <Tooltip title="自动整理">
              <Button
                aria-label="自动整理"
                icon={<ApartmentOutlined />}
                disabled={saving || arranging}
                loading={arranging}
                onClick={arrange}
              />
            </Tooltip>
            <Tooltip title="撤销">
              <Button
                aria-label="撤销"
                icon={<UndoOutlined />}
                disabled={!historyCount.undo || saving}
                onClick={() => travel("undo")}
              />
            </Tooltip>
            <Tooltip title="重做">
              <Button
                aria-label="重做"
                icon={<RedoOutlined />}
                disabled={!historyCount.redo || saving}
                onClick={() => travel("redo")}
              />
            </Tooltip>
            <Tooltip title="分类设置">
              <Button
                aria-label="分类设置"
                icon={<SettingOutlined />}
                disabled={saving}
                onClick={() => setCategoriesOpen(true)}
              />
            </Tooltip>
            <Tooltip title="视觉设置">
              <Button
                aria-label="视觉设置"
                icon={<BgColorsOutlined />}
                disabled={saving}
                onClick={() => setAppearanceOpen((open) => !open)}
              />
            </Tooltip>
            <span
              className="min-w-12 whitespace-nowrap px-1 text-center text-xs"
              style={{ color: token.colorTextSecondary }}
            >
              {saving ? "保存中" : dirty ? "未保存" : "已保存"}
            </span>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={() => void save()}
            >
              保存
            </Button>
          </div>
        )}
      </header>
      {saveError && (
        <Alert
          type="error"
          title={saveError}
          closable
          onClose={() => setSaveError("")}
        />
      )}
      {!!cleanupPending && (
        <Alert
          type="warning"
          title={`${cleanupPending} 张图片等待下次保存重试清理`}
        />
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className="relative min-h-0 min-w-0 flex-1"
          style={{ backgroundColor: canvasBackground }}
        >
          <ReactFlow<FlowNode>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView={baseline === ""}
            minZoom={0.1}
            maxZoom={2}
            onlyRenderVisibleElements
            deleteKeyCode={readOnly || saving ? null : ["Delete", "Backspace"]}
            onBeforeDelete={() => Promise.resolve(!readOnly && !savingRef.current && !newNodeRef.current)}
            onDelete={({ nodes, edges }) => deleteElements(nodes, edges)}
            nodesConnectable={!readOnly && !saving}
            nodesDraggable={!readOnly && !saving}
            selectionOnDrag={!readOnly && !saving && canvasMode === "select"}
            selectionMode={SelectionMode.Partial}
            panOnDrag={readOnly || canvasMode === "pan" ? true : [1, 2]}
            onSelectionChange={selectionChanged}
            onSelectionDragStop={(_, moved) => finishMove(moved)}
            onNodesChange={(changes) => {
              const dimensions = changes.filter(item => item.type === "dimensions" && item.dimensions);
              if (dimensions.length) setNodeMeasurements(previous => {
                let next = previous;
                for (const item of dimensions) {
                  if (item.type !== "dimensions" || !item.dimensions) continue;
                  const measured = previous[item.id];
                  if (measured?.width === item.dimensions.width && measured?.height === item.dimensions.height) continue;
                  if (next === previous) next = { ...previous };
                  next[item.id] = item.dimensions;
                }
                return next;
              });
              const selections = changes.filter(item => item.type === "select");
              if (selections.length) setSelectedNodeIds(previous => {
                const next = new Set(previous);
                for (const item of selections) if (item.type === "select") { if (item.selected) next.add(item.id); else next.delete(item.id); }
                return next;
              });
              const positions = changes.filter(
                (item) => item.type === "position" && item.position,
              );
              if (positions.length)
                setDragPositions((previous) => {
                  const next = { ...previous };
                  for (const item of positions)
                    if (item.type === "position" && item.position)
                      next[item.id] = item.position;
                  return next;
                });
            }}
            onEdgesChange={changes => {
              const selections = changes.filter(item => item.type === "select");
              if (selections.length) setSelectedEdgeIds(previous => {
                const next = new Set(previous);
                for (const item of selections) if (item.type === "select") { if (item.selected) next.add(item.id); else next.delete(item.id); }
                return next;
              });
            }}
            onInit={(instance) => {
              flowRef.current = instance;
            }}
            onNodeClick={(_, node) =>
              setSelection({ type: "node", id: node.id })
            }
            onEdgeClick={(_, edge) =>
              setSelection({ type: "edge", id: edge.id })
            }
            onPaneClick={() => setSelection(null)}
            onNodeDoubleClick={(_, node) => {
              const asset = graph.nodes.find(
                (item) => item.id === node.id,
              )?.image;
              if (asset) setPreviewImage(asset);
            }}
            onConnect={connect}
            onConnectEnd={(event, connection) => {
              if (readOnly || savingRef.current || connection.isValid || connection.toNode || !connection.fromNode || !connection.fromHandle) return;
              if (!(event.target instanceof Element) || !event.target.classList.contains("react-flow__pane")) return;
              const point = "changedTouches" in event ? event.changedTouches[0] : event;
              if (!point || !flowRef.current) return;
              beginCreate(flowRef.current.screenToFlowPosition({ x: point.clientX, y: point.clientY }), {
                nodeId: connection.fromNode.id,
                handleType: connection.fromHandle.type,
              });
            }}
            onNodeDragStop={(_, dragged, moved) => finishMove(moved.length ? moved : [dragged])}
            onMoveEnd={(_, viewport: Viewport) => {
              if (!readOnly && !savingRef.current && graphRef.current)
                change({ ...graphRef.current, viewport }, false);
            }}
            defaultViewport={graph.viewport}
          >
            <AtlasBackground appearance={appearance} color={canvasForeground} />
            <Controls
              showInteractive={false}
              orientation="horizontal"
              className="home-preview-soft-panel m-4! overflow-hidden rounded-md border shadow-sm! [&_button]:size-8! [&_button]:border-[color:var(--home-preview-divider-color)]!"
            />
          </ReactFlow>
          {!graph.nodes.length && !newNode && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Empty description="暂无知识" />
            </div>
          )}
          <div
            className="pointer-events-none absolute bottom-4 right-4 flex max-w-[60%] flex-wrap justify-end gap-x-4 gap-y-2 text-xs"
            style={{ color: canvasForeground }}
          >
            {graph.categories.map((category) => (
              <span key={category.id} className="flex items-center gap-1">
                <span
                  className="size-2 rounded-full"
                  style={{ background: category.color }}
                />
                {category.name}
              </span>
            ))}
          </div>
          {!!query && (
            <div className="absolute left-4 top-4 rounded bg-[var(--atlas-bg)] px-3 py-2 text-xs tabular-nums">
              {result?.matched.size ?? 0} 个匹配
            </div>
          )}
        </div>
        <AtlasInspector
          graph={graph}
          readOnly={readOnly}
          saving={saving}
          selection={appearanceOpen ? null : selection}
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          patchNode={patchNode}
          setSelection={value => { setSelection(value); setSelectedNodeIds(new Set(value?.type === "node" ? [value.id] : [])); setSelectedEdgeIds(new Set(value?.type === "edge" ? [value.id] : [])); }}
          patchEdge={patchEdge}
          change={change}
          deleteNode={deleteNode}
          addImage={addImage}
          chooseImage={(insert) => {
            insertImage.current = insert;
            imageInput.current?.click();
          }}
          focus={(id) => {
            void flowRef.current?.fitView({ nodes: [{ id }], maxZoom: 1 });
          }}
        />
        {appearanceOpen && !readOnly && (
          <AtlasAppearancePanel
            value={appearance}
            disabled={saving}
            onClose={() => setAppearanceOpen(false)}
            onChange={(value, record = true) => {
              if (graphRef.current && !savingRef.current)
                change({ ...graphRef.current, appearance: value }, record);
            }}
          />
        )}
      </div>
      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) addImage(file, insertImage.current ?? undefined);
          event.target.value = "";
          insertImage.current = null;
        }}
      />
      <Drawer
        title="分类设置"
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        size={340}
        getContainer={() =>
          (document.fullscreenElement as HTMLElement) ?? document.body
        }
      >
        <div className="flex flex-col gap-3">
          {graph.categories.map((category) => (
            <div key={category.id} className="flex min-h-10 items-center gap-2">
              <ColorPicker
                value={opaqueAtlasColor(category.color)}
                disabledAlpha
                disabled={saving}
                getPopupContainer={popupContainer}
                onChangeComplete={color => {
                  if (graphRef.current && !savingRef.current) change(updateAtlasCategory(graphRef.current, category.id, { color: color.toHexString() }));
                }}
              >
                <Button type="text" disabled={saving} aria-label={`选择${category.name}颜色`} className="size-8! shrink-0 p-0!">
                  <span className="size-3 rounded-full" style={{ backgroundColor: category.color }} />
                </Button>
              </ColorPicker>
              <Typography.Text
                className="start-0! top-0! m-0! min-w-0 flex-1 cursor-text truncate"
                editable={saving ? false : {
                  triggerType: ["text"],
                  maxLength: 100,
                  autoSize: { minRows: 1, maxRows: 1 },
                  onChange: name => {
                    if (!graphRef.current || savingRef.current) return;
                    try { change(updateAtlasCategory(graphRef.current, category.id, { name })); }
                    catch (error) { message.warning(error instanceof Error ? error.message : "重命名失败"); }
                  },
                }}
              >{category.name}</Typography.Text>
              <Button
                aria-label={`删除${category.name}`}
                danger
                icon={<DeleteOutlined />}
                onClick={() =>
                  modal.confirm({
                    getContainer: popupContainer,
                    title: `删除分类“${category.name}”？`,
                    content: `删除其中 ${graph.nodes.filter((node) => node.categoryId === category.id).length} 个节点及所有关联连线。`,
                    okText: "删除",
                    okButtonProps: { danger: true },
                    onOk: () => {
                      const current = graphRef.current!;
                      const ids = new Set(
                        current.nodes
                          .filter((node) => node.categoryId === category.id)
                          .map((node) => node.id),
                      );
                      change({
                        ...current,
                        categories: current.categories.filter(
                          (item) => item.id !== category.id,
                        ),
                        nodes: current.nodes.filter(
                          (node) => !ids.has(node.id),
                        ),
                        edges: current.edges.filter(
                          (edge) =>
                            !ids.has(edge.source) && !ids.has(edge.target),
                        ),
                      });
                      setSelection(null);
                    },
                  })
                }
              />
            </div>
          ))}
          {categoryDraft && (
            <div className="flex min-h-10 items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center"><span className="size-3 rounded-full" style={{ backgroundColor: categoryDraft.color }} /></span>
              <Input
                autoFocus
                disabled={saving}
                aria-label="新增分类名称"
                placeholder="分类名称"
                maxLength={100}
                value={categoryDraft.name}
                onChange={event => setCategoryDraft({ ...categoryDraft, name: event.target.value })}
                onPressEnter={commitCategory}
                onBlur={commitCategory}
                onKeyDown={event => { if (event.key === "Escape") setCategoryDraft(null); }}
              />
            </div>
          )}
          <Button
            icon={<PlusOutlined />}
            disabled={saving || !!categoryDraft}
            onClick={() =>
              setCategoryDraft({
                id: crypto.randomUUID(),
                name: "",
                color: randomAtlasColor(),
              })
            }
          >
            新增分类
          </Button>
        </div>
      </Drawer>
      <Image.PreviewGroup
        preview={{
          open: !!previewImage,
          onOpenChange: (open) => {
            if (!open) setPreviewImage(null);
          },
          getContainer: () =>
            (document.fullscreenElement as HTMLElement) ?? document.body,
        }}
        items={previewImage ? [previewImage] : []}
      />
      <Drawer
        title={selectedNode?.title ?? "知识详情"}
        open={readOnly && !!selectedNode}
        onClose={() => setSelection(null)}
        placement="bottom"
        size="75%"
      >
        <div className="flex flex-col gap-3">
          {selectedNode?.image && (
            <Image src={selectedNode.image} alt={selectedNode.title} />
          )}
          {selectedNode && (
            <AtlasEditor
              value={selectedNode.body}
              onChange={() => {}}
              readOnly
              onImage={() => {}}
            />
          )}
        </div>
      </Drawer>
    </section>
  );
}
