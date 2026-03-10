import express from "express";
import request from "supertest";

jest.mock("../services/rssService", () => ({
  validateFeedUrl: jest.fn(),
}));

import {sourcesRouter} from "../api/sources";
import {validateFeedUrl} from "../services/rssService";

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.uid = "user1";
  next();
});
app.use("/sources", sourcesRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

// --- POST /sources/validate ---

describe("POST /sources/validate", () => {
  it("有効なRSS URLの場合 ok を返す", async () => {
    (validateFeedUrl as jest.Mock).mockResolvedValue(true);

    const res = await request(app)
      .post("/sources/validate")
      .send({url: "https://example.com/feed"});

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("url が欠けている場合 400 を返す", async () => {
    const res = await request(app).post("/sources/validate").send({});
    expect(res.status).toBe(400);
  });

  it("無効なRSS URLの場合 400 を返す", async () => {
    (validateFeedUrl as jest.Mock).mockResolvedValue(false);

    const res = await request(app)
      .post("/sources/validate")
      .send({url: "https://not-a-feed.com"});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/RSS/);
  });
});
