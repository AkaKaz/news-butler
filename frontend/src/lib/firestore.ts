/**
 * Firestore SDK data access layer.
 * VRT bypass: returns mock data when VITE_VRT_AUTH_BYPASS=true.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import type { Butler, DigestConfig, Report, Source } from "./types";

const VRT = import.meta.env.VITE_VRT_AUTH_BYPASS === "true";
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

// ── Mock data for VRT / CI screenshots ──────────────────────────────────────

const MOCK_BUTLERS: Butler[] = [
  {
    id: "mock-1",
    name: "テクノロジーウォッチャー",
    description: "最新のテクノロジーニュースを監視します",
    iconUrl: null,
    iconColor: "#6366f1",
    keywords: ["AI", "クラウド", "スタートアップ"],
    sourceIds: ["src-1", "src-2"],
    scheduleEnabled: true,
    scheduleCron: "0 8 * * *",
    isActive: true,
    createdAt: { seconds: 1700000000, nanoseconds: 0 },
    updatedAt: { seconds: 1700000000, nanoseconds: 0 },
  },
  {
    id: "mock-2",
    name: "ビジネスインサイト",
    description: "ビジネス・経済ニュースをまとめます",
    iconUrl: null,
    iconColor: "#f97316",
    keywords: ["経済", "M&A", "決算"],
    sourceIds: ["src-3"],
    scheduleEnabled: true,
    scheduleCron: "0 9 * * 1",
    isActive: true,
    createdAt: { seconds: 1699900000, nanoseconds: 0 },
    updatedAt: { seconds: 1699900000, nanoseconds: 0 },
  },
  {
    id: "mock-3",
    name: "グローバルニュース",
    description: "海外メディアの主要ニュースを日本語でまとめます",
    iconUrl: null,
    iconColor: "#22c55e",
    keywords: ["国際", "政治", "環境", "社会"],
    sourceIds: ["src-1"],
    scheduleEnabled: false,
    scheduleCron: null,
    isActive: true,
    createdAt: { seconds: 1699800000, nanoseconds: 0 },
    updatedAt: { seconds: 1699800000, nanoseconds: 0 },
  },
  {
    id: "mock-4",
    name: "スポーツハイライト",
    description: "",
    iconUrl: null,
    iconColor: "#ec4899",
    keywords: [],
    sourceIds: [],
    scheduleEnabled: false,
    scheduleCron: null,
    isActive: false,
    createdAt: { seconds: 1699700000, nanoseconds: 0 },
    updatedAt: { seconds: 1699700000, nanoseconds: 0 },
  },
];

const MOCK_SOURCES: Source[] = [
  {
    id: "src-1",
    topicId: "mock-1",
    name: "TechCrunch Japan",
    url: "https://jp.techcrunch.com/feed/",
    category: "tech",
    tags: ["AI", "スタートアップ"],
    isActive: true,
    fetchIntervalMinutes: 60,
    lastFetchedAt: { seconds: 1700000000, nanoseconds: 0 },
    consecutiveErrors: 0,
    createdAt: { seconds: 1700000000, nanoseconds: 0 },
    updatedAt: { seconds: 1700000000, nanoseconds: 0 },
  },
  {
    id: "src-2",
    topicId: "mock-1",
    name: "Wired Japan",
    url: "https://wired.jp/rssfeeds/",
    category: "tech",
    tags: ["テクノロジー", "カルチャー"],
    isActive: true,
    fetchIntervalMinutes: 120,
    lastFetchedAt: { seconds: 1699990000, nanoseconds: 0 },
    consecutiveErrors: 0,
    createdAt: { seconds: 1699950000, nanoseconds: 0 },
    updatedAt: { seconds: 1699950000, nanoseconds: 0 },
  },
  {
    id: "src-3",
    topicId: "mock-2",
    name: "日本経済新聞",
    url: "https://www.nikkei.com/rss/",
    category: "business",
    tags: ["経済", "ビジネス"],
    isActive: false,
    fetchIntervalMinutes: 60,
    lastFetchedAt: { seconds: 1699900000, nanoseconds: 0 },
    consecutiveErrors: 3,
    createdAt: { seconds: 1699850000, nanoseconds: 0 },
    updatedAt: { seconds: 1699850000, nanoseconds: 0 },
  },
];

const MOCK_REPORTS: Report[] = [
  {
    id: "rep-1",
    topicId: "mock-1",
    topicName: "テクノロジーウォッチャー",
    content: `## 今日のテクノロジーニュース

### 注目トピック

**1. 生成AI の新展開**
大手テクノロジー企業が新世代の大規模言語モデルを発表。推論速度が従来比3倍に向上し、コスト削減にも成功した。マルチモーダル対応も強化され、画像・動画・音声を統合的に処理できるようになった。

**2. クラウド市場の動向**
AWS・Azure・GCPの第3四半期決算が出揃い、3社合計の市場規模が前年比28%増加。エンタープライズ向けAIサービスが牽引役となっている。

**3. スタートアップ資金調達**
AIインフラスタートアップ2社が合計120億円の資金調達を完了。データセンター拡張に充当予定。

---
*集計期間: 2023-11-14 ~ 2023-11-15 / 参照記事: 12件*`,
    articleIds: ["art-1", "art-2", "art-3"],
    articleCount: 12,
    periodStart: { seconds: 1699913600, nanoseconds: 0 },
    periodEnd: { seconds: 1700000000, nanoseconds: 0 },
    generatedAt: { seconds: 1700000000, nanoseconds: 0 },
  },
  {
    id: "rep-2",
    topicId: "mock-2",
    topicName: "ビジネスインサイト",
    content: `## ビジネスインサイト 週次まとめ

### M&A・資本動向
国内製造業大手が欧州スタートアップを約800億円で買収。DX推進を加速する狙い。

### 決算ハイライト
小売大手3社の中間決算が出揃い、EC売上比率が初めて全体の40%を突破。

---
*集計期間: 2023-11-07 ~ 2023-11-14 / 参照記事: 8件*`,
    articleIds: ["art-4"],
    articleCount: 8,
    periodStart: { seconds: 1699308800, nanoseconds: 0 },
    periodEnd: { seconds: 1699913600, nanoseconds: 0 },
    generatedAt: { seconds: 1699920000, nanoseconds: 0 },
  },
  {
    id: "rep-3",
    topicId: "mock-1",
    topicName: "テクノロジーウォッチャー",
    content: `## テクノロジーウォッチャー 前日まとめ

半導体大手が次世代チップのロードマップを公開。2025年に向けた製造プロセス刷新が明らかに。

---
*集計期間: 2023-11-13 ~ 2023-11-14 / 参照記事: 5件*`,
    articleIds: ["art-5"],
    articleCount: 5,
    periodStart: { seconds: 1699827200, nanoseconds: 0 },
    periodEnd: { seconds: 1699913600, nanoseconds: 0 },
    generatedAt: { seconds: 1699914000, nanoseconds: 0 },
  },
  {
    id: "rep-4",
    topicId: "mock-3",
    topicName: "グローバルニュース",
    content: `## グローバルニュース ダイジェスト

COP28 が開幕。再生可能エネルギーへの移行加速を巡り各国が交渉。日本は2030年目標の上積みを表明。

---
*集計期間: 2023-11-13 ~ 2023-11-14 / 参照記事: 6件*`,
    articleIds: ["art-6"],
    articleCount: 6,
    periodStart: { seconds: 1699827200, nanoseconds: 0 },
    periodEnd: { seconds: 1699913600, nanoseconds: 0 },
    generatedAt: { seconds: 1699916000, nanoseconds: 0 },
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function toTimestamp(
  ts: { seconds: number; nanoseconds: number }
): Timestamp {
  return new Timestamp(ts.seconds, ts.nanoseconds);
}

// ── Butlers ──────────────────────────────────────────────────────────────────

export async function getButlers(): Promise<Butler[]> {
  if (VRT) return MOCK_BUTLERS;
  const snap = await getDocs(
    query(collection(db, "topics"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Butler));
}

export async function getButler(id: string): Promise<Butler | null> {
  if (VRT) return MOCK_BUTLERS.find((b) => b.id === id) ?? MOCK_BUTLERS[0];
  const snap = await getDoc(doc(db, "topics", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Butler;
}

export async function createButler(
  data: Pick<Butler, "name" | "description" | "iconUrl" | "iconColor">
): Promise<Butler> {
  if (VRT) {
    const b: Butler = {
      id: `mock-${Date.now()}`,
      ...data,
      keywords: [],
      sourceIds: [],
      scheduleEnabled: false,
      scheduleCron: null,
      isActive: true,
      createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
      updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
    };
    return b;
  }
  const now = serverTimestamp();
  const ref = await addDoc(collection(db, "topics"), {
    name: data.name,
    description: data.description ?? "",
    iconUrl: data.iconUrl ?? null,
    iconColor: data.iconColor,
    keywords: [],
    sourceIds: [],
    scheduleEnabled: false,
    scheduleCron: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  const created = await getDoc(ref);
  return { id: created.id, ...created.data() } as Butler;
}

export async function uploadButlerIcon(butlerId: string, file: File): Promise<string> {
  if (VRT) return "";
  const ext = file.name.split(".").pop() ?? "jpg";
  const r = storageRef(storage, `butler-icons/${butlerId}/${Date.now()}.${ext}`);
  await uploadBytes(r, file);
  return getDownloadURL(r);
}

export async function updateButler(
  id: string,
  data: Partial<Omit<Butler, "id" | "createdAt">>
): Promise<void> {
  if (VRT) return;
  await updateDoc(doc(db, "topics", id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteButler(id: string): Promise<void> {
  if (VRT) return;
  await deleteDoc(doc(db, "topics", id));
}

// ── Sources ──────────────────────────────────────────────────────────────────

export async function getSources(): Promise<Source[]> {
  if (VRT) return MOCK_SOURCES;
  const snap = await getDocs(
    query(collection(db, "sources"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Source));
}

export async function createSource(
  data: Pick<Source, "name" | "url" | "category" | "tags">
): Promise<Source> {
  // validateFeedUrl はCORS回避のためFunctions経由
  const validateRes = await fetch(`${BASE_URL}/sources/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: data.url }),
  });
  if (!validateRes.ok) {
    throw new Error("有効な RSS フィード URL ではありません");
  }

  const now = serverTimestamp();
  const ref = await addDoc(collection(db, "sources"), {
    name: data.name,
    url: data.url,
    category: data.category ?? "",
    tags: data.tags ?? [],
    isActive: true,
    fetchIntervalMinutes: 60,
    lastFetchedAt: null,
    consecutiveErrors: 0,
    createdAt: now,
    updatedAt: now,
  });
  const created = await getDoc(ref);
  return { id: created.id, ...created.data() } as Source;
}

export async function updateSource(
  id: string,
  data: Partial<Omit<Source, "id" | "createdAt">>
): Promise<void> {
  if (VRT) return;
  await updateDoc(doc(db, "sources", id), { ...data, updatedAt: serverTimestamp() });
}

export async function toggleSource(id: string, isActive: boolean): Promise<void> {
  if (VRT) return;
  await updateDoc(doc(db, "sources", id), { isActive, updatedAt: serverTimestamp() });
}

export async function deleteSource(id: string): Promise<void> {
  if (VRT) return;
  // soft delete
  await updateDoc(doc(db, "sources", id), {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}

// ── Reports ──────────────────────────────────────────────────────────────────

export async function getReports(butlerId?: string): Promise<Report[]> {
  if (VRT) {
    return butlerId
      ? MOCK_REPORTS.filter((r) => r.topicId === butlerId)
      : MOCK_REPORTS;
  }
  let q = query(
    collection(db, "digests"),
    orderBy("generatedAt", "desc"),
    limit(50)
  );
  if (butlerId) {
    q = query(
      collection(db, "digests"),
      where("topicId", "==", butlerId),
      orderBy("generatedAt", "desc"),
      limit(50)
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Report));
}

export async function getReport(id: string): Promise<Report | null> {
  if (VRT) return MOCK_REPORTS.find((r) => r.id === id) ?? MOCK_REPORTS[0];
  const snap = await getDoc(doc(db, "digests", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Report;
}

/** レポート手動生成 (Functions経由) */
export async function generateReport(
  butlerId: string,
  token: string,
  from?: string,
  to?: string
): Promise<Report> {
  const res = await fetch(`${BASE_URL}/reports/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ butlerId, from, to }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  return res.json() as Promise<Report>;
}

// ── Sources (Butler-scoped) ───────────────────────────────────────────────────

export async function getSourcesByButler(butlerId: string): Promise<Source[]> {
  if (VRT) return MOCK_SOURCES.filter((s) => s.topicId === butlerId);
  const snap = await getDocs(
    query(
      collection(db, "sources"),
      where("topicId", "==", butlerId),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Source));
}

// ── DigestConfigs ─────────────────────────────────────────────────────────────

const MOCK_DIGEST_CONFIGS: DigestConfig[] = [];

export async function getDigestConfigs(butlerId: string): Promise<DigestConfig[]> {
  if (VRT) return MOCK_DIGEST_CONFIGS.filter((c) => c.topicId === butlerId);
  const snap = await getDocs(
    query(
      collection(db, "digest_configs"),
      where("topicId", "==", butlerId),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DigestConfig));
}
