import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@clinic.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "Password123!";

test.describe("E2E: Immutable Audit Trail & Inspection", () => {
  test("admin accesses /audit, reviews system event log entries, and inspects diff details", async ({ page }) => {
    // 1. Log in as admin
    await page.goto("/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Navigate to /audit
    await page.goto("/audit");
    await expect(page.locator("h1")).toContainText(/audit logs/i);
    await expect(page.getByText(/append-only/i)).toBeVisible();

    // 3. Verify audit log table is populated with events
    const firstRowViewBtn = page.locator("table tbody tr").first().getByRole("button", { name: /view/i });
    await expect(firstRowViewBtn).toBeVisible();
    await firstRowViewBtn.click();

    // 4. Assert Audit Detail Drawer opens with event metadata
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /audit log details/i })).toBeVisible();
    await expect(page.getByText(/audit logs are immutable and append-only/i)).toBeVisible();

    // 5. Close drawer
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // 6. Test audit filter preset (e.g. Failed Logins)
    const failedLoginsPresetBtn = page.getByRole("button", { name: /failed logins/i });
    await expect(failedLoginsPresetBtn).toBeVisible();
    await failedLoginsPresetBtn.click();

    await expect(page).toHaveURL(/action=auth\.login\.failure/);
  });
});
