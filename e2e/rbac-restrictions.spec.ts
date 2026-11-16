import { test, expect } from "@playwright/test";

const VIEWER_EMAIL = process.env.E2E_VIEWER_EMAIL || "viewer@clinic.com";
const VIEWER_PASSWORD = process.env.E2E_VIEWER_PASSWORD || "Password123!";
const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL || "staff@clinic.com";
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD || "Password123!";

test.describe("E2E: RBAC Permission Boundaries", () => {
  test("viewer sees no mutating write controls across directories", async ({ page }) => {
    // 1. Log in as Viewer
    await page.goto("/login");
    await page.fill('input[type="email"]', VIEWER_EMAIL);
    await page.fill('input[type="password"]', VIEWER_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);

    // 2. On /doctors: No "Add Doctor" button
    await page.goto("/doctors");
    await expect(page.getByRole("button", { name: /add doctor/i })).not.toBeVisible();

    // 3. On /patients: No "Add Patient" button
    await page.goto("/patients");
    await expect(page.getByRole("button", { name: /add patient/i })).not.toBeVisible();

    // 4. On /appointments: No "New Appointment" button
    await page.goto("/appointments");
    await expect(page.getByRole("button", { name: /new appointment/i })).not.toBeVisible();

    // 5. On /audit: Direct access forbidden
    await page.goto("/audit");
    await expect(page.getByText(/access denied/i)).toBeVisible();
    await expect(page.getByText(/audit logs/i)).not.toBeVisible();
  });

  test("staff role gets Access Denied on /audit and cannot see clinical visits", async ({ page }) => {
    // 1. Log in as Staff
    await page.goto("/login");
    await page.fill('input[type="email"]', STAFF_EMAIL);
    await page.fill('input[type="password"]', STAFF_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/(dashboard|appointments)/);

    // 2. Direct navigation to /audit displays Access Denied
    await page.goto("/audit");
    await expect(page.getByText(/access denied/i)).toBeVisible();
    await expect(page.locator("h1")).not.toContainText(/audit logs/i);

    // 3. Navigate to /patients and open first patient profile
    await page.goto("/patients");
    await expect(page.locator("h1")).toContainText(/patients/i);

    const firstPatientLink = page.locator('table tbody tr td a[href^="/patients/"]').first();
    await expect(firstPatientLink).toBeVisible();
    await firstPatientLink.click();

    await expect(page).toHaveURL(/\/patients\/[a-zA-Z0-9_-]+/);

    // 4. Verify Visits tab is hidden for staff
    await expect(page.getByRole("tab", { name: /clinical visits/i })).not.toBeVisible();
  });
});
