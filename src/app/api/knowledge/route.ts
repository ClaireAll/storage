import { NextResponse } from "next/server";
import { auth } from "../../../../auth";

type KnowledgeItem = {
  link: string;
  title: string;
};

type DevToArticle = {
  title?: string;
  url?: string;
};

type GithubRepository = {
  full_name?: string;
  html_url?: string;
  stargazers_count?: number;
};

type HackerNewsHit = {
  objectID: string;
  title?: string;
  url?: string | null;
};

function pickRandomItem(items: KnowledgeItem[]) {
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

function uniqueItems(items: KnowledgeItem[]) {
  const seenLinks = new Set<string>();

  return items.filter((item) => {
    const link = item.link.trim();
    const title = item.title.trim();

    if (!link || !title || seenLinks.has(link)) {
      return false;
    }

    seenLinks.add(link);
    return true;
  });
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "User-Agent": "storage-knowledge-card",
      ...init?.headers,
    },
    next: { revalidate: 60 * 30 },
  });

  if (!response.ok) {
    throw new Error(`request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function fetchJuejinArticle() {
  const response = await fetch(
    "https://api.juejin.cn/recommend_api/v1/article/recommend_cate_feed",
    {
      body: JSON.stringify({
        cate_id: "6809637767543259144",
        cursor: "0",
        id_type: 2,
        limit: 20,
        sort_type: 300,
      }),
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      method: "POST",
      next: { revalidate: 60 * 30 },
    },
  );

  if (!response.ok) {
    return null;
  }

  const result = (await response.json()) as {
    data?: Array<{
      article_info?: {
        article_id?: string;
        title?: string;
      };
    }>;
  };
  const items = uniqueItems(
    (result.data ?? []).map((item) => ({
      link: item.article_info?.article_id
        ? `https://juejin.cn/post/${item.article_info.article_id}`
        : "",
      title: item.article_info?.title ?? "",
    })),
  );

  return pickRandomItem(items);
}

async function fetchJuejinArticleFromHotPage() {
  const response = await fetch("https://juejin.cn/hot/articles", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    next: { revalidate: 60 * 30 },
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const items = Array.from(
    new Set([...html.matchAll(/\/post\/(\d+)/g)].map((match) => match[1])),
  ).map((articleId) => ({
    link: `https://juejin.cn/post/${articleId}`,
    title: `稀土掘金文章 ${articleId}`,
  }));

  return pickRandomItem(uniqueItems(items));
}

async function fetchRecentStarredGithubProject() {
  const since = new Date();

  since.setDate(since.getDate() - 90);

  const params = new URLSearchParams({
    order: "desc",
    per_page: "20",
    q: `created:>${since.toISOString().slice(0, 10)} stars:>50`,
    sort: "stars",
  });
  const result = await fetchJson<{ items?: GithubRepository[] }>(
    `https://api.github.com/search/repositories?${params}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
      },
    },
  );
  const items = uniqueItems(
    (result.items ?? []).map((item) => ({
      link: item.html_url ?? "",
      title: `${item.full_name ?? "GitHub project"}${
        item.stargazers_count ? ` · ${item.stargazers_count} stars` : ""
      }`,
    })),
  );

  return pickRandomItem(items);
}

async function fetchDevToArticles(tag: string, topDays = 30) {
  const params = new URLSearchParams({
    per_page: "20",
    tag,
    top: String(topDays),
  });
  const articles = await fetchJson<DevToArticle[]>(
    `https://dev.to/api/articles?${params}`,
  );

  return uniqueItems(
    articles.map((article) => ({
      link: article.url ?? "",
      title: article.title ?? "",
    })),
  );
}

async function fetchGameDevelopmentTutorial() {
  const articles = await fetchDevToArticles("gamedev", 30);
  const tutorialLikeItems = articles.filter((item) =>
    /(tutorial|learn|build|making|game|godot|unity|javascript|webgl|canvas)/i.test(
      item.title,
    ),
  );

  return pickRandomItem(
    tutorialLikeItems.length > 0 ? tutorialLikeItems : articles,
  );
}

async function fetchStockLearningFromDevTo() {
  const results = await Promise.allSettled(
    ["investing", "stockmarket", "finance", "stocks"].map((tag) =>
      fetchDevToArticles(tag, 30),
    ),
  );
  const items = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );

  return pickRandomItem(uniqueItems(items));
}

async function fetchStockLearningFromHackerNews() {
  const params = new URLSearchParams({
    hitsPerPage: "20",
    query: "stock market investing learning trading",
    tags: "story",
  });
  const result = await fetchJson<{ hits?: HackerNewsHit[] }>(
    `https://hn.algolia.com/api/v1/search?${params}`,
  );
  const items = uniqueItems(
    (result.hits ?? []).map((hit) => ({
      link: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
      title: hit.title ?? "",
    })),
  );

  return pickRandomItem(items);
}

async function fetchStockLearning() {
  return (
    (await fetchStockLearningFromDevTo().catch(() => null)) ??
    (await fetchStockLearningFromHackerNews().catch(() => null))
  );
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const results = await Promise.allSettled([
    fetchJuejinArticle().then((item) => item ?? fetchJuejinArticleFromHotPage()),
    fetchRecentStarredGithubProject(),
    fetchGameDevelopmentTutorial(),
    fetchStockLearning(),
  ]);
  const items = results.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  );

  return NextResponse.json({ items });
}
