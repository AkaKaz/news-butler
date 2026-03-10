import {Router} from "express";
import {Timestamp} from "firebase-admin/firestore";
import {db} from "../firebase";
import {Butler} from "../types";

// eslint-disable-next-line new-cap
export const butlersRouter = Router();

const COL = "topics"; // Firestoreコレクション名は互換性のため維持

/** AI執事一覧 */
butlersRouter.get("/", async (_req, res, next) => {
  try {
    const snap = await db.collection(COL).orderBy("createdAt", "desc").get();
    res.json(snap.docs.map((d) => ({id: d.id, ...d.data()})));
  } catch (e) {
    next(e);
  }
});

/** AI執事詳細 */
butlersRouter.get("/:id", async (req, res, next) => {
  try {
    const snap = await db.collection(COL).doc(req.params.id).get();
    if (!snap.exists) {
      res.status(404).json({error: "AI執事が見つかりません"});
      return;
    }
    res.json({id: snap.id, ...snap.data()});
  } catch (e) {
    next(e);
  }
});

/** AI執事追加 */
butlersRouter.post("/", async (req, res, next) => {
  try {
    const {
      name, description = "", keywords = [],
      sourceIds = [], scheduleEnabled = false,
      scheduleCron = null,
    } = req.body as Partial<Butler>;

    if (!name) {
      res.status(400).json({error: "name は必須です"});
      return;
    }

    const now = Timestamp.now();
    const data: Omit<Butler, "id"> = {
      name,
      description,
      keywords,
      sourceIds,
      scheduleEnabled,
      scheduleCron,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const ref = await db.collection(COL).add(data);
    res.status(201).json({id: ref.id, ...data});
  } catch (e) {
    next(e);
  }
});

/** AI執事更新 */
butlersRouter.put("/:id", async (req, res, next) => {
  try {
    const {id} = req.params;
    const ref = db.collection(COL).doc(id);

    if (!(await ref.get()).exists) {
      res.status(404).json({error: "AI執事が見つかりません"});
      return;
    }

    const {
      name, description, keywords, sourceIds,
      scheduleEnabled, scheduleCron,
    } = req.body as Partial<Butler>;

    const updates: Record<string, unknown> = {updatedAt: Timestamp.now()};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (keywords !== undefined) updates.keywords = keywords;
    if (sourceIds !== undefined) updates.sourceIds = sourceIds;
    if (scheduleEnabled !== undefined) {
      updates.scheduleEnabled = scheduleEnabled;
    }
    if (scheduleCron !== undefined) updates.scheduleCron = scheduleCron;

    await ref.update(updates);
    res.json({id, ...updates});
  } catch (e) {
    next(e);
  }
});

/** AI執事削除 */
butlersRouter.delete("/:id", async (req, res, next) => {
  try {
    const {id} = req.params;
    const ref = db.collection(COL).doc(id);

    if (!(await ref.get()).exists) {
      res.status(404).json({error: "AI執事が見つかりません"});
      return;
    }

    await ref.delete();
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
