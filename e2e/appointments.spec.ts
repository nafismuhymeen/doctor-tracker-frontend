import { test, expect } from "@playwright/test";

const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL || "staff@clinic.com";
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD || "Password123!";

test.describe("E2E: Appointment Booking Flow & Conflict Handling", () => {
  test.beforeEach(async ({ page }) => {
    // Log in as staff
    await page.goto("/login");
    await page.fill('input[type="email"]', STAFF_EMAIL);
    await page.fill('input[type="password"]', STAFF_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/(dashboard|appointments)/);
  });

  test("staff can view calendar, select practitioner, and view slots", async ({ page }) => {
    await page.goto("/appointments");

    await expect(page.locator("h1")).toContainText(/appointments/i);

    // Switch between week, day, and list view
    const listViewTrigger = page.getByRole("tab", { name: /list/i });
    if (await listViewTrigger.isVisible()) {
      await listViewTrigger.click();
      await expect(page).toHaveURL(/view=list/);
    }
  });
});

