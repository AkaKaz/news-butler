import {Request, Response, NextFunction} from "express";
import {auth} from "../firebase";

/**
 * Firebase ID Token を検証する認証ミドルウェア。
 * Authorization: Bearer <token> ヘッダーが必須。
 * 検証成功時は req.uid にユーザーIDをセットして next() を呼ぶ。
 * @param {Request} req Express リクエスト
 * @param {Response} res Express レスポンス
 * @param {NextFunction} next 次のミドルウェア
 * @return {Promise<void>}
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization ?? "";
  if (!header.startsWith("Bearer ")) {
    res.status(401).json({error: "Authorization header is required"});
    return;
  }

  const token = header.slice(7);
  try {
    const decoded = await auth.verifyIdToken(token);
    req.uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({error: "Invalid or expired token"});
  }
}

/**
 * 予期しないエラーをキャッチして 500 を返す共通エラーハンドラー。
 * @param {unknown} err エラーオブジェクト
 * @param {Request} _req Express リクエスト
 * @param {Response} res Express レスポンス
 * @param {NextFunction} _next 次のミドルウェア
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  console.error(err);
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({error: message});
}
