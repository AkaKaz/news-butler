/**
 * e2e テスト
 *
 * CI では VITE_VRT_AUTH_BYPASS=true でビルドされるため、
 * firestore.ts の MOCK_BUTLERS / MOCK_SOURCES / MOCK_REPORTS が使われる。
 * page.route() による API モックは不要。
 */
import {test, expect} from "@playwright/test";

// ── AI執事一覧ページ ──────────────────────────────────────────────────────────

test.describe("AI執事一覧ページ", () => {
  test("AI執事が一覧表示される", async ({page}) => {
    await page.goto("/butlers");
    await expect(
      page.getByRole("heading", {name: "AI執事"})
    ).toBeVisible();
    await expect(page.getByText("テクノロジーウォッチャー")).toBeVisible();
    await expect(page.getByText("ビジネスインサイト")).toBeVisible();
  });

  test("有効・無効バッジが表示される", async ({page}) => {
    await page.goto("/butlers");
    await expect(page.getByText("有効").first()).toBeVisible();
  });
});

// ── AI執事 新規作成 ───────────────────────────────────────────────────────────

test.describe("AI執事 新規作成", () => {
  test("「新規作成」ボタンでモーダルが開く", async ({page}) => {
    await page.goto("/butlers");
    await page.getByRole("button", {name: /新規作成/}).click();
    await expect(
      page.getByRole("heading", {name: "AI執事を作成"})
    ).toBeVisible();
  });

  test("キャンセルボタンでモーダルが閉じる", async ({page}) => {
    await page.goto("/butlers");
    await page.getByRole("button", {name: /新規作成/}).click();
    await page.getByRole("button", {name: "キャンセル"}).click();
    await expect(
      page.getByRole("heading", {name: "AI執事を作成"})
    ).not.toBeVisible();
  });

  test("名前が空のとき作成ボタンが無効", async ({page}) => {
    await page.goto("/butlers");
    await page.getByRole("button", {name: /新規作成/}).click();
    const submitBtn = page.getByRole("button", {name: "作成", exact: true});
    await expect(submitBtn).toBeDisabled();
  });

  test("フォームを送信するとAI執事が追加される", async ({page}) => {
    await page.goto("/butlers");
    await page.getByRole("button", {name: /新規作成/}).click();
    await page.getByPlaceholder("例: テクノロジーニュース").fill("新しい執事");
    await page.getByRole("button", {name: "作成", exact: true}).click();
    await expect(
      page.getByRole("heading", {name: "AI執事を作成"})
    ).not.toBeVisible();
    await expect(page.getByText("新しい執事")).toBeVisible();
  });
});

// ── タブナビゲーション ────────────────────────────────────────────────────────

test.describe("タブナビゲーション", () => {
  test("「AI執事」タブでバトラー一覧に遷移", async ({page}) => {
    await page.goto("/reports");
    const butlerLink = page.getByRole("link", {name: "AI執事"}).first();
    await butlerLink.click();
    await expect(page).toHaveURL(/\/butlers/);
    await expect(
      page.getByRole("heading", {name: "AI執事"})
    ).toBeVisible();
  });

  test("「新着」タブでレポート一覧に遷移", async ({page}) => {
    await page.goto("/butlers");
    const reportsLink = page.getByRole("link", {name: "新着"}).first();
    await reportsLink.click();
    await expect(page).toHaveURL(/\/reports/);
  });
});

// ── AI執事詳細 ────────────────────────────────────────────────────────────────

test.describe("AI執事詳細", () => {
  test("カードクリックで詳細ページに遷移", async ({page}) => {
    await page.goto("/butlers");
    await page
      .getByRole("link", {name: /テクノロジーウォッチャー/})
      .first()
      .click();
    await expect(page).toHaveURL(/\/butlers\/mock-1/);
  });
});
