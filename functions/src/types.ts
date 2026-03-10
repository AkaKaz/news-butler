import {Timestamp} from "firebase-admin/firestore";

// ─── Source ──────────────────────────────────────────────────────────────────

export interface Source {
  id?: string;
  name: string;
  url: string;
  category: string;
  tags: string[];
  isActive: boolean;
  fetchIntervalMinutes: number;
  lastFetchedAt: Timestamp | null;
  consecutiveErrors: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Article ─────────────────────────────────────────────────────────────────

export interface Article {
  id?: string;
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  content: string;
  author: string | null;
  publishedAt: Timestamp;
  fetchedAt: Timestamp;
  isProcessed: boolean;
  aiSummary: string | null;
  aiKeywords: string[];
  aiCategory: string | null;
  aiRelevanceScore: number | null;
}

// ─── Butler (旧: Topic) ───────────────────────────────────────────────────────

export interface Butler {
  id?: string;
  name: string;
  description: string;
  keywords: string[];
  sourceIds: string[]; // 空配列 = 全ソースが対象
  scheduleEnabled: boolean;
  scheduleCron: string | null;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Report (旧: Digest) ──────────────────────────────────────────────────────

export interface Report {
  id?: string;
  topicId: string; // Firestore フィールド名は互換性のため維持
  topicName: string; // Firestore フィールド名は互換性のため維持
  content: string; // Markdown
  articleIds: string[];
  articleCount: number;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  generatedAt: Timestamp;
}

// ─── API request / response ──────────────────────────────────────────────────

export interface GenerateReportRequest {
  butlerId: string;
  from?: string; // ISO 8601
  to?: string; // ISO 8601
}

export interface ArticleListQuery {
  sourceId?: string;
  keyword?: string;
  from?: string;
  to?: string;
  limit?: number;
}
