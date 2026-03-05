import {test} from "@playwright/test";
import path from "path";
import fs from "fs";

const snapshotDir = path.join(__dirname, "snapshots-actual");

test.beforeAll(() => {
  fs.mkdirSync(snapshotDir, {recursive: true});
});

test("top page screenshot", async ({page}) => {
  await page.goto("/");
  await page.screenshot({
    path: path.join(snapshotDir, "top-page.png"),
    fullPage: true,
  });
});
