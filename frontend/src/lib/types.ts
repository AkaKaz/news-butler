// ─── Butler (= バックエンドの topics コレクション) ──────────────────────────

export interface Butler {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  sourceIds: string[];
  scheduleEnabled: boolean;
  scheduleCron: string | null;
  isActive: boolean;
  createdAt: { seconds: number; nanoseconds: number };
  updatedAt: { seconds: number; nanoseconds: number };
}

// ─── Report (= バックエンドの digests コレクション) ──────────────────────────

export interface Report {
  id: string;
  topicId: string;   // Firestore フィールド名
  topicName: string; // Firestore フィールド名
  content: string;   // Markdown
  articleIds: string[];
  articleCount: number;
  periodStart: { seconds: number; nanoseconds: number };
  periodEnd: { seconds: number; nanoseconds: number };
  generatedAt: { seconds: number; nanoseconds: number };
}

// ─── Source ──────────────────────────────────────────────────────────────────

export interface Source {
  id: string;
  name: string;
  url: string;
  category: string;
  tags: string[];
  isActive: boolean;
  fetchIntervalMinutes: number;
  lastFetchedAt: { seconds: number; nanoseconds: number } | null;
  consecutiveErrors: number;
  createdAt: { seconds: number; nanoseconds: number };
  updatedAt: { seconds: number; nanoseconds: number };
}
