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
          ? "ai-assistant-root ai-assistant-root-expanded pointer-events-auto static z-auto h-full min-h-0 w-full self-stretch max-[640px]:h-[min(560px,calc(100dvh-96px))]"
          : "ai-assistant-root pointer-events-none fixed bottom-6 right-6 z-[2147483000] max-[640px]:bottom-4 max-[640px]:right-4"
      }
      ref={assistantRootRef}
    >
      {isOpen ? (
        <section
          aria-label="DeepSeek 助手"
          className={
            isExpanded
              ? "ai-assistant-panel ai-assistant-panel-expanded pointer-events-auto static z-[1] flex h-full max-h-none min-h-0 w-full flex-col gap-3 rounded-lg p-3.5"
              : "ai-assistant-panel pointer-events-auto absolute bottom-14 right-3 z-[1] flex h-[min(330px,calc(100dvh-96px))] w-[min(380px,calc(100vw-48px))] flex-col gap-3 rounded-lg p-3.5"
          }
          role="dialog"
        >
          <div className="ai-assistant-panel-header flex min-h-7 items-center justify-between gap-3">
            <Typography.Text className="ai-assistant-title" strong>
              DeepSeek 助手
            </Typography.Text>
            <div className="ai-assistant-header-actions inline-flex items-center gap-1">
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
          <div className="ai-assistant-dialog flex min-h-0 flex-1 flex-col gap-3">
            <div
              className="ai-assistant-messages flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1"
              role="log"
            >
              {messages.map((message, index) => (
                <div
                  className={
                    message.role === "user"
                      ? "ai-assistant-message ai-assistant-message-user max-w-[86%] self-end whitespace-pre-wrap rounded-lg px-2.5 py-2 leading-[1.6]"
                      : "ai-assistant-message ai-assistant-message-assistant max-w-[86%] self-start whitespace-pre-wrap rounded-lg px-2.5 py-2 leading-[1.6]"
                  }
                  key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
                >
                  <Typography.Text>{message.content}</Typography.Text>
                  {message.sections?.length ? (
                      <div className="ai-assistant-sections mt-2 grid gap-2">
                      {message.sections.map((section) => (
                        <div
                          className="ai-assistant-section grid gap-1 rounded-lg border p-2"
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
                    <div className="ai-assistant-items mt-2 grid gap-2">
                      {message.items.map((item) => (
                        <a
                          className="ai-assistant-item grid min-w-0 grid-cols-[34px_minmax(0,1fr)] items-center gap-2 rounded-lg border p-[7px]"
                          href={item.url}
                          key={`${item.category}-${item.id}-${item.name}`}
                          rel="noreferrer"
                          target={item.url ? "_blank" : undefined}
                        >
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              alt={item.name}
                              className="ai-assistant-item-image size-[34px] rounded-md object-cover"
                              src={item.imageUrl}
                            />
                          ) : (
                            <span className="ai-assistant-item-placeholder inline-flex size-[34px] items-center justify-center rounded-md">
                              {item.name.slice(0, 1)}
                            </span>
                          )}
                          <span className="ai-assistant-item-body grid min-w-0 gap-0.5">
                            <Typography.Text className="ai-assistant-item-name overflow-hidden text-ellipsis whitespace-nowrap">
                              {item.name}
                            </Typography.Text>
                            <Typography.Text
                              className="ai-assistant-item-meta overflow-hidden text-ellipsis whitespace-nowrap"
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
                    <div className="ai-assistant-generated-images mt-2 grid w-full grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
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
                            className="ai-assistant-generated-image block aspect-[3/4] w-full rounded-lg border object-cover"
                            src={image}
                          />
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {message.suggestions?.length ? (
                    <div className="ai-assistant-suggestions mt-2 flex flex-wrap gap-2">
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
              <Typography.Text className="ai-assistant-error block" type="danger">
                {error}
              </Typography.Text>
            ) : null}
            <div className="ai-assistant-capabilities flex flex-wrap gap-2">
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
            <div className="ai-assistant-input-row grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
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
            : "ai-assistant-fab pointer-events-auto relative z-[2] inline-flex size-14 min-w-14 items-center justify-center overflow-hidden rounded-full"
        }
        icon={
          <CategoryIcon
            className="ai-assistant-fab-icon size-[42px]"
            iconClassName="ai-assistant-fab-symbol size-7 text-[28px] leading-none"
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
