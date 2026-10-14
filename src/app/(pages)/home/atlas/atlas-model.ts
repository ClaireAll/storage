export type AtlasDocument = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: AtlasDocument[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};
export type AtlasCategory = { id: string; name: string; color: string };
export type AtlasNode = {
  id: string;
  title: string;
  categoryId: string;
  tags: string[];
  position: { x: number; y: number };
  fixed: boolean;
  example?: boolean;
  body: AtlasDocument;
  image?: string;
  description: string;
  width?: number;
};
export type AtlasEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  directed: boolean;
  example?: boolean;
};
export type AtlasGraph = {
  version: 1;
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  categories: AtlasCategory[];
  viewport: { x: number; y: number; zoom: number };
  appearance?: AtlasAppearance;
};

export type AtlasAppearance = {
  preset: "clear" | "cosmic" | "custom";
  background: "solid" | "dots" | "grid" | "stars";
  backgroundColor: string | null;
  nodeStyle: "solid" | "outline" | "translucent";
  glowScope: "off" | "selected" | "all";
  glowColor: string | null;
  glowStrength: number;
  edgeColor: string | null;
  edgeOpacity: number;
  edgeWidth: number;
  edgeGlow: boolean;
  labelMode: "all" | "adaptive";
};

/** 返回独立预设对象，旧图谱未保存外观时沿用主题与点阵。 */
export function appearancePreset(preset: "clear" | "cosmic"): AtlasAppearance {
  return {
    preset,
    background: preset === "cosmic" ? "stars" : "dots",
    backgroundColor: preset === "cosmic" ? "#17191c" : null,
    nodeStyle: "translucent",
    glowScope: preset === "cosmic" ? "all" : "selected",
    glowColor: null,
    glowStrength: preset === "cosmic" ? 45 : 20,
    edgeColor: null,
    edgeOpacity: preset === "cosmic" ? 0.6 : 0.35,
    edgeWidth: 1,
    edgeGlow: preset === "cosmic",
    labelMode: "all",
  };
}

