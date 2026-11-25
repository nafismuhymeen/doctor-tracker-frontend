import { expect, type Page } from "@playwright/test";

export const E2E_CREDENTIALS = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || "admin@clinic.com",
    password: process.env.E2E_ADMIN_PASSWORD || "Password123!",
  },
  staff: {
    email: process.env.E2E_STAFF_EMAIL || "staff@clinic.com",
    password: process.env.E2E_STAFF_PASSWORD || "Password123!",
  },
  doctor: {
    email: process.env.E2E_DOCTOR_EMAIL || "doctor@clinic.com",
    password: process.env.E2E_DOCTOR_PASSWORD || "Password123!",
  },
  viewer: {
    email: process.env.E2E_VIEWER_EMAIL || "viewer@clinic.com",
    password: process.env.E2E_VIEWER_PASSWORD || "Password123!",
  },
} as const;

export type Role = keyof typeof E2E_CREDENTIALS;

export async function loginAs(page: Page, role: Role): Promise<void> {
  const { email, password } = E2E_CREDENTIALS[role];
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/(dashboard|appointments)/);
}
