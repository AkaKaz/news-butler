/**
 * firestore.ts のユニットテスト
 * VITE_VRT_AUTH_BYPASS=true モードでモックデータを返す関数をテスト。
 */
import {describe, it, expect, vi, beforeEach} from "vitest";

// Firebase SDK をモック（実際のFirestore接続を避ける）
vi.mock("./firebase", () => ({
  auth: {currentUser: null},
  db: {},
}));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(() => ({seconds: 0, nanoseconds: 0})),
}));

// VRT モードを有効化（モジュールロード前に設定が必要）
vi.stubEnv("VITE_VRT_AUTH_BYPASS", "true");

// VRT フラグ設定後にモジュールをインポート
const {
  getSourcesByButler,
  createSource,
  updateSource,
  toggleSource,
  deleteSource,
  fetchFeedMeta,
} = await import("./firestore");

describe("getSourcesByButler (VRT mode)", () => {
  it("mock-1 のソースを返す", async () => {
    const sources = await getSourcesByButler("mock-1");
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((s) => s.topicId === "mock-1")).toBe(true);
  });

  it("存在しないbutlerIdは空配列を返す", async () => {
    const sources = await getSourcesByButler("nonexistent");
    expect(sources).toEqual([]);
  });

  it("返されるソースはSourceの必須フィールドを持つ", async () => {
    const sources = await getSourcesByButler("mock-1");
    for (const s of sources) {
      expect(s).toHaveProperty("id");
      expect(s).toHaveProperty("topicId");
      expect(s).toHaveProperty("name");
      expect(s).toHaveProperty("url");
      expect(s).toHaveProperty("isActive");
      expect(s).toHaveProperty("consecutiveErrors");
    }
  });
});

describe("createSource (VRT mode)", () => {
  it("新しいソースを返す", async () => {
    const source = await createSource("mock-1", {
      name: "テストソース",
      url: "https://example.com/feed",
      category: "tech",
      tags: [],
    });
    expect(source.name).toBe("テストソース");
    expect(source.url).toBe("https://example.com/feed");
    expect(source.topicId).toBe("mock-1");
    expect(source.isActive).toBe(true);
    expect(source.consecutiveErrors).toBe(0);
  });

  it("idが付与される", async () => {
    const source = await createSource("mock-1", {
      name: "ソース",
      url: "https://example.com/feed",
      category: "",
      tags: [],
    });
    expect(source.id).toBeTruthy();
  });
});

describe("fetchFeedMeta (VRT mode)", () => {
  it("空のtitleを返す", async () => {
    const meta = await fetchFeedMeta("https://example.com/feed");
    expect(meta).toHaveProperty("title");
    expect(meta.title).toBe("");
  });
});

describe("updateSource (VRT mode)", () => {
  it("エラーなく完了する", async () => {
    await expect(
      updateSource("src-1", {name: "更新後の名前"})
    ).resolves.toBeUndefined();
  });
});

describe("toggleSource (VRT mode)", () => {
  it("エラーなく完了する", async () => {
    await expect(toggleSource("src-1", false)).resolves.toBeUndefined();
  });
});

describe("deleteSource (VRT mode)", () => {
  it("エラーなく完了する", async () => {
    await expect(deleteSource("src-1")).resolves.toBeUndefined();
  });
});
