import { test, expect } from "@playwright/test";

const DOCTOR_EMAIL = process.env.E2E_DOCTOR_EMAIL || "doctor@clinic.com";
const DOCTOR_PASSWORD = process.env.E2E_DOCTOR_PASSWORD || "Password123!";

test.describe("E2E: Clinical Visits & Addenda Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Log in as treating doctor
    await page.goto("/login");
    await page.fill('input[type="email"]', DOCTOR_EMAIL);
    await page.fill('input[type="password"]', DOCTOR_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/(dashboard|appointments)/);
  });

  test("treating doctor can access their patients and view visits tab", async ({ page }) => {
    await page.goto("/patients");

    // Doctor sees scoped patients
    await expect(page.locator("h1")).toContainText(/patients/i);

    // Click first patient in list
    const firstPatientLink = page.locator('table tbody tr td a[href^="/patients/"]').first();
    if (await firstPatientLink.isVisible()) {
      await firstPatientLink.click();
      await expect(page).toHaveURL(/\/patients\/[a-zA-Z0-9_-]+/);

      // Verify Visits tab is visible for treating doctor
      const visitsTab = page.getByRole("tab", { name: /clinical visits/i });
      await expect(visitsTab).toBeVisible();
    }
  });
});

