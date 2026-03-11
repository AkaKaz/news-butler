// parseURL の参照をモジュール先頭で宣言し、全インスタンスで共有する
const mockParseURL = jest.fn();

jest.mock("rss-parser", () =>
  jest.fn().mockImplementation(() => ({parseURL: mockParseURL}))
);

import {fetchFeed, validateFeedUrl} from "../services/rssService";

beforeEach(() => {
  mockParseURL.mockReset();
});

describe("fetchFeed", () => {
  it("記事一覧を正しく変換して返す", async () => {
    mockParseURL.mockResolvedValue({
      items: [
        {
          title: "テスト記事",
          link: "https://example.com/1",
          contentSnippet: "記事の本文",
          creator: "著者A",
          isoDate: "2024-01-01T00:00:00.000Z",
        },
      ],
    });

    const articles = await fetchFeed(
      "src1", "Example", "https://example.com/feed"
    );

    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe("テスト記事");
    expect(articles[0].url).toBe("https://example.com/1");
    expect(articles[0].content).toBe("記事の本文");
    expect(articles[0].author).toBe("著者A");
    expect(articles[0].sourceId).toBe("src1");
    expect(articles[0].sourceName).toBe("Example");
  });

  it("title または link が空の記事は除外する", async () => {
    mockParseURL.mockResolvedValue({
      items: [
        {title: "有効記事", link: "https://example.com/1", contentSnippet: ""},
        {title: "", link: "https://example.com/2", contentSnippet: ""},
        {title: "リンクなし", link: undefined, contentSnippet: ""},
      ],
    });

    const articles = await fetchFeed(
      "src1", "Example", "https://example.com/feed"
    );
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe("有効記事");
  });

  it("本文が5,000文字を超える場合はトリミングする", async () => {
    mockParseURL.mockResolvedValue({
      items: [
        {
          title: "長い記事",
          link: "https://example.com/1",
          contentSnippet: "あ".repeat(6000),
          isoDate: "2024-01-01T00:00:00.000Z",
        },
      ],
    });

    const articles = await fetchFeed(
      "src1", "Example", "https://example.com/feed"
    );
    expect(articles[0].content.length).toBe(5000);
  });

  it("isoDate がない場合は Timestamp.now() を publishedAt に使用する", async () => {
    mockParseURL.mockResolvedValue({
      items: [
        {
          title: "日付なし記事",
          link: "https://example.com/1",
          contentSnippet: "本文",
        },
      ],
    });

    const articles = await fetchFeed(
      "src1", "Example", "https://example.com/feed"
    );
    expect(articles[0].publishedAt).toBeDefined();
  });

  it("author がない場合は null になる", async () => {
    mockParseURL.mockResolvedValue({
      items: [
        {
          title: "著者なし",
          link: "https://example.com/1",
          contentSnippet: "本文",
          isoDate: "2024-01-01T00:00:00.000Z",
        },
      ],
    });

    const articles = await fetchFeed(
      "src1", "Example", "https://example.com/feed"
    );
    expect(articles[0].author).toBeNull();
  });
});

describe("validateFeedUrl", () => {
  it("有効な RSS フィードの場合 isValid:true とタイトルを返す", async () => {
    mockParseURL.mockResolvedValue({items: [], title: "Example Feed"});

    const result = await validateFeedUrl("https://example.com/feed");
    expect(result.isValid).toBe(true);
    expect(result.title).toBe("Example Feed");
  });

  it("パースエラーの場合 isValid:false を返す", async () => {
    mockParseURL.mockRejectedValue(new Error("Invalid feed"));

    const result = await validateFeedUrl("https://invalid-url");
    expect(result.isValid).toBe(false);
  });
});
