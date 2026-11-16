import { test, expect } from "@playwright/test";

const VIEWER_EMAIL = process.env.E2E_VIEWER_EMAIL || "viewer@clinic.com";
const VIEWER_PASSWORD = process.env.E2E_VIEWER_PASSWORD || "Password123!";
const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL || "staff@clinic.com";
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD || "Password123!";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@clinic.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "Password123!";

test.describe("E2E: Role Restrictions and Audit Trail Integrity", () => {
  test("staff role is forbidden from accessing /audit", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', STAFF_EMAIL);
    await page.fill('input[type="password"]', STAFF_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/(dashboard|appointments)/);

    // Attempt direct URL to /audit
    await page.goto("/audit");
    await expect(page.getByText(/access denied/i)).toBeVisible();
    await expect(page.getByText(/system security trail/i)).not.toBeVisible();
  });

  test("viewer role cannot see write controls or mutating buttons", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', VIEWER_EMAIL);
    await page.fill('input[type="password"]', VIEWER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // On doctors page, no "Add Doctor" button
    await page.goto("/doctors");
    await expect(page.getByRole("button", { name: /add practitioner/i })).not.toBeVisible();

    // On patients page, no "Add Patient" button
    await page.goto("/patients");
    await expect(page.getByRole("button", { name: /add patient/i })).not.toBeVisible();
  });

  test("admin role can access /audit and view log events", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/audit");
    await expect(page.locator("h1")).toContainText(/audit logs/i);
    await expect(page.getByText(/append-only/i)).toBeVisible();

    // Presets are clickable
    const failedLoginsBtn = page.getByRole("button", { name: /failed logins/i });
    await expect(failedLoginsBtn).toBeVisible();
  });
});
