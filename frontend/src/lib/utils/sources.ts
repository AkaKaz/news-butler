export type Source = {
  id: string;
  name: string;
  url: string;
  category: string;
  tags: string[];
  isActive: boolean;
  fetchIntervalMinutes: number;
  lastFetchedAt: string | null;
  consecutiveErrors: number;
};

export type StatusBadge = { label: string; badgeClass: string };

export function formatDate(ts: string | null): string {
  if (!ts) return "未取得";
  return new Date(ts).toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusBadge(source: Source): StatusBadge {
  if (source.consecutiveErrors >= 3)
    return { label: "自動停止", badgeClass: "badge-error" };
  if (source.consecutiveErrors > 0)
    return {
      label: `エラー ${source.consecutiveErrors}`,
      badgeClass: "badge-warning",
    };
  if (source.isActive)
    return { label: "有効", badgeClass: "badge-success" };
  return { label: "無効", badgeClass: "badge-ghost" };
}
