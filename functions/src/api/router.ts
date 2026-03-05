import {Router} from "express";
import {authenticate} from "./middleware";
import {sourcesRouter} from "./sources";
import {articlesRouter} from "./articles";
import {topicsRouter} from "./topics";
import {digestsRouter} from "./digests";

// eslint-disable-next-line new-cap
export const router = Router();

// すべてのルートに認証を適用
router.use(authenticate);

// ヘルスチェック（認証後）
router.get("/health", (_req, res) => {
  res.json({status: "ok"});
});

router.use("/sources", sourcesRouter);
router.use("/articles", articlesRouter);
router.use("/topics", topicsRouter);
router.use("/digests", digestsRouter);
