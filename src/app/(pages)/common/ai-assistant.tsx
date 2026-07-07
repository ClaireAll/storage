"use client";

import { CategoryIcon } from "@/app/(pages)/common/category-icon";
import {
  CloseOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
} from "@ant-design/icons";
import { Button, Input, Spin, Typography } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = {
  content: string;
  images?: string[];
  role: "assistant" | "user";
};

const initialMessages: ChatMessage[] = [
  {
    content:
      "你好，我是 DeepSeek 助手。我可以帮你查询衣服、图书、爱好、化妆品、护肤品等库存列表，也可以调用万相生成搭配效果图。",
    role: "assistant",
  },
];
const assistantCapabilities = [
  {
    label: "查看图书列表",
    prompt: "请获取我的图书列表，并按名称、分类和价格整理。",
  },
  {
    label: "查看护肤品列表",
    prompt: "请获取我的护肤品列表，并按名称、数量和价格整理。",
  },
  {
    label: "查看化妆品列表",
    prompt: "请获取我的化妆品列表，并按名称、数量和价格整理。",
  },
  {
    label: "生成搭配效果图",
    prompt:
      "请从我的衣服和裤子库存里选择一套适合日常出门的搭配，并调用万相生成一张搭配效果图。",
  },
];

const themeVariableGroups = [
  {
    sources: ["--home-theme-color", "--theme-page-color", "--app-texture-color"],
    target: "--ai-assistant-theme-color",
  },
  {
    sources: ["--home-theme-bg", "--theme-page-bg", "--app-shell-bg"],
    target: "--ai-assistant-theme-bg",
  },
  {
    sources: ["--home-theme-text", "--theme-page-text", "--app-texture-text"],
    target: "--ai-assistant-theme-text",
  },
] as const;

export function AiAssistant() {
  const assistantRootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const canSend = Boolean(draft.trim()) && !isSending;
  const conversation = useMemo(
    () => messages.filter((message) => message.content.trim()),
    [messages],
  );

  useEffect(() => {
    function syncThemeVariables() {
      const root = assistantRootRef.current;
      const shell = document.querySelector(".app-shell");

      if (!root || !shell) {
        return;
      }

      const shellStyles = getComputedStyle(shell);

      themeVariableGroups.forEach(({ sources, target }) => {
        const value = sources
          .map((sourceVariable) =>
            shellStyles.getPropertyValue(sourceVariable).trim(),
          )
          .find(Boolean);

        if (value) {
          root.style.setProperty(target, value);
        }
      });
    }

    syncThemeVariables();

    const observer = new MutationObserver(syncThemeVariables);
    observer.observe(document.body, {
      attributeFilter: ["class", "style"],
      attributes: true,
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  function openChat() {
    setIsOpen(true);
  }

  function closeChat() {
    setIsOpen(false);
    setIsExpanded(false);
  }

  function togglePanelExpanded() {
    setIsExpanded((currentValue) => !currentValue);
  }

  async function sendMessage() {
    const content = draft.trim();

    if (!content || isSending) {
      return;
    }

    const nextMessages = [...conversation, { content, role: "user" as const }];

    setMessages(nextMessages);
    setDraft("");
    setError("");
    setIsSending(true);

    try {
      const response = await fetch("/api/ai/chat", {
        body: JSON.stringify({ messages: nextMessages }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as {
        images?: string[];
        message?: string;
        reply?: string;
      };

      if (!response.ok) {
        throw new Error(result.message ?? "AI 请求失败");
      }

      setMessages([
        ...nextMessages,
        {
          content: result.reply?.trim() || "我暂时没有生成可用回复。",
          images: result.images?.filter((image) => /^https?:\/\//i.test(image)),
          role: "assistant",
        },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "AI 请求失败",
      );
      setMessages(nextMessages);
    } finally {
      setIsSending(false);
    }
  }

  function handleDraftKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <div
      className={
        isOpen && isExpanded
          ? "ai-assistant-root ai-assistant-root-expanded"
          : "ai-assistant-root"
      }
      ref={assistantRootRef}
    >
      {isOpen ? (
        <section
          aria-label="DeepSeek 助手"
          className={
            isExpanded
              ? "ai-assistant-panel ai-assistant-panel-expanded"
              : "ai-assistant-panel"
          }
          role="dialog"
        >
          <div className="ai-assistant-panel-header">
            <Typography.Text className="ai-assistant-title" strong>
              DeepSeek 助手
            </Typography.Text>
            <div className="ai-assistant-header-actions">
              <Button
                aria-label={
                  isExpanded
                    ? "收起 DeepSeek AI 助手"
                    : "展开 DeepSeek AI 助手"
                }
                className="ai-assistant-expand"
                icon={
                  isExpanded ? (
                    <FullscreenExitOutlined />
                  ) : (
                    <FullscreenOutlined />
                  )
                }
                onClick={togglePanelExpanded}
                size="small"
                type="text"
              />
              <Button
                aria-label="关闭 DeepSeek AI 助手"
                className="ai-assistant-close"
                icon={<CloseOutlined />}
                onClick={closeChat}
                size="small"
                type="text"
              />
            </div>
          </div>
          <div className="ai-assistant-dialog">
            <div className="ai-assistant-messages" role="log">
              {messages.map((message, index) => (
                <div
                  className={
                    message.role === "user"
                      ? "ai-assistant-message ai-assistant-message-user"
                      : "ai-assistant-message ai-assistant-message-assistant"
                  }
                  key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
                >
                  <Typography.Text>{message.content}</Typography.Text>
                  {message.images?.length ? (
                    <div className="ai-assistant-generated-images">
                      {message.images.map((image) => (
                        <a
                          href={image}
                          key={image}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt="搭配效果图"
                            className="ai-assistant-generated-image"
                            src={image}
                          />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
              {isSending ? (
                <div className="ai-assistant-message ai-assistant-message-assistant">
                  <Spin size="small" />
                </div>
              ) : null}
            </div>
            {error ? (
              <Typography.Text className="ai-assistant-error" type="danger">
                {error}
              </Typography.Text>
            ) : null}
            <div className="ai-assistant-capabilities">
              {assistantCapabilities.map((capability) => (
                <Button
                  className="ai-assistant-capability"
                  key={capability.label}
                  onClick={() => setDraft(capability.prompt)}
                  size="small"
                  type="default"
                >
                  {capability.label}
                </Button>
              ))}
            </div>
            <div className="ai-assistant-input-row">
              <Input.TextArea
                autoSize={{ maxRows: 4, minRows: 2 }}
                className="ai-assistant-textarea"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleDraftKeyDown}
                placeholder="输入问题，Enter 发送，Shift+Enter 换行"
                value={draft}
              />
              <Button
                className="ai-assistant-send"
                disabled={!canSend}
                loading={isSending}
                onClick={sendMessage}
                type="primary"
              >
                发送
              </Button>
            </div>
          </div>
        </section>
      ) : null}
      <Button
        aria-expanded={isOpen}
        aria-label="打开 DeepSeek AI 助手"
        className={
          isOpen && isExpanded
            ? "ai-assistant-fab ai-assistant-fab-hidden"
            : "ai-assistant-fab"
        }
        icon={
          <CategoryIcon
            className="ai-assistant-fab-icon"
            iconClassName="ai-assistant-fab-symbol"
            mode="font"
            name="icon-deepseek"
          />
        }
        onClick={openChat}
        shape="circle"
        size="large"
        type="primary"
      />
    </div>
  );
}