/** 校验外观中的枚举、颜色与数值范围，拒绝任意 CSS 注入。 */
export function validateAppearance(
  value: unknown,
): asserts value is AtlasAppearance {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("视觉设置无效");
  const settings = value as Record<string, unknown>;
  const choice = (key: string, values: string[]) =>
    values.includes(settings[key] as string);
  const color = (key: string) =>
    settings[key] === null ||
    (typeof settings[key] === "string" &&
      /^#[0-9a-f]{6}$/i.test(settings[key]));
  const number = (key: string, min: number, max: number) =>
    typeof settings[key] === "number" &&
    Number.isFinite(settings[key]) &&
    settings[key] >= min &&
    settings[key] <= max;
  if (
    !choice("preset", ["clear", "cosmic", "custom"]) ||
    !choice("background", ["solid", "dots", "grid", "stars"]) ||
    !choice("nodeStyle", ["solid", "outline", "translucent"]) ||
    !choice("glowScope", ["off", "selected", "all"]) ||
    !choice("labelMode", ["all", "adaptive"]) ||
    !color("backgroundColor") ||
    !color("glowColor") ||
    !color("edgeColor") ||
    !number("glowStrength", 0, 100) ||
    !number("edgeOpacity", 0.1, 1) ||
    !number("edgeWidth", 0.5, 4) ||
    typeof settings.edgeGlow !== "boolean"
  )
    throw new Error("视觉设置无效");
}

/** 根据自定义画布亮度选择标签前景，避免主题与背景不一致时看不清。 */
export function canvasTextColor(background: string): string {
  const hex = background.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return "#ffffff";
  const channels = [0, 2, 4]
    .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 >
    0.179
    ? "#000000"
    : "#ffffff";
}
export const emptyDocument: AtlasDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

/** 空草稿不创建分类，重复提交同一个草稿不会重复添加。 */
export function addAtlasCategory(graph: AtlasGraph, draft: AtlasCategory): AtlasGraph {
  const name = draft.name.trim();
  if (!name || graph.categories.some(category => category.id === draft.id)) return graph;
  if (name.length > 100 || graph.categories.some(category => category.name === name)) throw new Error("分类名称无效或已存在");
  if (!/^#[0-9a-f]{6}$/i.test(draft.color)) throw new Error("分类颜色无效");
  return { ...graph, categories: [...graph.categories, { ...draft, name }] };
}

/** 分类就地编辑保持顺序，同时校验空名称、重复名称与不透明色值。 */
export function updateAtlasCategory(graph: AtlasGraph, id: string, patch: Partial<Pick<AtlasCategory, "name" | "color">>): AtlasGraph {
  const category = graph.categories.find(item => item.id === id);
  if (!category) throw new Error("分类不存在");
  const next = { ...category, ...patch, name: (patch.name ?? category.name).trim() };
  if (!next.name || next.name.length > 100) throw new Error("分类名称需为 1～100 个字符");
  if (graph.categories.some(item => item.id !== id && item.name === next.name)) throw new Error("分类名称已存在");
  if (!/^#[0-9a-f]{6}$/i.test(next.color)) throw new Error("分类颜色无效");
  return { ...graph, categories: graph.categories.map(item => item.id === id ? next : item) };
}

/** 批量移动形成一个草稿快照，固定节点和未变化的位置保持原样。 */
export function moveAtlasNodes(graph: AtlasGraph, moved: { id: string; position: { x: number; y: number } }[]): AtlasGraph {
  const positions = new Map(moved.map(node => [node.id, node.position]));
  let changed = false;
  const nodes = graph.nodes.map(node => {
    const position = positions.get(node.id);
    if (node.fixed || !position || (position.x === node.position.x && position.y === node.position.y)) return node;
    changed = true;
    return { ...node, position };
  });
  return changed ? { ...graph, nodes } : graph;
}

/** 创建本地示例，首次保存前不写入数据库。 */
export function createExampleGraph(): AtlasGraph {
  const categories = [
    { id: "concept", name: "概念", color: "#23c99b" },
    { id: "note", name: "笔记", color: "#52a5ff" },
    { id: "project", name: "项目", color: "#f4b84b" },
    { id: "tool", name: "工具", color: "#ed8796" },
  ];
  const titles = [
    "前端开发",
    "React",
    "性能优化",
    "浏览器渲染",
    "设计系统",
    "Ant Design",
    "TypeScript",
    "知识管理",
    "个人项目",
    "Storage",
    "Codex 日报",
    "工作空间",
  ];
  const positions = [
    [100, 120],
    [340, 100],
    [560, 220],
    [730, 80],
    [80, 400],
    [280, 480],
    [470, 440],
    [680, 490],
    [480, 680],
    [720, 700],
    [850, 400],
    [150, 650],
  ];
  const nodes = titles.map((title, index): AtlasNode => ({
    id: `example-${index}`,
    title,
    categoryId: categories[index % 4].id,
    tags: ["示例"],
    position: { x: positions[index][0], y: positions[index][1] },
    fixed: false,
    example: true,
    description: "",
    body: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: `${title}的学习与实践记录。` }],
        },
      ],
    },
    ...(index === 11 ? { image: "/atlas-example.svg", width: 180 } : {}),
  }));
  const links = [
    [0, 1],
    [1, 2],
    [2, 3],
    [0, 4],
    [4, 5],
    [1, 6],
    [4, 7],
    [7, 8],
    [8, 9],
    [9, 10],
    [8, 11],
    [2, 9],
    [6, 9],
  ];
  return {
    version: 1,
    categories,
    nodes,
    edges: links.map(([source, target], index) => ({
      id: `example-edge-${index}`,
      source: nodes[source].id,
      target: nodes[target].id,
      label: index % 2 ? "" : "包含",
      directed: index % 2 === 0,
      example: true,
    })),
    viewport: { x: 0, y: 0, zoom: 0.7 },
  };
}

/** 提取正文文本及图片地址，供搜索和资源引用检查复用。 */
export function documentValues(doc: AtlasDocument): {
  text: string;
  images: string[];
} {
  const values = (doc.content ?? []).map(documentValues);
  return {
    text: [doc.text ?? "", ...values.map((value) => value.text)].join(" "),
    images: [
      ...(doc.type === "image" && typeof doc.attrs?.src === "string"
        ? [doc.attrs.src]
        : []),
      ...values.flatMap((value) => value.images),
    ],
  };
}

/** 收集节点与正文中的图片引用，不包含重复地址。 */
export function imageReferences(graph: AtlasGraph): string[] {
  return [
    ...new Set(
      graph.nodes.flatMap((node) => [
        ...(node.image ? [node.image] : []),
        ...documentValues(node.body).images,
      ]),
    ),
  ];
}

/** 多词全部匹配；返回直接匹配及一跳关联节点。 */
export function searchGraph(graph: AtlasGraph, query: string) {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const labels = new Map<string, string[]>();
  const categories = new Map(
    graph.categories.map((category) => [category.id, category.name]),
  );
  for (const edge of graph.edges)
    for (const id of [edge.source, edge.target]) {
      const values = labels.get(id) ?? [];
      values.push(edge.label);
      labels.set(id, values);
    }
  const matched = new Set<string>();
  for (const node of graph.nodes) {
    const text = [
      node.title,
      node.description,
      ...node.tags,
      categories.get(node.categoryId) ?? "",
      documentValues(node.body).text,
      ...(labels.get(node.id) ?? []),
    ]
      .join(" ")
      .toLocaleLowerCase();
    if (words.every((word) => text.includes(word))) matched.add(node.id);
  }
  const visible = new Set(matched);
  for (const edge of graph.edges)
    if (matched.has(edge.source) || matched.has(edge.target)) {
      visible.add(edge.source);
      visible.add(edge.target);
    }
  return { matched, visible };
}

