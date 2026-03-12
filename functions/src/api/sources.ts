import {Router} from "express";
import {validateFeedUrl} from "../services/rssService";

// eslint-disable-next-line new-cap
export const sourcesRouter = Router();

/** RSS URL 検証 (CORS回避のためFunctions経由) */
sourcesRouter.post("/validate", async (req, res, next) => {
  try {
    const {url} = req.body as {url?: string};
    if (!url) {
      res.status(400).json({error: "url は必須です"});
      return;
    }
    const {isValid, title} = await validateFeedUrl(url);
    if (!isValid) {
      res.status(400).json({error: "有効な RSS フィード URL ではありません"});
      return;
    }
    res.json({ok: true, title});
  } catch (e) {
    next(e);
  }
});
