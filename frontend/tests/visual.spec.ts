import {test} from "@playwright/test";
import path from "path";
import fs from "fs";

test("top page screenshot", async ({page}) => {
  await page.goto("/");
  const screenshotDir = path.join(process.cwd(), "test-results/screenshots");
  fs.mkdirSync(screenshotDir, {recursive: true});
  await page.screenshot({
    path: path.join(screenshotDir, "top-page.png"),
    fullPage: true,
  });
});
