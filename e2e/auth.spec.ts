import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("E2E: Authentication & Session Lifecycle", () => {
  test("allows admin to log in, navigate, and log out", async ({ page }) => {
    await loginAs(page, "admin");

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { level: 1, name: /clinical dashboard/i })).toBeVisible();

    // Admin sees admin navigation items
    await expect(page.getByRole("link", { name: /audit logs/i })).toBeVisible();

    // Sign out via header menu
    const profileDropdown = page.locator("header").getByRole("button").filter({ hasText: /admin/i });
    await expect(profileDropdown).toBeVisible();
    await profileDropdown.click();

    const signOutBtn = page.getByRole("menuitem", { name: /sign out$/i });
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { level: 1, name: /doctor tracker/i })).toBeVisible();
  });

  test("doctor and staff land on operational dashboards with role-scoped navigation", async ({ page }) => {
    // 1. Doctor login
    await loginAs(page, "doctor");
    await expect(page).toHaveURL(/\/(appointments|dashboard)/);
    await expect(page.getByRole("link", { name: /audit logs/i })).not.toBeVisible();

    // Sign out
    const docProfileDropdown = page.locator("header").getByRole("button").filter({ hasText: /doctor/i });
    await docProfileDropdown.click();
    await page.getByRole("menuitem", { name: /sign out$/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // 2. Staff login
    await loginAs(page, "staff");
    await expect(page).toHaveURL(/\/(dashboard|appointments)/);
    await expect(page.getByRole("link", { name: /appointments/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /audit logs/i })).not.toBeVisible();

    // Sign out
    const staffProfileDropdown = page.locator("header").getByRole("button").filter({ hasText: /staff/i });
    await staffProfileDropdown.click();
    await page.getByRole("menuitem", { name: /sign out$/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // 3. Viewer login
    await loginAs(page, "viewer");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { level: 1, name: /clinical dashboard/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /audit logs/i })).not.toBeVisible();
  });

  test("session survives access-token expiry via transparent cookie refresh", async ({ page }) => {
    // 1. Staff logs in
    await loginAs(page, "staff");
    await expect(page).toHaveURL(/\/(dashboard|appointments)/);

    // 2. Clear only the access token cookie to simulate access-token expiry.
    // The refresh token cookie remains in the browser cookie jar.
    await page.context().clearCookies({ name: "accessToken" });

    // 3. Navigate to an authenticated page (/doctors).
    // The frontend receives a 401 on /api/v1/doctors, calls /api/v1/auth/refresh,
    // receives new tokens, and retries the request without redirecting to /login.
    await page.goto("/doctors");

    await expect(page).toHaveURL(/\/doctors/);
    await expect(page.getByRole("heading", { level: 1, name: /doctor management/i })).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("rejects invalid login credentials without revealing account existence", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[type="email"]', "nonexistent.user@clinic.com");
    await page.fill('input[type="password"]', "WrongPassword123!");
    await page.click('button[type="submit"]');

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
