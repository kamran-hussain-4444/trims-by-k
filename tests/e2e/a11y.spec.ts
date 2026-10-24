import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Automated accessibility scan: fails on "serious" or "critical" issues (e.g. unreadable
// contrast, buttons with no name, missing form labels).
for (const path of ["/", "/book", "/chat", "/admin/login"]) {
  test(`accessibility: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("load");
    const { violations } = await new AxeBuilder({ page }).analyze();
    const bad = violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id} (${v.nodes.length}x): ${v.help} -> ${v.nodes[0]?.target.join(" ")}`);
    expect(bad).toEqual([]);
  });
}
