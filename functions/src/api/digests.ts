import {Router} from "express";
import {Timestamp} from "firebase-admin/firestore";
import {db} from "../firebase";
import {generateDigest as aiGenerateDigest} from "../services/vertexAiService";
import {Digest, GenerateDigestRequest, Topic, Article} from "../types";

// eslint-disable-next-line new-cap
export const digestsRouter = Router();

const COL_DIGESTS = "digests";
const COL_TOPICS = "topics";
const COL_ARTICLES = "articles";

/** ダイジェスト一覧（クエリ: topicId） */
digestsRouter.get("/", async (req, res, next) => {
  try {
    const {topicId} = req.query as {topicId?: string};

    let query = db.collection(COL_DIGESTS)
      .orderBy("generatedAt", "desc")
      .limit(50) as FirebaseFirestore.Query;

    if (topicId) {
      query = query.where("topicId", "==", topicId);
    }

    const snap = await query.get();
    res.json(snap.docs.map((d) => ({id: d.id, ...d.data()})));
  } catch (e) {
    next(e);
  }
});

/** ダイジェスト詳細 */
digestsRouter.get("/:id", async (req, res, next) => {
  try {
    const snap = await db.collection(COL_DIGESTS).doc(req.params.id).get();
    if (!snap.exists) {
      res.status(404).json({error: "ダイジェストが見つかりません"});
      return;
    }
    res.json({id: snap.id, ...snap.data()});
  } catch (e) {
    next(e);
  }
});

/** ダイジェスト手動生成 */
digestsRouter.post("/generate", async (req, res, next) => {
  try {
    const {topicId, from, to} = req.body as GenerateDigestRequest;
    if (!topicId) {
      res.status(400).json({error: "topicId は必須です"});
      return;
    }

    // トピック取得
    const topicSnap = await db.collection(COL_TOPICS).doc(topicId).get();
    if (!topicSnap.exists) {
      res.status(404).json({error: "トピックが見つかりません"});
      return;
    }
    const topic = topicSnap.data() as Topic;

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

    if (topic.sourceIds && topic.sourceIds.length > 0) {
      articleQuery = articleQuery.where(
        "sourceId", "in", topic.sourceIds.slice(0, 10)
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

    // AI ダイジェスト生成
    const content = await aiGenerateDigest(
      topic.name,
      topic.description,
      topic.keywords,
      articles.map((a) => ({
        title: a.title,
        url: a.url,
        summary: a.aiSummary ?? "",
      }))
    );

    // Firestore に保存
    const now = Timestamp.now();
    const digest: Omit<Digest, "id"> = {
      topicId,
      topicName: topic.name,
      content,
      articleIds: articles.map((a) => a.id ?? ""),
      articleCount: articles.length,
      periodStart: Timestamp.fromDate(periodStart),
      periodEnd: Timestamp.fromDate(periodEnd),
      generatedAt: now,
    };

    const ref = await db.collection(COL_DIGESTS).add(digest);
    res.status(201).json({id: ref.id, ...digest});
  } catch (e) {
    next(e);
  }
});
