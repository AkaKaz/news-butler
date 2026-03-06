import { describe, it, expect } from "vitest";
import { formatDate, statusBadge } from "./sources";
import type { Source } from "./sources";

const baseSource: Source = {
  id: "1",
  name: "Test",
  url: "https://example.com/feed.xml",
  category: "tech",
  tags: [],
  isActive: true,
  fetchIntervalMinutes: 60,
  lastFetchedAt: null,
  consecutiveErrors: 0,
};

describe("formatDate", () => {
  it("null のとき「未取得」を返す", () => {
    expect(formatDate(null)).toBe("未取得");
  });

  it("ISO 文字列を日本語形式にフォーマットする", () => {
    const result = formatDate("2026-03-06T10:30:00.000Z");
    expect(result).toMatch(/\d{2}\/\d{2}/);
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe("statusBadge", () => {
  it("consecutiveErrors >= 3 で自動停止バッジ", () => {
    const badge = statusBadge({ ...baseSource, consecutiveErrors: 3 });
    expect(badge.label).toBe("自動停止");
    expect(badge.badgeClass).toBe("badge-error");
  });

  it("consecutiveErrors 1〜2 でエラーバッジ", () => {
    const badge = statusBadge({ ...baseSource, consecutiveErrors: 2 });
    expect(badge.label).toBe("エラー 2");
    expect(badge.badgeClass).toBe("badge-warning");
  });

  it("エラーなし・有効で有効バッジ", () => {
    const badge = statusBadge({
      ...baseSource,
      consecutiveErrors: 0,
      isActive: true,
    });
    expect(badge.label).toBe("有効");
    expect(badge.badgeClass).toBe("badge-success");
  });

  it("エラーなし・無効で無効バッジ", () => {
    const badge = statusBadge({
      ...baseSource,
      consecutiveErrors: 0,
      isActive: false,
    });
    expect(badge.label).toBe("無効");
    expect(badge.badgeClass).toBe("badge-ghost");
  });
});
