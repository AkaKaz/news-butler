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
import { db } from "./firebase";
import type { Butler, Report, Source } from "./types";

const VRT = import.meta.env.VITE_VRT_AUTH_BYPASS === "true";
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

// ── Mock data for VRT / CI screenshots ──────────────────────────────────────

const MOCK_BUTLERS: Butler[] = [
  {
    id: "mock-1",
    name: "テクノロジーウォッチャー",
    description: "最新のテクノロジーニュースを監視します",
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
    keywords: ["経済", "M&A", "決算"],
    sourceIds: [],
    scheduleEnabled: false,
    scheduleCron: null,
    isActive: true,
    createdAt: { seconds: 1700000000, nanoseconds: 0 },
    updatedAt: { seconds: 1700000000, nanoseconds: 0 },
  },
];

const MOCK_SOURCES: Source[] = [
  {
    id: "src-1",
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
];

const MOCK_REPORTS: Report[] = [
  {
    id: "rep-1",
    topicId: "mock-1",
    topicName: "テクノロジーウォッチャー",
    content: "## 今日のテクノロジーニュース\n\n- AI分野で新たな進展がありました。",
    articleIds: ["art-1"],
    articleCount: 5,
    periodStart: { seconds: 1699913600, nanoseconds: 0 },
    periodEnd: { seconds: 1700000000, nanoseconds: 0 },
    generatedAt: { seconds: 1700000000, nanoseconds: 0 },
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
  data: Pick<Butler, "name" | "description">
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
