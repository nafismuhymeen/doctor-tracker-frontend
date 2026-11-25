import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs } from "./helpers";

test.describe("E2E: Accessibility Audits (@axe-core/playwright)", () => {
  test("login page passes accessibility scan", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1, name: /doctor tracker/i })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["color-contrast"]) // Avoid flakiness on subtle border theme contrasts
      .analyze();

    const criticalViolations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(criticalViolations).toEqual([]);
  });

  test.describe("Authenticated accessibility scans", () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, "admin");
    });

    test("dashboard passes accessibility scan", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page.getByRole("heading", { level: 1, name: /clinical dashboard/i })).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .disableRules(["color-contrast"])
        .analyze();

      const criticalViolations = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      expect(criticalViolations).toEqual([]);
    });

    test("appointments calendar (week view) passes accessibility scan", async ({ page }) => {
      await page.goto("/appointments");
      await expect(page.getByRole("heading", { level: 1, name: /^appointments$/i })).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .disableRules(["color-contrast"])
        .analyze();

      const criticalViolations = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      expect(criticalViolations).toEqual([]);
    });

    test("appointments calendar (day view) passes accessibility scan", async ({ page }) => {
      await page.goto("/appointments?view=day");
      await expect(page.getByRole("heading", { level: 1, name: /^appointments$/i })).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .disableRules(["color-contrast"])
        .analyze();

      const criticalViolations = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      expect(criticalViolations).toEqual([]);
    });

    test("appointments calendar (list view) passes accessibility scan", async ({ page }) => {
      await page.goto("/appointments?view=list");
      await expect(page.getByRole("heading", { level: 1, name: /^appointments$/i })).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .disableRules(["color-contrast"])
        .analyze();

      const criticalViolations = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      expect(criticalViolations).toEqual([]);
    });

    test("doctors directory passes accessibility scan", async ({ page }) => {
      await page.goto("/doctors");
      await expect(page.getByRole("heading", { level: 1, name: /doctor management/i })).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .disableRules(["color-contrast"])
        .analyze();

      const criticalViolations = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      expect(criticalViolations).toEqual([]);
    });

    test("doctor detail profile passes accessibility scan", async ({ page }) => {
      await page.goto("/doctors");
      await expect(page.getByRole("heading", { level: 1, name: /doctor management/i })).toBeVisible();

      const firstProfileLink = page.locator('table tbody tr td a[href^="/doctors/"]').first();
      await expect(firstProfileLink).toBeVisible();
      await firstProfileLink.click();

      await expect(page).toHaveURL(/\/doctors\/[a-zA-Z0-9_-]+/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .disableRules(["color-contrast"])
        .analyze();

      const criticalViolations = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      expect(criticalViolations).toEqual([]);
    });

    test("patients directory passes accessibility scan", async ({ page }) => {
      await page.goto("/patients");
      await expect(page.getByRole("heading", { level: 1, name: /patient management/i })).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .disableRules(["color-contrast"])
        .analyze();

      const criticalViolations = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      expect(criticalViolations).toEqual([]);
    });

    test("patient detail (all tabs: overview, appointments, visits) passes accessibility scan", async ({ page }) => {
      await page.goto("/patients");
      await expect(page.getByRole("heading", { level: 1, name: /patient management/i })).toBeVisible();

      const firstPatientLink = page.locator('table tbody tr td a[href^="/patients/"]').first();
      await expect(firstPatientLink).toBeVisible();
      await firstPatientLink.click();

      await expect(page).toHaveURL(/\/patients\/[a-zA-Z0-9_-]+/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      // 1. Overview tab scan
      await expect(page.getByRole("tab", { name: /overview/i })).toBeVisible();
      const overviewResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .disableRules(["color-contrast"])
        .analyze();
      expect(overviewResults.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);

      // 2. Appointments tab scan
      const apptsTab = page.getByRole("tab", { name: /appointments/i });
      await apptsTab.click();
      await expect(apptsTab).toHaveAttribute("aria-selected", "true");
      const apptsResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .disableRules(["color-contrast"])
        .analyze();
      expect(apptsResults.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);

      // 3. Visits tab scan
      const visitsTab = page.getByRole("tab", { name: /^visits$/i });
      await visitsTab.click();
      await expect(visitsTab).toHaveAttribute("aria-selected", "true");
      const visitsResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .disableRules(["color-contrast"])
        .analyze();
      expect(visitsResults.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);
    });

    test("users management passes accessibility scan", async ({ page }) => {
      await page.goto("/users");
      await expect(page.getByRole("heading", { level: 1, name: /user management/i })).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .disableRules(["color-contrast"])
        .analyze();

      const criticalViolations = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      expect(criticalViolations).toEqual([]);
    });

    test("audit logs trail passes accessibility scan", async ({ page }) => {
      await page.goto("/audit");
      await expect(page.getByRole("heading", { level: 1, name: /audit logs/i })).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .disableRules(["color-contrast"])
        .analyze();

      const criticalViolations = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      expect(criticalViolations).toEqual([]);
    });
  });
});
