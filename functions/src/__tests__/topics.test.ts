import express from "express";
import request from "supertest";

const mockGet = jest.fn();
const mockAdd = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
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

jest.mock("firebase-admin/firestore", () => ({
  Timestamp: {now: jest.fn().mockReturnValue({seconds: 1000, nanoseconds: 0})},
}));

import {topicsRouter} from "../api/topics";

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.uid = "user1";
  next();
});
app.use("/topics", topicsRouter);

beforeEach(() => {
  jest.clearAllMocks();
  mockDoc.mockReturnValue({get: mockGet, update: mockUpdate, delete: mockDelete});
});

// ─── GET /topics ──────────────────────────────────────────────────────────────

describe("GET /topics", () => {
  it("トピック一覧を返す", async () => {
    mockOrderBy.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        docs: [
          {id: "t1", data: () => ({name: "AIトレンド"})},
        ],
      }),
    });

    const res = await request(app).get("/topics");
    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe("t1");
  });
});

// ─── POST /topics ─────────────────────────────────────────────────────────────

describe("POST /topics", () => {
  it("トピックを追加する", async () => {
    mockAdd.mockResolvedValue({id: "new-id"});

    const res = await request(app).post("/topics").send({
      name: "AIトレンド",
      description: "AI関連ニュース",
      keywords: ["AI", "機械学習"],
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("new-id");
    expect(res.body.isActive).toBe(true);
    expect(res.body.scheduleEnabled).toBe(false);
    expect(res.body.scheduleCron).toBeNull();
  });

  it("name が欠けている場合 400 を返す", async () => {
    const res = await request(app).post("/topics").send({
      description: "説明のみ",
    });
    expect(res.status).toBe(400);
  });
});

// ─── PUT /topics/:id ──────────────────────────────────────────────────────────

describe("PUT /topics/:id", () => {
  it("既存トピックを更新する", async () => {
    mockGet.mockResolvedValue({exists: true});
    mockUpdate.mockResolvedValue(undefined);

    const res = await request(app)
      .put("/topics/t1")
      .send({name: "更新名", keywords: ["新キーワード"]});

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("更新名");
    expect(res.body.keywords).toEqual(["新キーワード"]);
  });

  it("存在しないトピックの場合 404 を返す", async () => {
    mockGet.mockResolvedValue({exists: false});

    const res = await request(app).put("/topics/t1").send({name: "X"});
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /topics/:id ───────────────────────────────────────────────────────

describe("DELETE /topics/:id", () => {
  it("トピックを削除する（204）", async () => {
    mockGet.mockResolvedValue({exists: true});
    mockDelete.mockResolvedValue(undefined);

    const res = await request(app).delete("/topics/t1");
    expect(res.status).toBe(204);
    expect(mockDelete).toHaveBeenCalled();
  });

  it("存在しないトピックの場合 404 を返す", async () => {
    mockGet.mockResolvedValue({exists: false});

    const res = await request(app).delete("/topics/t1");
    expect(res.status).toBe(404);
  });
});
