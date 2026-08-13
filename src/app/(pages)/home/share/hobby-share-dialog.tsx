"use client";

import type { HobbyShareExpiry } from "@/app/api/share/hobby/share-types";
import { OverlayScrollArea } from "@/app/(pages)/common/overlay-scrollbar";
import {
  CopyOutlined,
  DeleteOutlined,
  ExportOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { Alert, App, Button, Form, Input, Modal, Select, Spin, Tooltip } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";

/** 爱好分享弹窗接收的属性。 */
type HobbyShareDialogProps = {
  /** 弹窗 portal 的主题内挂载容器。 */
  getContainer: HTMLElement;
  /** 关闭弹窗。 */
  onClose: () => void;
  /** 是否展示弹窗。 */
  open: boolean;
};

/** 创建爱好分享接口的成功响应。 */
type HobbyShareCreateResponse = {
  expiresAt: string | null;
  token: string;
  url: string;
};

/** 已创建爱好分享链接的展示摘要。 */
type HobbyShareListItem = {
  createdAt: string;
  expiresAt: string | null;
  hasPassword: boolean;
  token: string;
  url: string;
};

type HobbyShareListResponse = {
  message?: string;
  shares?: HobbyShareListItem[];
};

const expiryOptions = [
  { label: "1 天", value: "day" },
  { label: "1 周", value: "week" },
  { label: "1 月", value: "month" },
  { label: "永不失效", value: "forever" },
] satisfies { label: string; value: HobbyShareExpiry }[];

function formatShareDate(value: string | null) {
  if (!value) {
    return "永久有效";
  }

  return new Date(value).toLocaleString();
}

/** 创建并展示爱好分享链接。 */
export function HobbyShareDialog({
  getContainer,
  onClose,
  open,
}: HobbyShareDialogProps) {
  const { message } = App.useApp();
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const listAbortControllerRef = useRef<AbortController | null>(null);
  const listRequestIdRef = useRef(0);
  const [expiry, setExpiry] = useState<HobbyShareExpiry>("week");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<HobbyShareCreateResponse | null>(null);
  const [shares, setShares] = useState<HobbyShareListItem[]>([]);
  const [shareListError, setShareListError] = useState<string | null>(null);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [deletingToken, setDeletingToken] = useState<string | null>(null);

  /** 终止当前请求并让其后续响应失去写入状态的资格。 */
  function invalidateCreateRequest() {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }

  const invalidateListRequest = useCallback(() => {
    listRequestIdRef.current += 1;
    listAbortControllerRef.current?.abort();
    listAbortControllerRef.current = null;
  }, []);

  const loadExistingShares = useCallback(async () => {
    const requestId = listRequestIdRef.current + 1;
    listRequestIdRef.current = requestId;
    listAbortControllerRef.current?.abort();
    const controller = new AbortController();
    listAbortControllerRef.current = controller;
    setShareListError(null);
    setIsLoadingShares(true);

    try {
      const response = await fetch("/api/share/hobby", {
        method: "GET",
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => null)) as
        | HobbyShareListResponse
        | null;

      if (requestId !== listRequestIdRef.current) {
        return;
      }

      if (!response.ok || !payload || !Array.isArray(payload.shares)) {
        setShareListError(payload?.message ?? "读取分享链接失败");
        setShares([]);
        return;
      }

      setShares(payload.shares);
    } catch (reason) {
      if (
        requestId !== listRequestIdRef.current ||
        reason instanceof DOMException && reason.name === "AbortError"
      ) {
        return;
      }

      setShareListError("网络异常，暂时无法读取分享链接");
      setShares([]);
    } finally {
      if (requestId === listRequestIdRef.current) {
        listAbortControllerRef.current = null;
        setIsLoadingShares(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadExistingShares();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      invalidateListRequest();
    };
  }, [invalidateListRequest, loadExistingShares, open]);

  /** 在弹窗离场后恢复下一次创建所需的默认配置。 */
  function resetDialog() {
    invalidateCreateRequest();
    invalidateListRequest();
    setExpiry("week");
    setPassword("");
    setError(null);
    setIsCreating(false);
    setResult(null);
    setShares([]);
    setShareListError(null);
    setIsLoadingShares(false);
    setDeletingToken(null);
  }

  /** 立即取消在途创建请求并关闭弹窗。 */
  function closeDialog() {
    invalidateCreateRequest();
    invalidateListRequest();
    onClose();
  }

  /** 请求接口创建爱好分享，并保留失败时的表单配置。 */
  async function createShare() {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setError(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/share/hobby", {
        body: JSON.stringify({ expiry, password }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => null)) as
        | HobbyShareCreateResponse
        | { message?: string }
        | null;

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!response.ok || !payload || !("url" in payload)) {
        setError(
          payload && "message" in payload && payload.message
            ? payload.message
            : "生成分享链接失败，请稍后重试",
        );
        return;
      }

      setResult(payload);
      void loadExistingShares();
    } catch {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setError("网络异常，暂时无法生成分享链接");
    } finally {
      if (requestId === requestIdRef.current) {
        abortControllerRef.current = null;
        setIsCreating(false);
      }
    }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      message.success("分享链接已复制");
    } catch {
      message.error("复制失败，请手动复制链接");
    }
  }

  /** 将生成的爱好分享链接复制到剪贴板。 */
  async function copyShareUrl() {
    if (result) {
      await copyUrl(result.url);
    }
  }

  function previewShareUrl(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  /** 在新窗口打开公开分享地址。 */
  function previewShare() {
    if (result) {
      previewShareUrl(result.url);
    }
  }

  async function deleteShare(token: string) {
    setDeletingToken(token);
    setShareListError(null);

    try {
      const response = await fetch(
        `/api/share/hobby/${encodeURIComponent(token)}`,
        { method: "DELETE" },
      );
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        setShareListError(payload?.message ?? "删除分享链接失败");
        return;
      }

      setShares((current) =>
        current.filter((share) => share.token !== token),
      );
      if (result?.token === token) {
        setResult(null);
      }
      message.success("分享链接已删除");
    } catch {
      setShareListError("网络异常，暂时无法删除分享链接");
    } finally {
      setDeletingToken(null);
    }
  }

  const expiresDescription = result?.expiresAt
    ? `到期时间：${new Date(result.expiresAt).toLocaleString()}`
    : "到期说明：永久有效";
  const shouldShowShareList =
    isLoadingShares || Boolean(shareListError) || shares.length > 0;

  return (
    <Modal
      afterClose={resetDialog}
      className="hobby-share-dialog"
      footer={null}
      getContainer={getContainer}
      onCancel={closeDialog}
      open={open}
      title="分享爱好页面"
    >
      {result ? (
        <Form className="hobby-share-result" layout="vertical">
          <Form.Item label="分享链接">
            <Input aria-label="分享链接" readOnly value={result.url} />
          </Form.Item>
          <p className="hobby-share-expiry">{expiresDescription}</p>
          <div className="hobby-share-actions">
            <Tooltip title="复制链接">
              <Button
                aria-label="复制链接"
                icon={<CopyOutlined />}
                onClick={copyShareUrl}
              />
            </Tooltip>
            <Tooltip title="新窗口预览">
              <Button
                aria-label="新窗口预览"
                icon={<ExportOutlined />}
                onClick={previewShare}
              />
            </Tooltip>
            <Button onClick={closeDialog} type="primary">
              完成
            </Button>
          </div>
        </Form>
      ) : (
        <Form layout="vertical">
          <Form.Item label="分享内容">
            <Input aria-label="分享内容" readOnly value="爱好" />
          </Form.Item>
          <Form.Item label="有效期">
            <Select
              aria-label="分享有效期"
              onChange={setExpiry}
              options={expiryOptions}
              value={expiry}
            />
          </Form.Item>
          <Form.Item label="访问密码（可选）">
            <Input.Password
              aria-label="访问密码（可选）"
              maxLength={64}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="最多 64 个字符"
              value={password}
            />
          </Form.Item>
          {error ? <Alert message={error} showIcon type="error" /> : null}
          <div className="hobby-share-actions">
            <Button onClick={closeDialog}>取消</Button>
            <Button loading={isCreating} onClick={createShare} type="primary">
              生成链接
            </Button>
          </div>
        </Form>
      )}

      {shouldShowShareList ? (
        <section className="hobby-share-existing" aria-live="polite">
          <div className="hobby-share-existing-header">
            <span>已创建的链接</span>
            <span>{isLoadingShares ? "读取中" : `${shares.length} 条`}</span>
          </div>
          {shareListError ? (
            <Alert message={shareListError} showIcon type="error" />
          ) : null}
          {isLoadingShares ? (
            <div className="hobby-share-existing-state">
              <Spin size="small" />
              <span>正在读取分享链接</span>
            </div>
          ) : null}
          {shares.length > 0 ? (
            <OverlayScrollArea
              className="hobby-share-existing-list"
              viewportClassName="grid max-h-[220px] gap-2 overflow-y-auto pr-0.5"
            >
              {shares.map((share) => (
                <div className="hobby-share-existing-item" key={share.token}>
                  <div className="hobby-share-existing-info">
                    <span className="hobby-share-existing-token">
                      {share.token}
                    </span>
                    <span className="hobby-share-existing-meta">
                      创建：{formatShareDate(share.createdAt)} · 到期：
                      {formatShareDate(share.expiresAt)}
                      {share.hasPassword ? (
                        <Tooltip title="已设置访问密码">
                          <LockOutlined />
                        </Tooltip>
                      ) : null}
                    </span>
                  </div>
                  <div className="hobby-share-existing-actions">
                    <Tooltip title="复制链接">
                      <Button
                        aria-label="复制链接"
                        icon={<CopyOutlined />}
                        onClick={() => copyUrl(share.url)}
                      />
                    </Tooltip>
                    <Tooltip title="新窗口预览">
                      <Button
                        aria-label="新窗口预览"
                        icon={<ExportOutlined />}
                        onClick={() => previewShareUrl(share.url)}
                      />
                    </Tooltip>
                    <Tooltip title="删除链接">
                      <Button
                        aria-label="删除链接"
                        danger
                        icon={<DeleteOutlined />}
                        loading={deletingToken === share.token}
                        onClick={() => deleteShare(share.token)}
                      />
                    </Tooltip>
                  </div>
                </div>
              ))}
            </OverlayScrollArea>
          ) : null}
        </section>
      ) : null}
    </Modal>
  );
}
