"use client";
import { Button, Divider, Image, Input, Select, Switch, Tag } from "antd";
import { CloseOutlined, DeleteOutlined } from "@ant-design/icons";
import { OverlayScrollArea } from "@/app/(pages)/common/overlay-scrollbar";
import { AtlasEditor } from "./atlas-editor";
import type { AtlasGraph, AtlasNode, AtlasEdge } from "./atlas-model";

type InspectorProps = {
  graph: AtlasGraph;
  readOnly: boolean;
  saving: boolean;
  selection: { type: "node" | "edge"; id: string } | null;
  selectedNode?: AtlasNode;
  selectedEdge?: AtlasEdge;
  patchNode: (id: string, patch: Partial<AtlasNode>) => void;
  setSelection: (value: { type: "node" | "edge"; id: string } | null) => void;
  patchEdge: (id: string, patch: Partial<Pick<AtlasEdge, "label" | "directed">>) => boolean;
  change: (graph: AtlasGraph) => void;
  deleteNode: (node: AtlasNode) => void;
  addImage: (file: File, insert?: (url: string) => void) => void;
  chooseImage: (insert: (url: string) => void) => void;
  focus: (id: string) => void;
};

/** 展示节点正文、图片与关系编辑，画布和保存逻辑由工作区管理。 */
export function AtlasInspector({
  graph,
  readOnly,
  saving,
  selection,
  selectedNode,
  selectedEdge,
  patchNode,
  setSelection,
  patchEdge,
  change,
  deleteNode,
  addImage,
  chooseImage,
  focus,
}: InspectorProps) {
  return (
    <>
      {!readOnly && selection && (
        <aside className="home-preview-divider flex w-80 shrink-0 flex-col overflow-hidden border-l p-4">
          <div className="flex shrink-0 items-center justify-between gap-3 pb-4">
            <strong>{selectedNode ? "知识详情" : "关系详情"}</strong>
            <Button
              aria-label="关闭详情"
              type="text"
              icon={<CloseOutlined />}
              onClick={() => setSelection(null)}
            />
          </div>
          <OverlayScrollArea
            className="min-h-0 flex-1"
            viewportClassName="flex flex-col gap-5 pr-1 pb-2"
          >
            {selectedNode && (
              <>
                <label className="flex flex-col gap-2 text-xs">
                  标题
                  <Input
                    disabled={saving}
                    value={selectedNode.title}
                    maxLength={500}
                    onChange={(event) =>
                      patchNode(selectedNode.id, {
                        title: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="flex flex-col gap-2 text-xs">
                  分类
                  <Select
                    disabled={saving}
                    className="w-full"
                    value={selectedNode.categoryId}
                    options={graph.categories.map((category) => ({
                      value: category.id,
                      label: category.name,
                    }))}
                    onChange={(categoryId) =>
                      patchNode(selectedNode.id, { categoryId })
                    }
                    getPopupContainer={(trigger) =>
                      trigger.closest("section") ?? document.body
                    }
                  />
                </label>
                <label className="flex flex-col gap-2 text-xs">
                  标签
                  <Select
                    disabled={saving}
                    className="w-full"
                    mode="tags"
                    value={selectedNode.tags}
                    onChange={(tags) => patchNode(selectedNode.id, { tags })}
                    getPopupContainer={(trigger) =>
                      trigger.closest("section") ?? document.body
                    }
                  />
                </label>
                {selectedNode.image && (
                  <>
                    <Image src={selectedNode.image} alt={selectedNode.title} />
                    <label className="flex flex-col gap-2 text-xs">
                      图片说明
                      <Input.TextArea
                        disabled={saving}
                        value={selectedNode.description}
                        onChange={(event) =>
                          patchNode(selectedNode.id, {
                            description: event.target.value,
                          })
                        }
                      />
                    </label>
                  </>
                )}
                <div>
                  <span className="mb-2 block text-xs">正文</span>
                  <AtlasEditor
                    key={selectedNode.id}
                    value={selectedNode.body}
                    readOnly={saving}
                    onChange={(body) => patchNode(selectedNode.id, { body })}
                    onPasteImage={addImage}
                    onImage={chooseImage}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>固定位置</span>
                  <Switch
                    disabled={saving}
                    checked={selectedNode.fixed}
                    onChange={(fixed) => patchNode(selectedNode.id, { fixed })}
                  />
                </div>
                <Divider className="my-1! border-[var(--home-preview-divider-color)]!" />
                <strong className="text-sm">关联知识</strong>
                {graph.edges
                  .filter(
                    (edge) =>
                      edge.source === selectedNode.id ||
                      edge.target === selectedNode.id,
                  )
                  .map((edge) => {
                    const other = graph.nodes.find(
                      (node) =>
                        node.id ===
                        (edge.source === selectedNode.id
                          ? edge.target
                          : edge.source),
                    );
                    return (
                      <Button
                        key={edge.id}
                        className="h-auto! min-h-9 justify-start! whitespace-normal! px-3! py-2! text-left [&_.ant-btn-icon]:shrink-0"
                        onClick={() => {
                          if (other) {
                            setSelection({ type: "node", id: other.id });
                            focus(other.id);
                          }
                        }}
                      >
                        <span className="min-w-0 break-words">{other?.title}</span>
                        {edge.label && <Tag className="m-0! shrink-0">{edge.label}</Tag>}
                      </Button>
                    );
                  })}
                <Button
                  danger
                  disabled={saving}
                  icon={<DeleteOutlined />}
                  onClick={() => deleteNode(selectedNode)}
                >
                  删除节点
                </Button>
              </>
            )}
            {selectedEdge && (
              <>
                <div className="break-words text-sm">
                  {
                    graph.nodes.find((node) => node.id === selectedEdge.source)
                      ?.title
                  }{" "}
                  →{" "}
                  {
                    graph.nodes.find((node) => node.id === selectedEdge.target)
                      ?.title
                  }
                </div>
                <label className="flex flex-col gap-2 text-sm">
                  关系名称
                  <Input
                    key={`${selectedEdge.id}:${selectedEdge.label}`}
                    aria-label="关系名称"
                    defaultValue={selectedEdge.label}
                    maxLength={200}
                    disabled={saving}
                    onBlur={event => {
                      if (!patchEdge(selectedEdge.id, { label: event.target.value }))
                        event.target.value = selectedEdge.label;
                    }}
                    onPressEnter={event => event.currentTarget.blur()}
                  />
                </label>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span>有向关系</span>
                  <Switch
                    aria-label="有向关系"
                    checked={selectedEdge.directed}
                    disabled={saving}
                    onChange={directed => patchEdge(selectedEdge.id, { directed })}
                  />
                </div>
                <Button
                  danger
                  disabled={saving}
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    change({
                      ...graph,
                      edges: graph.edges.filter(
                        (edge) => edge.id !== selectedEdge.id,
                      ),
                    });
                    setSelection(null);
                  }}
                >
                  删除关系
                </Button>
              </>
            )}
          </OverlayScrollArea>
        </aside>
      )}
    </>
  );
}
