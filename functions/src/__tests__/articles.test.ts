import express from "express";
import request from "supertest";

const mockGet = jest.fn();
const mockOrderBy = jest.fn();
const mockDoc = jest.fn();

jest.mock("../firebase", () => ({
  db: {
    collection: jest.fn().mockReturnValue({
      orderBy: mockOrderBy,
      doc: mockDoc,
    }),
  },
  auth: {verifyIdToken: jest.fn().mockResolvedValue({uid: "user1"})},
}));

jest.mock("firebase-admin/firestore", () => ({
  Timestamp: {
    fromDate: jest.fn((d: Date) => ({seconds: Math.floor(d.getTime() / 1000)})),
  },
}));

import {articlesRouter} from "../api/articles";

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.uid = "user1";
  next();
});
app.use("/articles", articlesRouter);

/**
 * クエリチェーン orderBy→where→limit→get を統一モックで設定する。
 * @param {object[]} docs モックで返すドキュメント配列
 * @return {object} チェーンオブジェクト
 */
function setupQueryMock(docs: object[]) {
  const chain = {
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({docs}),
  };
  mockOrderBy.mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDoc.mockReturnValue({get: mockGet});
});

// ─── GET /articles ───────────────────────────────────────────────────────────

describe("GET /articles", () => {
  it("記事一覧を返す", async () => {
    setupQueryMock([
      {id: "a1", data: () => ({title: "記事1", aiSummary: "要約1"})},
      {id: "a2", data: () => ({title: "記事2", aiSummary: "要約2"})},
    ]);

    const res = await request(app).get("/articles");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].id).toBe("a1");
  });

  it("limit パラメータが適用される", async () => {
    const chain = setupQueryMock([]);
    await request(app).get("/articles?limit=10");
    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  it("limit は最大 200 に制限される", async () => {
    const chain = setupQueryMock([]);
    await request(app).get("/articles?limit=999");
    expect(chain.limit).toHaveBeenCalledWith(200);
  });

  it("sourceId フィルタが適用される", async () => {
    const chain = setupQueryMock([]);
    await request(app).get("/articles?sourceId=src1");
    expect(chain.where).toHaveBeenCalledWith("sourceId", "==", "src1");
  });

  it("keyword フィルタでタイトル一致の記事のみ返す", async () => {
    setupQueryMock([
      {id: "a1", data: () => (
        {title: "AI最新情報", aiSummary: "", aiKeywords: []}
      )},
      {id: "a2", data: () => (
        {title: "スポーツニュース", aiSummary: "", aiKeywords: []}
      )},
    ]);

    const res = await request(app).get("/articles?keyword=AI");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe("a1");
  });

  it("keyword フィルタで aiKeywords 一致の記事も返す", async () => {
    setupQueryMock([
      {id: "a1", data: () => ({
        title: "記事A", aiSummary: "", aiKeywords: ["機械学習", "AI"],
      })},
      {id: "a2", data: () => ({
        title: "記事B", aiSummary: "", aiKeywords: ["スポーツ"],
      })},
    ]);

    const res = await request(app).get("/articles?keyword=機械学習");
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe("a1");
  });
});

// ─── GET /articles/:id ───────────────────────────────────────────────────────

describe("GET /articles/:id", () => {
  it("記事詳細を返す", async () => {
    mockGet.mockResolvedValue({
      exists: true,
      id: "a1",
      data: () => ({title: "記事1", content: "本文"}),
    });

    const res = await request(app).get("/articles/a1");
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("記事1");
  });

  it("存在しない記事の場合 404 を返す", async () => {
    mockGet.mockResolvedValue({exists: false});

    const res = await request(app).get("/articles/unknown");
    expect(res.status).toBe(404);
  });
});
