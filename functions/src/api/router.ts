import {Router} from "express";
import {authenticate} from "./middleware";
import {sourcesRouter} from "./sources";
import {reportsRouter} from "./reports";

// eslint-disable-next-line new-cap
export const router = Router();

// すべてのルートに認証を適用
router.use(authenticate);

// ヘルスチェック（認証後）
router.get("/health", (_req, res) => {
  res.json({status: "ok"});
});

// sources/validate: RSS URL検証 (CORS回避)
router.use("/sources", sourcesRouter);
// reports/generate: AI レポート生成
router.use("/reports", reportsRouter);
