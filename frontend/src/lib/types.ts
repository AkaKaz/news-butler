// ─── Butler (= バックエンドの topics コレクション) ──────────────────────────

export interface Butler {
  id: string;
  name: string;
  description: string;
  iconEmoji: string;   // デフォルト: "🤖"
  iconColor: string;   // hex color, e.g. "#6366f1"
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

// ─── Avatar constants ────────────────────────────────────────────────────────

export const ICON_EMOJIS = [
  "🤖", "🦊", "🐧", "🦁", "🐬", "🦅",
  "🎯", "⚡", "🌟", "🔥", "🌊", "🎨",
];

export const ICON_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#3b82f6", "#14b8a6", "#f43f5e",
  "#a855f7", "#84cc16",
];

export function randomIconColor(): string {
  return ICON_COLORS[Math.floor(Math.random() * ICON_COLORS.length)];
}
