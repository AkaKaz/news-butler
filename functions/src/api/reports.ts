import {Router} from "express";
import {Timestamp} from "firebase-admin/firestore";
import {db} from "../firebase";
import {generateDigest as aiGenerateDigest} from "../services/vertexAiService";
import {Report, GenerateReportRequest, Butler, Article} from "../types";

// eslint-disable-next-line new-cap
export const reportsRouter = Router();

const COL_REPORTS = "digests";  // Firestoreコレクション名は互換性のため維持
const COL_BUTLERS = "topics";   // Firestoreコレクション名は互換性のため維持
const COL_ARTICLES = "articles";

/** レポート一覧（クエリ: butlerId） */
reportsRouter.get("/", async (req, res, next) => {
  try {
    const {butlerId} = req.query as {butlerId?: string};

    let query = db.collection(COL_REPORTS)
      .orderBy("generatedAt", "desc")
      .limit(50) as FirebaseFirestore.Query;

    if (butlerId) {
      query = query.where("topicId", "==", butlerId);
    }

    const snap = await query.get();
    res.json(snap.docs.map((d) => ({id: d.id, ...d.data()})));
  } catch (e) {
    next(e);
  }
});

/** レポート詳細 */
reportsRouter.get("/:id", async (req, res, next) => {
  try {
    const snap = await db.collection(COL_REPORTS).doc(req.params.id).get();
    if (!snap.exists) {
      res.status(404).json({error: "レポートが見つかりません"});
      return;
    }
    res.json({id: snap.id, ...snap.data()});
  } catch (e) {
    next(e);
  }
});

/** レポート手動生成 */
reportsRouter.post("/generate", async (req, res, next) => {
  try {
    const {butlerId, from, to} = req.body as GenerateReportRequest;
    if (!butlerId) {
      res.status(400).json({error: "butlerId は必須です"});
      return;
    }

    // AI執事取得
    const butlerSnap = await db.collection(COL_BUTLERS).doc(butlerId).get();
    if (!butlerSnap.exists) {
      res.status(404).json({error: "AI執事が見つかりません"});
      return;
    }
    const butler = butlerSnap.data() as Butler;

    // 対象期間
    const periodEnd = to ? new Date(to) : new Date();
    const periodStart = from ?
      new Date(from) :
      new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000);

    // 記事取得
    let articleQuery = db.collection(COL_ARTICLES)
      .where("isProcessed", "==", true)
      .where("publishedAt", ">=", Timestamp.fromDate(periodStart))
      .where(
        "publishedAt", "<=", Timestamp.fromDate(periodEnd)
      ) as FirebaseFirestore.Query;

    if (butler.sourceIds && butler.sourceIds.length > 0) {
      articleQuery = articleQuery.where(
        "sourceId", "in", butler.sourceIds.slice(0, 10)
      );
    }

    const articleSnap = await articleQuery
      .orderBy("publishedAt", "desc")
      .limit(30)
      .get();

    const articles = articleSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Article),
    }));

    if (articles.length === 0) {
      res.status(422).json({error: "対象期間に分析済み記事がありません"});
      return;
    }

    // AI レポート生成
    const content = await aiGenerateDigest(
      butler.name,
      butler.description,
      butler.keywords,
      articles.map((a) => ({
        title: a.title,
        url: a.url,
        summary: a.aiSummary ?? "",
      }))
    );

    // Firestore に保存（フィールド名は互換性のため維持）
    const now = Timestamp.now();
    const report: Omit<Report, "id"> = {
      topicId: butlerId,
      topicName: butler.name,
      content,
      articleIds: articles.map((a) => a.id ?? ""),
      articleCount: articles.length,
      periodStart: Timestamp.fromDate(periodStart),
      periodEnd: Timestamp.fromDate(periodEnd),
      generatedAt: now,
    };

    const ref = await db.collection(COL_REPORTS).add(report);
    res.status(201).json({id: ref.id, ...report});
  } catch (e) {
    next(e);
  }
});
