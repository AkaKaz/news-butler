import {test, expect} from "@playwright/test";

test("top page screenshot", async ({page}) => {
  await page.goto("/");
  await expect(page).toHaveScreenshot("top-page.png", {fullPage: true});
});
