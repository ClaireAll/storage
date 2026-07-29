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
  items?: AssistantItem[];
  role: "assistant" | "user";
  sections?: AssistantSection[];
  suggestions?: string[];
};

type AssistantSection = {
  content: string;
  title: string;
};

type AssistantItem = {
  category: string;
  categoryLabel: string;
  id: string;
  imageUrl?: string;
  name: string;
  price?: number;
  subtitle?: string;
  url?: string;
};

const initialMessages: ChatMessage[] = [
  {
    content:
      "你好，我是 DeepSeek 库存助手。我可以查询、汇总和推荐你的库存内容；需要效果图时，也可以显式调用万相生成搭配图。",
    role: "assistant",
  },
];
const assistantCapabilities = [
  {
    label: "缺图物品",
    prompt: "找出所有缺少图片的物品。",
  },
  {
    label: "低库存护肤",
    prompt: "护肤品里哪些数量小于 2？",
  },
  {
    label: "夏季衣服",
    prompt: "我有哪些夏天能穿的衣服？",
  },
  {
    label: "日常搭配",
    prompt:
      "帮我从衣服和裤子里推荐一套日常搭配，先不要生成图片。",
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
        items?: AssistantItem[];
        message?: string;
        reply?: string;
        sections?: AssistantSection[];
        suggestions?: string[];
      };

      if (!response.ok) {
        throw new Error(result.message ?? "AI 请求失败");
      }

      setMessages([
        ...nextMessages,
        {
          content: result.reply?.trim() || "我暂时没有生成可用回复。",
          images: result.images?.filter((image) => /^https?:\/\//i.test(image)),
          items: result.items,
          role: "assistant",
          sections: result.sections,
          suggestions: result.suggestions,
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

  function applySuggestion(suggestion: string) {
    setDraft(suggestion);
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
                  {message.sections?.length ? (
                    <div className="ai-assistant-sections">
                      {message.sections.map((section) => (
                        <div
                          className="ai-assistant-section"
                          key={`${section.title}-${section.content.slice(0, 12)}`}
                        >
                          <Typography.Text strong>
                            {section.title}
                          </Typography.Text>
                          <Typography.Text>{section.content}</Typography.Text>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {message.items?.length ? (
                    <div className="ai-assistant-items">
                      {message.items.map((item) => (
                        <a
                          className="ai-assistant-item"
                          href={item.url}
                          key={`${item.category}-${item.id}-${item.name}`}
                          rel="noreferrer"
                          target={item.url ? "_blank" : undefined}
                        >
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              alt={item.name}
                              className="ai-assistant-item-image"
                              src={item.imageUrl}
                            />
                          ) : (
                            <span className="ai-assistant-item-placeholder">
                              {item.name.slice(0, 1)}
                            </span>
                          )}
                          <span className="ai-assistant-item-body">
                            <Typography.Text className="ai-assistant-item-name">
                              {item.name}
                            </Typography.Text>
                            <Typography.Text
                              className="ai-assistant-item-meta"
                              type="secondary"
                            >
                              {item.subtitle ??
                                `${item.categoryLabel}${
                                  typeof item.price === "number"
                                    ? ` · ¥${item.price.toFixed(2)}`
                                    : ""
                                }`}
                            </Typography.Text>
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : null}
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
                  {message.suggestions?.length ? (
                    <div className="ai-assistant-suggestions">
                      {message.suggestions.map((suggestion) => (
                        <Button
                          className="ai-assistant-suggestion"
                          key={suggestion}
                          onClick={() => applySuggestion(suggestion)}
                          size="small"
                          type="default"
                        >
                          {suggestion}
                        </Button>
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
