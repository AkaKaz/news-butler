import {test} from "@playwright/test";
import fs from "fs";

const snapshotDir = "tests/snapshots-actual";

test.beforeAll(() => {
  fs.mkdirSync(snapshotDir, {recursive: true});
});

/** ローディングスピナーが消えるまで待つ（スピナーがない画面は即通過） */
async function waitForContent(page: import("@playwright/test").Page) {
  await page.waitForFunction(
    () => document.querySelectorAll(".loading-spinner").length === 0,
    {timeout: 5000},
  );
}

const pages = [
  {name: "reports",          path: "/reports"},
  {name: "butlers",          path: "/butlers"},
  {name: "report-detail",    path: "/reports/rep-1"},
  {name: "butler-detail",    path: "/butlers/mock-1"},
  {name: "butler-sources",   path: "/butlers/mock-1/sources"},
  {name: "butler-reports",   path: "/butlers/mock-1/reports"},
];

for (const {name, path} of pages) {
  test(`${name} screenshot`, async ({page}, testInfo) => {
    await page.goto(path);
    await waitForContent(page);
    await page.screenshot({
      path: `${snapshotDir}/${name}-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });
}

// モーダル系スクリーンショット
test("butler-create-modal screenshot", async ({page}, testInfo) => {
  await page.goto("/butlers");
  await waitForContent(page);
  await page.click('button:has-text("新規作成")');
  await page.waitForSelector('[aria-label="AI執事を作成"]', {state: "visible"});
  await page.screenshot({
    path: `${snapshotDir}/butler-create-modal-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("butler-delete-modal screenshot", async ({page}, testInfo) => {
  await page.goto("/butlers/mock-1");
  await waitForContent(page);
  await page.getByRole("button", {name: "削除"}).click();
  await page.waitForSelector('[role="dialog"][aria-label="AI執事を削除"]', {state: "visible"});
  await page.screenshot({
    path: `${snapshotDir}/butler-delete-modal-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("butler-edit-modal screenshot", async ({page}, testInfo) => {
  await page.goto("/butlers/mock-1");
  await waitForContent(page);
  await page.click('[aria-label="編集"]');
  await page.waitForSelector('[aria-label="AI執事を編集"]', {state: "visible"});
  await page.screenshot({
    path: `${snapshotDir}/butler-edit-modal-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("source-add-modal screenshot", async ({page}, testInfo) => {
  await page.goto("/butlers/mock-1/sources");
  await waitForContent(page);
  await page.click('[aria-label="ニュースソースを追加"]');
  await page.waitForSelector('[role="dialog"][aria-label="ニュースソースを追加"]', {state: "visible"});
  await page.screenshot({
    path: `${snapshotDir}/source-add-modal-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("source-edit-modal screenshot", async ({page}, testInfo) => {
  await page.goto("/butlers/mock-1/sources");
  await waitForContent(page);
  await page.getByRole("button", {name: "編集"}).first().click();
  await page.waitForSelector('[role="dialog"][aria-label="ニュースソースを編集"]', {state: "visible"});
  await page.screenshot({
    path: `${snapshotDir}/source-edit-modal-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("report-config-add-modal screenshot", async ({page}, testInfo) => {
  await page.goto("/butlers/mock-1/reports");
  await waitForContent(page);
  await page.click('[aria-label="レポート設定を追加"]');
  await page.waitForSelector('[role="dialog"][aria-label="レポート設定を追加"]', {state: "visible"});
  await page.screenshot({
    path: `${snapshotDir}/report-config-add-modal-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("report-config-edit-modal screenshot", async ({page}, testInfo) => {
  await page.goto("/butlers/mock-1/reports");
  await waitForContent(page);
  await page.getByRole("button", {name: "編集"}).first().click();
  await page.waitForSelector('[role="dialog"][aria-label="レポート設定を編集"]', {state: "visible"});
  await page.screenshot({
    path: `${snapshotDir}/report-config-edit-modal-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
