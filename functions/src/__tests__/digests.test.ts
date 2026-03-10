import express from "express";
import request from "supertest";

const mockAdd = jest.fn();
const mockOrderBy = jest.fn();
const mockWhere = jest.fn();
const mockDocGet = jest.fn();

jest.mock("../firebase", () => ({
  db: {
    collection: jest.fn((col: string) => {
      if (col === "digests") {
        return {
          orderBy: mockOrderBy,
          doc: jest.fn(() => ({get: mockDocGet})),
          add: mockAdd,
        };
      }
      return {doc: jest.fn(() => ({get: mockDocGet}))};
    }),
  },
  auth: {verifyIdToken: jest.fn().mockResolvedValue({uid: "user1"})},
}));

jest.mock("../services/vertexAiService", () => ({
  generateDigest: jest.fn().mockResolvedValue("# ダイジェスト\n本日のまとめ"),
}));

jest.mock("firebase-admin/firestore", () => ({
  Timestamp: {
    now: jest.fn().mockReturnValue({seconds: 1000, nanoseconds: 0}),
    fromDate: jest.fn((d: Date) => ({
      seconds: Math.floor(d.getTime() / 1000),
    })),
  },
}));

import {reportsRouter} from "../api/reports";
import {generateDigest as aiGenerateDigest}
  from "../services/vertexAiService";

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.uid = "user1";
  next();
});
app.use("/reports", reportsRouter);

/**
 * Firestore クエリチェーンのモックを設定する。
 * @param {object[]} docs モックで返すドキュメント配列
 * @return {object} チェーンオブジェクト
 */
function setupCollectionMock(docs: object[]) {
  const chain = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({docs}),
  };
  mockOrderBy.mockReturnValue(chain);
  mockWhere.mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /reports ────────────────────────────────────────────────────────────

describe("GET /reports", () => {
  it("レポート一覧を返す", async () => {
    setupCollectionMock([
      {id: "d1", data: () => ({topicName: "AI", content: "まとめ"})},
    ]);

    const res = await request(app).get("/reports");
    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe("d1");
  });
});

// ─── GET /reports/:id ────────────────────────────────────────────────────────

describe("GET /reports/:id", () => {
  it("レポート詳細を返す", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      id: "d1",
      data: () => ({topicName: "AI", content: "まとめ"}),
    });

    const res = await request(app).get("/reports/d1");
    expect(res.status).toBe(200);
    expect(res.body.topicName).toBe("AI");
  });

  it("存在しない場合 404 を返す", async () => {
    mockDocGet.mockResolvedValue({exists: false});

    const res = await request(app).get("/reports/unknown");
    expect(res.status).toBe(404);
  });
});

// ─── POST /reports/generate ──────────────────────────────────────────────────

describe("POST /reports/generate", () => {
  it("butlerId がない場合 400 を返す", async () => {
    const res = await request(app).post("/reports/generate").send({});
    expect(res.status).toBe(400);
  });

  it("AI執事が存在しない場合 404 を返す", async () => {
    mockDocGet.mockResolvedValue({exists: false});

    const res = await request(app)
      .post("/reports/generate")
      .send({butlerId: "t1"});
    expect(res.status).toBe(404);
  });

  it("記事がない場合 422 を返す", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        name: "AI", description: "", keywords: [], sourceIds: [],
      }),
    });

    // 記事コレクションのクエリ結果を空にする
    const articleChain = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({docs: []}),
    };
    // collection("articles") のモックを上書き
    const {db} = jest.requireMock("../firebase");
    db.collection.mockImplementation((col: string) => {
      if (col === "articles") return articleChain;
      return {doc: jest.fn(() => ({get: mockDocGet})), add: mockAdd};
    });

    const res = await request(app)
      .post("/reports/generate")
      .send({butlerId: "t1"});
    expect(res.status).toBe(422);
  });

  it("正常にレポートを生成して 201 を返す", async () => {
    const mockArticle = {
      id: "a1",
      data: () => ({
        title: "AI記事", url: "https://example.com/1",
        aiSummary: "要約", sourceId: "s1",
      }),
    };

    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        name: "AIトレンド",
        description: "AI情報",
        keywords: ["AI"],
        sourceIds: [],
      }),
    });

    const articleChain = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({docs: [mockArticle]}),
    };
    const {db} = jest.requireMock("../firebase");
    db.collection.mockImplementation((col: string) => {
      if (col === "articles") return articleChain;
      return {
        doc: jest.fn(() => ({get: mockDocGet})),
        add: mockAdd,
        orderBy: mockOrderBy,
      };
    });
    mockAdd.mockResolvedValue({id: "new-report-id"});

    const res = await request(app)
      .post("/reports/generate")
      .send({butlerId: "t1"});

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("new-report-id");
    expect(res.body.content).toBe("# ダイジェスト\n本日のまとめ");
    expect(aiGenerateDigest).toHaveBeenCalled();
  });
});
