import {Router} from "express";
import {Timestamp} from "firebase-admin/firestore";
import {db} from "../firebase";
import {ArticleListQuery} from "../types";

// eslint-disable-next-line new-cap
export const articlesRouter = Router();

const COL = "articles";

/** 記事一覧（フィルタ: sourceId, keyword, from, to, limit） */
articlesRouter.get("/", async (req, res, next) => {
  try {
    const {sourceId, keyword, from, to, limit} =
      req.query as ArticleListQuery;
    const max = Math.min(Number(limit ?? 50), 200);

    let query = db.collection(COL)
      .orderBy("publishedAt", "desc")
      .limit(max) as FirebaseFirestore.Query;

    if (sourceId) {
      query = query.where("sourceId", "==", sourceId);
    }
    if (from) {
      query = query.where(
        "publishedAt", ">=", Timestamp.fromDate(new Date(from))
      );
    }
    if (to) {
      query = query.where(
        "publishedAt", "<=", Timestamp.fromDate(new Date(to))
      );
    }

    const snap = await query.get();
    let articles = snap.docs.map((d) => ({id: d.id, ...d.data()})) as
      Array<Record<string, unknown>>;

    // keyword フィルタはクライアントサイドで実施
    if (keyword) {
      const kw = keyword.toLowerCase();
      articles = articles.filter((a) =>
        String(a.title ?? "").toLowerCase().includes(kw) ||
        String(a.aiSummary ?? "").toLowerCase().includes(kw) ||
        (a.aiKeywords as string[] ?? []).some((k) =>
          k.toLowerCase().includes(kw)
        )
      );
    }

    res.json(articles);
  } catch (e) {
    next(e);
  }
});

/** 記事詳細 */
articlesRouter.get("/:id", async (req, res, next) => {
  try {
    const snap = await db.collection(COL).doc(req.params.id).get();
    if (!snap.exists) {
      res.status(404).json({error: "記事が見つかりません"});
      return;
    }
    res.json({id: snap.id, ...snap.data()});
  } catch (e) {
    next(e);
  }
});
