import {VertexAI} from "@google-cloud/vertexai";

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? "";
const LOCATION = "asia-northeast1";
const MODEL = "gemini-1.5-pro";

const vertexAI = new VertexAI({project: PROJECT_ID, location: LOCATION});
const model = vertexAI.getGenerativeModel({model: MODEL});

export interface ArticleAnalysis {
  summary: string;
  keywords: string[];
  category: string;
  relevanceScore: number;
}

/**
 * 記事本文を AI 分析し、要約・キーワード・カテゴリ・重要度を返す。
 * @param {string} title 記事タイトル
 * @param {string} content 記事本文
 * @return {Promise<ArticleAnalysis>} AI 分析結果
 */
export async function analyzeArticle(
  title: string,
  content: string
): Promise<ArticleAnalysis> {
  const prompt = `以下の記事を分析し、JSON形式で回答してください。

# 記事タイトル
${title}

# 記事本文
${content}

# 出力形式（JSONのみ、説明不要）
{
  "summary": "200文字以内の日本語要約",
  "keywords": ["キーワード1", "キーワード2", "キーワード3"],
  "category": "カテゴリ名（例: テクノロジー, ビジネス, 科学, 政治, スポーツ, エンタメ, その他）",
  "relevanceScore": 一般的な重要度スコア（0〜100の整数）
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.candidates?.[0]
    ?.content?.parts?.[0]?.text ?? "";

  return parseAnalysisJson(text);
}

/**
 * トピックに関連する記事群からダイジェストを生成する。
 * @param {string} topicName トピック名
 * @param {string} topicDescription トピックの説明
 * @param {string[]} topicKeywords トピックのキーワード
 * @param {Array<{title: string, url: string, summary: string}>} articles
 *   ダイジェスト対象記事
 * @return {Promise<string>} 生成されたダイジェスト（Markdown）
 */
export async function generateDigest(
  topicName: string,
  topicDescription: string,
  topicKeywords: string[],
  articles: Array<{title: string; url: string; summary: string}>
): Promise<string> {
  const articleList = articles
    .map((a, i) =>
      `## ${i + 1}. ${a.title}\n${a.summary}\n出典: ${a.url}`
    )
    .join("\n\n");

  const prompt = `あなたはニュースキュレーターです。
以下のトピックに関連する記事をまとめたダイジェストを日本語のMarkdownで作成してください。

# トピック: ${topicName}
${topicDescription}
キーワード: ${topicKeywords.join(", ")}

# 対象記事
${articleList}

# ダイジェスト作成の指針
- トピックに最も関連する情報を優先する
- 各記事の重要ポイントを簡潔にまとめる
- 全体のトレンドや共通テーマを冒頭に示す
- 記事の出典URLを含める
- 読みやすい構成にする（見出し・箇条書きを活用）`;

  const result = await model.generateContent(prompt);
  return result.response.candidates?.[0]
    ?.content?.parts?.[0]?.text ?? "";
}

/**
 * AI レスポンスから JSON をパースし ArticleAnalysis を返す。
 * JSON ブロックが含まれる場合は抽出してパースする。
 * @param {string} text AI レスポンステキスト
 * @return {ArticleAnalysis} パース結果
 */
function parseAnalysisJson(text: string): ArticleAnalysis {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`AI response is not valid JSON: ${text.slice(0, 100)}`);
  }
  const parsed = JSON.parse(jsonMatch[0]);
  return {
    summary: String(parsed.summary ?? "").slice(0, 200),
    keywords: (Array.isArray(parsed.keywords) ? parsed.keywords : [])
      .slice(0, 5)
      .map(String),
    category: String(parsed.category ?? "その他"),
    relevanceScore: Math.min(100, Math.max(0,
      Number(parsed.relevanceScore ?? 50)
    )),
  };
}
