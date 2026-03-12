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
    await page.getByRole("dialog", {name: "AI執事を作成"}).getByRole("button", {name: "閉じる"}).click();
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

  test("有効・無効トグルスイッチが表示される", async ({page}) => {
    await page.goto("/butlers/mock-1");
    const toggle = page.getByRole("checkbox", {name: /有効|無効/});
    await expect(toggle).toBeVisible();
    // mock-1 は isActive: true なので ON になっている
    await expect(toggle).toBeChecked();
  });

  test("戻るボタンで一覧ページに戻る", async ({page}) => {
    await page.goto("/butlers/mock-1");
    await page.getByRole("link", {name: "戻る"}).click();
    await expect(page).toHaveURL(/\/butlers$/);
  });
});

// ── ニュースソース一覧 ────────────────────────────────────────────────────────

test.describe("ニュースソース一覧", () => {
  test("ソース一覧が表示される", async ({page}) => {
    await page.goto("/butlers/mock-1/sources");
    await expect(page.getByRole("heading", {name: "ニュースソース"})).toBeVisible();
    await expect(page.getByText("TechCrunch Japan")).toBeVisible();
    await expect(page.getByText("Wired Japan")).toBeVisible();
  });

  test("ヘッダーの追加ボタンが表示される", async ({page}) => {
    await page.goto("/butlers/mock-1/sources");
    await expect(page.getByRole("button", {name: "ニュースソースを追加"})).toBeVisible();
  });

  test("ソースのURLが表示される", async ({page}) => {
    await page.goto("/butlers/mock-1/sources");
    await expect(page.getByText("https://jp.techcrunch.com/feed/")).toBeVisible();
  });
});

// ── ニュースソース 追加 ───────────────────────────────────────────────────────

test.describe("ニュースソース 追加", () => {
  test("追加ボタンでモーダルが開く", async ({page}) => {
    await page.goto("/butlers/mock-1/sources");
    await page.getByRole("button", {name: "ニュースソースを追加"}).click();
    await expect(
      page.getByRole("dialog", {name: "ニュースソースを追加"})
    ).toBeVisible();
  });

  test("閉じるボタンでモーダルが閉じる", async ({page}) => {
    await page.goto("/butlers/mock-1/sources");
    await page.getByRole("button", {name: "ニュースソースを追加"}).click();
    await page.getByRole("dialog", {name: "ニュースソースを追加"}).getByRole("button", {name: "閉じる"}).click();
    await expect(
      page.getByRole("dialog", {name: "ニュースソースを追加"})
    ).not.toBeVisible();
  });

  test("URLと名前が空のとき追加ボタンが無効", async ({page}) => {
    await page.goto("/butlers/mock-1/sources");
    await page.getByRole("button", {name: "ニュースソースを追加"}).click();
    await expect(
      page.getByRole("button", {name: "追加", exact: true})
    ).toBeDisabled();
  });

  test("フォームを送信するとソースが追加される", async ({page}) => {
    await page.goto("/butlers/mock-1/sources");
    await page.getByRole("button", {name: "ニュースソースを追加"}).click();
    await page.getByPlaceholder("https://example.com/feed").fill("https://example.com/feed");
    await page.getByPlaceholder("例: TechCrunch Japan").fill("テストソース");
    await page.getByRole("button", {name: "追加", exact: true}).click();
    await expect(
      page.getByRole("dialog", {name: "ニュースソースを追加"})
    ).not.toBeVisible();
    await expect(page.getByText("テストソース")).toBeVisible();
  });
});

// ── ニュースソース 編集 ───────────────────────────────────────────────────────

test.describe("ニュースソース 編集", () => {
  test("編集ボタンでモーダルが開き既存値が入力される", async ({page}) => {
    await page.goto("/butlers/mock-1/sources");
    await page.getByRole("button", {name: "編集"}).first().click();
    await expect(
      page.getByRole("dialog", {name: "ニュースソースを編集"})
    ).toBeVisible();
    await expect(page.getByPlaceholder("例: TechCrunch Japan")).toHaveValue("TechCrunch Japan");
  });

  test("編集モーダルを閉じると変更が破棄される", async ({page}) => {
    await page.goto("/butlers/mock-1/sources");
    await page.getByRole("button", {name: "編集"}).first().click();
    await page.getByPlaceholder("例: TechCrunch Japan").fill("変更後の名前");
    await page.getByRole("dialog", {name: "ニュースソースを編集"}).getByRole("button", {name: "閉じる"}).click();
    await expect(page.getByText("TechCrunch Japan")).toBeVisible();
    await expect(page.getByText("変更後の名前")).not.toBeVisible();
  });
});

// ── ニュースソース トグル・削除 ───────────────────────────────────────────────

test.describe("ニュースソース トグル・削除", () => {
  test("トグルで有効・無効を切り替えられる", async ({page}) => {
    await page.goto("/butlers/mock-1/sources");
    const toggle = page.getByRole("checkbox").first();
    const initialState = await toggle.isChecked();
    await toggle.click();
    await expect(toggle).not.toBeChecked();
    // もう一度クリックで元に戻る
    await toggle.click();
    await expect(toggle).toBeChecked();
    expect(initialState).toBe(true);
  });

  test("削除ボタンで確認ボタンが表示される", async ({page}) => {
    await page.goto("/butlers/mock-1/sources");
    await page.getByRole("button", {name: "削除"}).first().click();
    await expect(page.getByRole("button", {name: "削除確認"})).toBeVisible();
  });

  test("削除確認でソースが削除される", async ({page}) => {
    await page.goto("/butlers/mock-1/sources");
    await page.getByRole("button", {name: "削除"}).first().click();
    await page.getByRole("button", {name: "削除確認"}).click();
    await expect(page.getByText("TechCrunch Japan")).not.toBeVisible();
  });

  test("削除キャンセルでソースが残る", async ({page}) => {
    await page.goto("/butlers/mock-1/sources");
    await page.getByRole("button", {name: "削除"}).first().click();
    await page.getByRole("button", {name: "キャンセル"}).click();
    await expect(page.getByText("TechCrunch Japan")).toBeVisible();
  });
});
