import {Router} from "express";
import {authenticate} from "./middleware";

// eslint-disable-next-line new-cap
export const router = Router();

// すべてのルートに認証を適用
router.use(authenticate);

// ヘルスチェック（認証後）
router.get("/health", (_req, res) => {
  res.json({status: "ok"});
});

// 各リソースのルーターはここにマウント予定
// router.use("/sources", sourcesRouter);
// router.use("/articles", articlesRouter);
// router.use("/topics", topicsRouter);
// router.use("/digests", digestsRouter);
