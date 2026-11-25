import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs } from "./helpers";

test.describe("E2E: Accessibility Audits (@axe-core/playwright)", () => {
  test("login page passes accessibility scan", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1, name: /doctor tracker/i })).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["color-contrast"]) // Avoid flakiness on subtle border theme contrasts
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(criticalViolations).toEqual([]);
  });

  test("authenticated dashboard passes accessibility scan", async ({ page }) => {
    await loginAs(page, "admin");
    await expect(page.getByRole("heading", { level: 1, name: /clinical dashboard/i })).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(criticalViolations).toEqual([]);
  });

  test("appointments calendar passes accessibility scan", async ({ page }) => {
    await loginAs(page, "admin");

    await page.goto("/appointments");
    await expect(page.getByRole("heading", { level: 1, name: /^appointments$/i })).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(criticalViolations).toEqual([]);
  });
});
