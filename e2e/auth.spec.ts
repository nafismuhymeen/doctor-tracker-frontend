import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@clinic.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "Password123!";
const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL || "staff@clinic.com";
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD || "Password123!";
const DOCTOR_EMAIL = process.env.E2E_DOCTOR_EMAIL || "doctor@clinic.com";
const DOCTOR_PASSWORD = process.env.E2E_DOCTOR_PASSWORD || "Password123!";
const VIEWER_EMAIL = process.env.E2E_VIEWER_EMAIL || "viewer@clinic.com";
const VIEWER_PASSWORD = process.env.E2E_VIEWER_PASSWORD || "Password123!";

test.describe("E2E: Authentication & Multi-Role Navigation", () => {
  test("allows admin to log in, navigate, and log out", async ({ page }) => {
    await page.goto("/login");

    // Fill login form
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Admin lands on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("h1")).toContainText(/dashboard/i);

    // Sidebar contains Admin items (Users and Audit Logs)
    await expect(page.getByRole("link", { name: /users/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /audit logs/i })).toBeVisible();

    // Log out via user dropdown
    await page.getByRole("button", { name: /clinic admin/i }).click();
    await page.getByRole("menuitem", { name: /sign out$/i }).click();

    // Redirected back to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("allows doctor to log in and access scheduled appointments", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[type="email"]', DOCTOR_EMAIL);
    await page.fill('input[type="password"]', DOCTOR_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/(appointments|dashboard)/);
    await expect(page.getByRole("link", { name: /users/i })).not.toBeVisible();
    await expect(page.getByRole("link", { name: /audit logs/i })).not.toBeVisible();
  });

  test("allows staff to log in and view frontdesk schedules", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[type="email"]', STAFF_EMAIL);
    await page.fill('input[type="password"]', STAFF_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/(dashboard|appointments)/);
    await expect(page.getByRole("link", { name: /appointments/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /audit logs/i })).not.toBeVisible();
  });

  test("allows viewer to log in and browse read-only directories", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[type="email"]', VIEWER_EMAIL);
    await page.fill('input[type="password"]', VIEWER_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("link", { name: /doctors/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /users/i })).not.toBeVisible();
  });

  test("rejects invalid login credentials without revealing account existence", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[type="email"]', "wrong@clinic.com");
    await page.fill('input[type="password"]', "WrongPassword123!");
    await page.click('button[type="submit"]');

    await expect(page.getByText(/incorrect email or password/i)).toBeVisible();
  });
});
