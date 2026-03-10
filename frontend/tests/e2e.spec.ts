import {test, expect} from "@playwright/test";
import type {Butler} from "../src/lib/types";

// ── モックデータ ─────────────────────────────────────────────────────────────

const mockButlers: Butler[] = [
  {
    id: "butler-1",
    name: "テクノロジーニュース",
    description: "AI・テクノロジー関連の最新情報を収集",
    keywords: ["AI", "機械学習", "ディープラーニング"],
    sourceIds: ["src-1"],
    isActive: true,
    scheduleEnabled: false,
    scheduleCron: null,
    createdAt: {seconds: 1700000000, nanoseconds: 0},
    updatedAt: {seconds: 1700000000, nanoseconds: 0},
  },
  {
    id: "butler-2",
    name: "ビジネスニュース",
    description: "経済・ビジネス動向のまとめ",
    keywords: ["経済", "スタートアップ"],
    sourceIds: [],
    isActive: false,
    scheduleEnabled: false,
    scheduleCron: null,
    createdAt: {seconds: 1700000001, nanoseconds: 0},
    updatedAt: {seconds: 1700000001, nanoseconds: 0},
  },
];

const newButler: Butler = {
  id: "butler-new",
  name: "新しい執事",
  description: "テスト用の執事",
  keywords: [],
  sourceIds: [],
  isActive: true,
  scheduleEnabled: false,
  scheduleCron: null,
  createdAt: {seconds: 1700000002, nanoseconds: 0},
  updatedAt: {seconds: 1700000002, nanoseconds: 0},
};

// ── API モックヘルパー ────────────────────────────────────────────────────────

async function mockApi(
  page: import("@playwright/test").Page,
  overrides: Record<string, unknown> = {}
) {
  await page.route("**/butlers", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        json: (overrides.butlers as Butler[]) ?? mockButlers,
      });
    } else if (method === "POST") {
      const body = JSON.parse(
        (route.request().postData() ?? "{}") as string
      );
      await route.fulfill({
        status: 201,
        json: {
          ...newButler,
          name: body.name ?? newButler.name,
          description: body.description ?? newButler.description,
        },
      });
    } else {
      await route.continue();
    }
  });

  await page.route("**/butlers/**", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({json: mockButlers[0]});
    } else {
      await route.continue();
    }
  });

  await page.route("**/reports**", async (route) => {
    await route.fulfill({json: []});
  });
}

// ── テスト ────────────────────────────────────────────────────────────────────

test.describe("AI執事一覧ページ", () => {
  test("AI執事が一覧表示される", async ({page}) => {
    await mockApi(page);
    await page.goto("/butlers");
    await expect(
      page.getByRole("heading", {name: "AI執事"})
    ).toBeVisible();
    await expect(
      page.getByText("テクノロジーニュース")
    ).toBeVisible();
    await expect(
      page.getByText("ビジネスニュース")
    ).toBeVisible();
  });

  test("有効・無効バッジが表示される", async ({page}) => {
    await mockApi(page);
    await page.goto("/butlers");
    await expect(page.getByText("有効").first()).toBeVisible();
    await expect(page.getByText("無効").first()).toBeVisible();
  });

  test("AI執事が0件のとき空状態が表示される", async ({page}) => {
    await mockApi(page, {butlers: []});
    await page.goto("/butlers");
    await expect(page.getByText("AI執事がいません")).toBeVisible();
    await expect(
      page.getByText("「新規作成」ボタンから追加してください")
    ).toBeVisible();
  });
});

test.describe("AI執事 新規作成", () => {
  test("「新規作成」ボタンでモーダルが開く", async ({page}) => {
    await mockApi(page);
    await page.goto("/butlers");
    await page.getByRole("button", {name: /新規作成/}).click();
    await expect(
      page.getByRole("heading", {name: "AI執事を作成"})
    ).toBeVisible();
  });

  test("キャンセルボタンでモーダルが閉じる", async ({page}) => {
    await mockApi(page);
    await page.goto("/butlers");
    await page.getByRole("button", {name: /新規作成/}).click();
    await page.getByRole("button", {name: "キャンセル"}).click();
    await expect(
      page.getByRole("heading", {name: "AI執事を作成"})
    ).not.toBeVisible();
  });

  test("名前が空のとき作成ボタンが無効", async ({page}) => {
    await mockApi(page);
    await page.goto("/butlers");
    await page.getByRole("button", {name: /新規作成/}).click();
    const submitBtn = page.getByRole("button", {name: "作成"});
    await expect(submitBtn).toBeDisabled();
  });

  test("フォームを送信するとAI執事が追加される", async ({page}) => {
    await mockApi(page);
    await page.goto("/butlers");
    await page.getByRole("button", {name: /新規作成/}).click();
    await page.getByPlaceholder("例: テクノロジーニュース").fill("新しい執事");
    await page.getByRole("button", {name: "作成"}).click();
    await expect(
      page.getByRole("heading", {name: "AI執事を作成"})
    ).not.toBeVisible();
    await expect(page.getByText("新しい執事")).toBeVisible();
  });
});

test.describe("タブナビゲーション", () => {
  test("「AI執事」タブでバトラー一覧に遷移", async ({page}) => {
    await mockApi(page);
    await page.goto("/reports");
    // デスクトップ: サイドバー、モバイル: ボトムタブのどちらか
    const butlerLink = page.getByRole("link", {name: "AI執事"}).first();
    await butlerLink.click();
    await expect(page).toHaveURL(/\/butlers/);
    await expect(
      page.getByRole("heading", {name: "AI執事"})
    ).toBeVisible();
  });

  test("「新着」タブでレポート一覧に遷移", async ({page}) => {
    await mockApi(page);
    await page.goto("/butlers");
    const reportsLink = page.getByRole("link", {name: "新着"}).first();
    await reportsLink.click();
    await expect(page).toHaveURL(/\/reports/);
  });
});

test.describe("AI執事詳細", () => {
  test("カードクリックで詳細ページに遷移", async ({page}) => {
    await mockApi(page);
    await page.goto("/butlers");
    await page
      .getByRole("link", {name: /テクノロジーニュース/})
      .first()
      .click();
    await expect(page).toHaveURL(/\/butlers\/butler-1/);
  });
});
