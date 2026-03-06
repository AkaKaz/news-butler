import {test} from "@playwright/test";
import fs from "fs";

const snapshotDir = "tests/snapshots-actual";

test.beforeAll(() => {
  fs.mkdirSync(snapshotDir, {recursive: true});
});

test("top page screenshot", async ({page}) => {
  await page.goto("/");
  await page.screenshot({
    path: `${snapshotDir}/top-page.png`,
    fullPage: true,
  });
});
