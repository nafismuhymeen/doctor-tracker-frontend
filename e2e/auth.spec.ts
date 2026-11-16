import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@clinic.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "Password123!";
const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL || "staff@clinic.com";
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD || "Password123!";
const DOCTOR_EMAIL = process.env.E2E_DOCTOR_EMAIL || "doctor@clinic.com";
const DOCTOR_PASSWORD = process.env.E2E_DOCTOR_PASSWORD || "Password123!";
const VIEWER_EMAIL = process.env.E2E_VIEWER_EMAIL || "viewer@clinic.com";
const VIEWER_PASSWORD = process.env.E2E_VIEWER_PASSWORD || "Password123!";

test.describe("E2E: Authentication & Session Lifecycle", () => {
  test("allows admin to log in, navigate, and log out", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("h1")).toContainText(/dashboard/i);

    // Admin sees admin navigation items
    await expect(page.getByRole("link", { name: /audit logs/i })).toBeVisible();

    // Sign out
    await page.getByRole("button", { name: /clinic admin/i }).click();
    await page.getByRole("menuitem", { name: /sign out$/i }).click();

    await expect(page).toHaveURL(/\/login/);
  });

  test("doctor and staff land on operational dashboards with role-scoped navigation", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', DOCTOR_EMAIL);
    await page.fill('input[type="password"]', DOCTOR_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/(appointments|dashboard)/);
    await expect(page.getByRole("link", { name: /audit logs/i })).not.toBeVisible();

    // Switch to staff
    await page.goto("/login");
    await page.fill('input[type="email"]', STAFF_EMAIL);
    await page.fill('input[type="password"]', STAFF_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/(dashboard|appointments)/);
    await expect(page.getByRole("link", { name: /appointments/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /audit logs/i })).not.toBeVisible();

    // Switch to viewer
    await page.goto("/login");
    await page.fill('input[type="email"]', VIEWER_EMAIL);
    await page.fill('input[type="password"]', VIEWER_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("link", { name: /audit logs/i })).not.toBeVisible();
  });

  test("session survives access-token expiry via transparent cookie refresh", async ({ page }) => {
    // 1. Staff logs in
    await page.goto("/login");
    await page.fill('input[type="email"]', STAFF_EMAIL);
    await page.fill('input[type="password"]', STAFF_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/(dashboard|appointments)/);

    // 2. Clear only the access token cookie to simulate access-token expiry
    // The refresh token cookie remains in the browser jar.
    await page.context().clearCookies({ name: "accessToken" });

    // 3. Navigate to an authenticated page (/doctors)
    // The frontend receives a 401 on /api/v1/doctors, calls /api/v1/auth/refresh,
    // receives new tokens, and retries the request without redirecting to /login.
    await page.goto("/doctors");

    await expect(page).toHaveURL(/\/doctors/);
    await expect(page.locator("h1")).toContainText(/practitioners|doctors/i);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("rejects invalid login credentials without revealing account existence", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[type="email"]', "nonexistent.user@clinic.com");
    await page.fill('input[type="password"]', "WrongPassword123!");
    await page.click('button[type="submit"]');

    await expect(page.getByText(/incorrect email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
