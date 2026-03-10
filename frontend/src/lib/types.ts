// ─── Butler (= バックエンドの topics コレクション) ──────────────────────────

export interface Butler {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;  // Firebase Storage URL, null = デフォルトアイコン
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
  topicId: string;
  topicName: string;
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
  topicId: string;   // 紐付く Butler (topic) の ID
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

// ─── DigestConfig (= バックエンドの digest_configs コレクション) ─────────────

export interface DigestConfig {
  id: string;
  topicId: string;
  name: string;
  description: string;      // UI 表示用の説明
  schedule: string | null;  // cron 式、null は手動のみ
  promptTemplate: string;
  periodHours: number;
  accentColor: string;      // UI 表示用アクセントカラー（hex）
  isActive: boolean;
  lastRunAt: { seconds: number; nanoseconds: number } | null;
  createdAt: { seconds: number; nanoseconds: number };
  updatedAt: { seconds: number; nanoseconds: number };
}
