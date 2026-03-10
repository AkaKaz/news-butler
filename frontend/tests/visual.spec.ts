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
  {name: "reports",        path: "/reports"},
  {name: "butlers",        path: "/butlers"},
  {name: "report-detail",  path: "/reports/rep-1"},
  {name: "butler-detail",  path: "/butlers/mock-1"},
  {name: "butler-sources", path: "/butlers/mock-1/sources"},
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
