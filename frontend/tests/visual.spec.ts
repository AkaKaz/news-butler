import {test} from "@playwright/test";
import fs from "fs";

const snapshotDir = "tests/snapshots-actual";

test.beforeAll(() => {
  fs.mkdirSync(snapshotDir, {recursive: true});
});

const pages = [
  {name: "reports", path: "/reports"},
  {name: "butlers", path: "/butlers"},
];

for (const {name, path} of pages) {
  test(`${name} screenshot`, async ({page}) => {
    await page.goto(path);
    await page.screenshot({
      path: `${snapshotDir}/${name}.png`,
      fullPage: true,
    });
  });
}
