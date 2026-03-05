import express from "express";
import request from "supertest";

// Firestore モック
const mockGet = jest.fn();
const mockAdd = jest.fn();
const mockUpdate = jest.fn();
const mockOrderBy = jest.fn();
const mockDoc = jest.fn();

jest.mock("../firebase", () => ({
  db: {
    collection: jest.fn().mockReturnValue({
      orderBy: mockOrderBy,
      add: mockAdd,
      doc: mockDoc,
    }),
  },
  auth: {verifyIdToken: jest.fn().mockResolvedValue({uid: "user1"})},
}));

jest.mock("../services/rssService", () => ({
  validateFeedUrl: jest.fn(),
}));

jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {serverTimestamp: jest.fn().mockReturnValue("SERVER_TIMESTAMP")},
  Timestamp: {now: jest.fn().mockReturnValue({seconds: 1000, nanoseconds: 0})},
}));

import {sourcesRouter} from "../api/sources";
import {validateFeedUrl} from "../services/rssService";

const app = express();
app.use(express.json());
// authenticate をスキップして sourcesRouter だけテスト
app.use((req, _res, next) => {
  req.uid = "user1";
  next();
});
app.use("/sources", sourcesRouter);

beforeEach(() => {
  jest.clearAllMocks();
  // デフォルト: doc().get() は存在するドキュメントを返す
  mockDoc.mockReturnValue({
    get: mockGet,
    update: mockUpdate,
  });
});

// ─── GET /sources ────────────────────────────────────────────────────────────

describe("GET /sources", () => {
  it("ソース一覧を返す", async () => {
    mockOrderBy.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        docs: [
          {id: "s1", data: () => ({
            name: "Example", url: "https://example.com/feed",
          })},
        ],
      }),
    });

    const res = await request(app).get("/sources");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe("s1");
  });
});

// ─── POST /sources ───────────────────────────────────────────────────────────

describe("POST /sources", () => {
  it("有効なRSSフィードのソースを追加する", async () => {
    (validateFeedUrl as jest.Mock).mockResolvedValue(true);
    mockAdd.mockResolvedValue({id: "new-id"});

    const res = await request(app).post("/sources").send({
      name: "Example",
      url: "https://example.com/feed",
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("new-id");
    expect(res.body.isActive).toBe(true);
  });

  it("name が欠けている場合 400 を返す", async () => {
    const res = await request(app).post("/sources").send({
      url: "https://example.com/feed",
    });
    expect(res.status).toBe(400);
  });

  it("無効なRSS URLの場合 400 を返す", async () => {
    (validateFeedUrl as jest.Mock).mockResolvedValue(false);

    const res = await request(app).post("/sources").send({
      name: "Example",
      url: "https://not-a-feed.com",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/RSS/);
  });
});

// ─── PUT /sources/:id ────────────────────────────────────────────────────────

describe("PUT /sources/:id", () => {
  it("既存ソースを更新する", async () => {
    mockGet.mockResolvedValue({exists: true});
    mockUpdate.mockResolvedValue(undefined);

    const res = await request(app).put("/sources/s1").send({name: "Updated"});
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated");
  });

  it("存在しないソースの場合 404 を返す", async () => {
    mockGet.mockResolvedValue({exists: false});

    const res = await request(app).put("/sources/s1").send({name: "X"});
    expect(res.status).toBe(404);
  });
});

// ─── POST /sources/:id/toggle ────────────────────────────────────────────────

describe("POST /sources/:id/toggle", () => {
  it("isActive を反転する", async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({isActive: true}),
    });
    mockUpdate.mockResolvedValue(undefined);

    const res = await request(app).post("/sources/s1/toggle");
    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });
});

// ─── DELETE /sources/:id ─────────────────────────────────────────────────────

describe("DELETE /sources/:id", () => {
  it("ソースを論理削除する（204）", async () => {
    mockGet.mockResolvedValue({exists: true});
    mockUpdate.mockResolvedValue(undefined);

    const res = await request(app).delete("/sources/s1");
    expect(res.status).toBe(204);
  });

  it("存在しないソースの場合 404 を返す", async () => {
    mockGet.mockResolvedValue({exists: false});

    const res = await request(app).delete("/sources/s1");
    expect(res.status).toBe(404);
  });
});
