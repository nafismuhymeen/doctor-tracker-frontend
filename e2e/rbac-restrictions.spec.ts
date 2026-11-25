import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("E2E: RBAC Permission Boundaries", () => {
  test("viewer sees no mutating write controls across directories", async ({ page }) => {
    // 1. Log in as Viewer
    await loginAs(page, "viewer");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { level: 1, name: /clinical dashboard/i })).toBeVisible();

    // 2. On /doctors: No "Add Doctor" button, seeded doctors are visible
    await page.goto("/doctors");
    await expect(page.getByRole("heading", { level: 1, name: /doctor management/i })).toBeVisible();
    await expect(page.getByText("Dr. Sarah Johnson")).toBeVisible();
    await expect(page.getByRole("button", { name: /add doctor/i })).not.toBeVisible();

    // 3. On /patients: No "Add Patient" button, seeded patients are visible
    await page.goto("/patients");
    await expect(page.getByRole("heading", { level: 1, name: /patient management/i })).toBeVisible();
    await expect(page.getByText("John Davis")).toBeVisible();
    await expect(page.getByRole("button", { name: /add patient/i })).not.toBeVisible();

    // 4. On /appointments: No "New Appointment" button
    await page.goto("/appointments");
    await expect(page.getByRole("heading", { level: 1, name: /^appointments$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /new appointment/i })).not.toBeVisible();

    // 5. On /audit: Direct access forbidden
    await page.goto("/audit");
    await expect(page.getByRole("heading", { name: /access denied/i })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: /^audit logs$/i })).not.toBeVisible();
  });

  test("staff role gets Access Denied on /audit and cannot see clinical visits", async ({ page }) => {
    // 1. Log in as Staff
    await loginAs(page, "staff");
    await expect(page).toHaveURL(/\/(dashboard|appointments)/);

    // 2. Direct navigation to /audit displays Access Denied
    await page.goto("/audit");
    await expect(page.getByRole("heading", { name: /access denied/i })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: /^audit logs$/i })).not.toBeVisible();

    // 3. Navigate to /patients and open seeded patient John Davis's profile
    await page.goto("/patients");
    await expect(page.getByRole("heading", { level: 1, name: /patient management/i })).toBeVisible();

    const patientLink = page.getByRole("link", { name: /John Davis/i });
    await expect(patientLink).toBeVisible();
    await patientLink.click();

    await expect(page).toHaveURL(/\/patients\/[a-zA-Z0-9_-]+/);
    await expect(page.getByRole("heading", { level: 1, name: /John Davis/i })).toBeVisible();

    // 4. Verify Visits tab is hidden for staff, while Overview tab is present
    await expect(page.getByRole("tab", { name: /overview/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /^visits$/i })).not.toBeVisible();
  });
});
