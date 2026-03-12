import Parser from "rss-parser";
import {Article} from "../types";
import {Timestamp} from "firebase-admin/firestore";

const parser = new Parser({
  timeout: 10000,
  headers: {"User-Agent": "NewsButler/1.0 (RSS Reader)"},
});

export type FetchedArticle = Omit<Article,
  "id" | "isProcessed" | "aiSummary" | "aiKeywords" |
  "aiCategory" | "aiRelevanceScore">;

/**
 * RSS フィードを取得し、記事一覧を返す。
 * @param {string} sourceId RSSソースID
 * @param {string} sourceName RSSソース名
 * @param {string} feedUrl RSS フィード URL
 * @return {Promise<FetchedArticle[]>} 取得した記事一覧
 */
export async function fetchFeed(
  sourceId: string,
  sourceName: string,
  feedUrl: string
): Promise<FetchedArticle[]> {
  const feed = await parser.parseURL(feedUrl);

  return feed.items
    .filter((item) => item.link && item.title)
    .map((item) => {
      const content = item.contentSnippet ?? item.content ?? "";
      const publishedAt = item.isoDate ?
        Timestamp.fromDate(new Date(item.isoDate)) :
        Timestamp.now();

      return {
        sourceId,
        sourceName,
        title: (item.title ?? "").trim(),
        url: (item.link ?? "").trim(),
        content: content.slice(0, 5000),
        author: item.creator ?? null,
        publishedAt,
        fetchedAt: Timestamp.now(),
      };
    });
}

/**
 * URL が有効な RSS フィードかどうかを検証する。
 * @param {string} url 検証する URL
 * @return {Promise<boolean>} 有効な RSS フィードなら true
 */
export async function validateFeedUrl(url: string): Promise<boolean> {
  try {
    const feed = await parser.parseURL(url);
    return Array.isArray(feed.items);
  } catch {
    return false;
  }
}

/**
 * RSS フィードのタイトルを取得する。
 * @param {string} url RSS フィード URL
 * @return {Promise<string|null>} フィードタイトル、取得失敗時は null
 */
export async function fetchFeedTitle(url: string): Promise<string | null> {
  try {
    const feed = await parser.parseURL(url);
    return feed.title ?? null;
  } catch {
    return null;
  }
}
