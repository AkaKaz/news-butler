const mockGenerateContent = jest.fn();

jest.mock("@google-cloud/vertexai", () => ({
  VertexAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

import {
  analyzeArticle,
  generateDigest,
  parseAnalysisJson,
} from "../services/vertexAiService";

beforeEach(() => {
  mockGenerateContent.mockReset();
});

// ─── parseAnalysisJson ───────────────────────────────────────────────────────

describe("parseAnalysisJson", () => {
  it("正常な JSON を正しくパースする", () => {
    const text = JSON.stringify({
      summary: "テスト要約",
      keywords: ["AI", "技術"],
      category: "テクノロジー",
      relevanceScore: 80,
    });

    const result = parseAnalysisJson(text);
    expect(result.summary).toBe("テスト要約");
    expect(result.keywords).toEqual(["AI", "技術"]);
    expect(result.category).toBe("テクノロジー");
    expect(result.relevanceScore).toBe(80);
  });

  it("Markdown コードブロック内の JSON を抽出してパースする", () => {
    const text = "```json\n" + JSON.stringify({
      summary: "要約",
      keywords: ["k1"],
      category: "ビジネス",
      relevanceScore: 50,
    }) + "\n```";

    const result = parseAnalysisJson(text);
    expect(result.summary).toBe("要約");
  });

  it("JSON が含まれない場合はエラーをスローする", () => {
    expect(() => parseAnalysisJson("これはJSONではありません"))
      .toThrow("AI response is not valid JSON");
  });

  it("summary を 200 文字でトリミングする", () => {
    const longSummary = "あ".repeat(300);
    const text = JSON.stringify({
      summary: longSummary,
      keywords: [],
      category: "その他",
      relevanceScore: 50,
    });

    const result = parseAnalysisJson(text);
    expect(result.summary.length).toBe(200);
  });

  it("keywords を 5 件に制限する", () => {
    const text = JSON.stringify({
      summary: "要約",
      keywords: ["k1", "k2", "k3", "k4", "k5", "k6", "k7"],
      category: "その他",
      relevanceScore: 50,
    });

    const result = parseAnalysisJson(text);
    expect(result.keywords).toHaveLength(5);
  });

  it("relevanceScore を 0〜100 にクランプする", () => {
    const over = parseAnalysisJson(JSON.stringify({
      summary: "", keywords: [], category: "", relevanceScore: 150,
    }));
    expect(over.relevanceScore).toBe(100);

    const under = parseAnalysisJson(JSON.stringify({
      summary: "", keywords: [], category: "", relevanceScore: -10,
    }));
    expect(under.relevanceScore).toBe(0);
  });

  it("フィールドが欠損している場合はデフォルト値を使用する", () => {
    const result = parseAnalysisJson("{}");
    expect(result.summary).toBe("");
    expect(result.keywords).toEqual([]);
    expect(result.category).toBe("その他");
    expect(result.relevanceScore).toBe(50);
  });
});

// ─── analyzeArticle ──────────────────────────────────────────────────────────

describe("analyzeArticle", () => {
  it("Vertex AI のレスポンスを ArticleAnalysis に変換して返す", async () => {
    const mockJson = JSON.stringify({
      summary: "AI要約",
      keywords: ["技術"],
      category: "テクノロジー",
      relevanceScore: 75,
    });
    mockGenerateContent.mockResolvedValue({
      response: {candidates: [{content: {parts: [{text: mockJson}]}}]},
    });

    const result = await analyzeArticle("タイトル", "本文");
    expect(result.summary).toBe("AI要約");
    expect(result.category).toBe("テクノロジー");
    expect(result.relevanceScore).toBe(75);
  });
});

// ─── generateDigest ──────────────────────────────────────────────────────────

describe("generateDigest", () => {
  it("Vertex AI が生成した Markdown テキストをそのまま返す", async () => {
    const mockMarkdown = "# ダイジェスト\n\n本日のまとめです。";
    mockGenerateContent.mockResolvedValue({
      response: {
        candidates: [{content: {parts: [{text: mockMarkdown}]}}],
      },
    });

    const result = await generateDigest(
      "AIトレンド",
      "AIに関するニュースをまとめる",
      ["AI", "機械学習"],
      [{title: "記事1", url: "https://example.com/1", summary: "要約1"}]
    );
    expect(result).toBe(mockMarkdown);
  });
});