/** 检查语义重复关系，无向关系不区分端点顺序。 */
export function duplicateEdge(edges: AtlasEdge[], edge: AtlasEdge) {
  return edges.some(
    (item) =>
      item.id !== edge.id &&
      item.directed === edge.directed &&
      item.label.trim() === edge.label.trim() &&
      ((item.source === edge.source && item.target === edge.target) ||
        (!edge.directed &&
          item.source === edge.target &&
          item.target === edge.source)),
  );
}

/** 在接口边界校验图谱，限制大小并拒绝悬空关系和无效正文。 */
export function validateGraph(value: unknown): asserts value is AtlasGraph {
  const record = (item: unknown): item is Record<string, unknown> =>
    !!item && typeof item === "object" && !Array.isArray(item);
  if (record(value) && value.appearance !== undefined)
    validateAppearance(value.appearance);
  const text = (item: unknown, max = 500): item is string =>
    typeof item === "string" && item.length <= max;
  const finite = (item: unknown) =>
    typeof item === "number" && Number.isFinite(item);
  let count = 0;
  const document = (item: unknown, depth = 0): boolean => {
    if (++count > 100000 || depth > 30 || !record(item) || !text(item.type, 50))
      return false;
    if (item.text !== undefined && !text(item.text, 100000)) return false;
    if (item.attrs !== undefined && !record(item.attrs)) return false;
    if (
      item.marks !== undefined &&
      (!Array.isArray(item.marks) ||
        !item.marks.every((mark) => record(mark) && text(mark.type, 50)))
    )
      return false;
    return (
      item.content === undefined ||
      (Array.isArray(item.content) &&
        item.content.every((child) => document(child, depth + 1)))
    );
  };
  if (
    !record(value) ||
    value.version !== 1 ||
    !Array.isArray(value.nodes) ||
    value.nodes.length > 3000 ||
    !Array.isArray(value.edges) ||
    value.edges.length > 20000 ||
    !Array.isArray(value.categories) ||
    value.categories.length > 200 ||
    !record(value.viewport) ||
    !finite(value.viewport.x) ||
    !finite(value.viewport.y) ||
    !finite(value.viewport.zoom) ||
    (value.viewport.zoom as number) <= 0
  )
    throw new Error("图谱格式或大小无效");
  const categories = new Set<string>();
  for (const category of value.categories) {
    if (
      !record(category) ||
      !text(category.id) ||
      !text(category.name, 100) ||
      !category.name.trim() ||
      typeof category.color !== "string" ||
      !/^#[0-9a-f]{6}$/i.test(category.color) ||
      categories.has(category.id as string)
    )
      throw new Error("分类无效");
    categories.add(category.id as string);
  }
  const ids = new Set<string>();
  for (const node of value.nodes) {
    if (
      !record(node) ||
      !text(node.id) ||
      !text(node.title) ||
      !node.title.trim() ||
      !categories.has(node.categoryId as string) ||
      ids.has(node.id as string) ||
      !record(node.position) ||
      !finite(node.position.x) ||
      !finite(node.position.y) ||
      typeof node.fixed !== "boolean" ||
      !Array.isArray(node.tags) ||
      node.tags.length > 100 ||
      !node.tags.every((tag) => text(tag, 100)) ||
      !text(node.description, 10000) ||
      !document(node.body) ||
      (node.image !== undefined && !text(node.image, 2000)) ||
      (node.width !== undefined &&
        (!finite(node.width) ||
          (node.width as number) < 40 ||
          (node.width as number) > 2000))
    )
      throw new Error("节点格式无效");
    ids.add(node.id as string);
  }
  const edgeIds = new Set<string>();
  for (const edge of value.edges) {
    if (
      !record(edge) ||
      !text(edge.id) ||
      edgeIds.has(edge.id as string) ||
      !ids.has(edge.source as string) ||
      !ids.has(edge.target as string) ||
      edge.source === edge.target ||
      !text(edge.label) ||
      typeof edge.directed !== "boolean"
    )
      throw new Error("关系格式无效");
    edgeIds.add(edge.id as string);
  }
  if (JSON.stringify(value).length > 8_000_000) throw new Error("图谱内容过大");
}
