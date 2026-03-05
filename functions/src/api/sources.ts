import {Router} from "express";
import {FieldValue, Timestamp} from "firebase-admin/firestore";
import {db} from "../firebase";
import {validateFeedUrl} from "../services/rssService";
import {Source} from "../types";

// eslint-disable-next-line new-cap
export const sourcesRouter = Router();

const COL = "sources";

/** ソース一覧 */
sourcesRouter.get("/", async (_req, res, next) => {
  try {
    const snap = await db.collection(COL).orderBy("createdAt", "desc").get();
    const sources = snap.docs.map((d) => ({id: d.id, ...d.data()}));
    res.json(sources);
  } catch (e) {
    next(e);
  }
});

/** ソース追加 */
sourcesRouter.post("/", async (req, res, next) => {
  try {
    const {name, url, category = "", tags = []} = req.body as Partial<Source>;
    if (!name || !url) {
      res.status(400).json({error: "name と url は必須です"});
      return;
    }

    const isValid = await validateFeedUrl(url);
    if (!isValid) {
      res.status(400).json({error: "有効な RSS フィード URL ではありません"});
      return;
    }

    const now = Timestamp.now();
    const data: Omit<Source, "id"> = {
      name,
      url,
      category,
      tags,
      isActive: true,
      fetchIntervalMinutes: 60,
      lastFetchedAt: null,
      consecutiveErrors: 0,
      createdAt: now,
      updatedAt: now,
    };

    const ref = await db.collection(COL).add(data);
    res.status(201).json({id: ref.id, ...data});
  } catch (e) {
    next(e);
  }
});

/** ソース更新 */
sourcesRouter.put("/:id", async (req, res, next) => {
  try {
    const {id} = req.params;
    const {name, url, category, tags, fetchIntervalMinutes} =
      req.body as Partial<Source>;

    const ref = db.collection(COL).doc(id);
    if (!(await ref.get()).exists) {
      res.status(404).json({error: "ソースが見つかりません"});
      return;
    }

    const updates: Record<string, unknown> = {updatedAt: Timestamp.now()};
    if (name !== undefined) updates.name = name;
    if (url !== undefined) updates.url = url;
    if (category !== undefined) updates.category = category;
    if (tags !== undefined) updates.tags = tags;
    if (fetchIntervalMinutes !== undefined) {
      updates.fetchIntervalMinutes = fetchIntervalMinutes;
    }

    await ref.update(updates);
    res.json({id, ...updates});
  } catch (e) {
    next(e);
  }
});

/** 有効/無効切り替え */
sourcesRouter.post("/:id/toggle", async (req, res, next) => {
  try {
    const {id} = req.params;
    const ref = db.collection(COL).doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      res.status(404).json({error: "ソースが見つかりません"});
      return;
    }

    const current = snap.data() as Source;
    const isActive = !current.isActive;
    await ref.update({isActive, updatedAt: Timestamp.now()});
    res.json({id, isActive});
  } catch (e) {
    next(e);
  }
});

/** ソース削除 */
sourcesRouter.delete("/:id", async (req, res, next) => {
  try {
    const {id} = req.params;
    const ref = db.collection(COL).doc(id);

    if (!(await ref.get()).exists) {
      res.status(404).json({error: "ソースが見つかりません"});
      return;
    }

    await ref.update({
      isActive: false,
      updatedAt: Timestamp.now(),
      deletedAt: FieldValue.serverTimestamp(),
    });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
