import {Router} from "express";
import {Timestamp} from "firebase-admin/firestore";
import {db} from "../firebase";
import {Topic} from "../types";

// eslint-disable-next-line new-cap
export const topicsRouter = Router();

const COL = "topics";

/** トピック一覧 */
topicsRouter.get("/", async (_req, res, next) => {
  try {
    const snap = await db.collection(COL).orderBy("createdAt", "desc").get();
    res.json(snap.docs.map((d) => ({id: d.id, ...d.data()})));
  } catch (e) {
    next(e);
  }
});

/** トピック追加 */
topicsRouter.post("/", async (req, res, next) => {
  try {
    const {
      name, description = "", keywords = [],
      sourceIds = [], scheduleEnabled = false,
      scheduleCron = null,
    } = req.body as Partial<Topic>;

    if (!name) {
      res.status(400).json({error: "name は必須です"});
      return;
    }

    const now = Timestamp.now();
    const data: Omit<Topic, "id"> = {
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

/** トピック更新 */
topicsRouter.put("/:id", async (req, res, next) => {
  try {
    const {id} = req.params;
    const ref = db.collection(COL).doc(id);

    if (!(await ref.get()).exists) {
      res.status(404).json({error: "トピックが見つかりません"});
      return;
    }

    const {
      name, description, keywords, sourceIds,
      scheduleEnabled, scheduleCron,
    } = req.body as Partial<Topic>;

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

/** トピック削除 */
topicsRouter.delete("/:id", async (req, res, next) => {
  try {
    const {id} = req.params;
    const ref = db.collection(COL).doc(id);

    if (!(await ref.get()).exists) {
      res.status(404).json({error: "トピックが見つかりません"});
      return;
    }

    await ref.delete();
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
