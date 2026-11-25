import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("E2E: Admin Doctor Creation & Clinical Schedule Configuration", () => {
  test("admin creates a doctor with unique credentials and sets a weekly schedule", async ({ page }) => {
    const uniqueId = Date.now();
    const doctorName = `Dr. Turing ${uniqueId}`;
    const doctorEmail = `turing.${uniqueId}@clinic.com`;
    const doctorPhone = `+1 (555) ${Math.floor(1000000 + Math.random() * 9000000)}`;

    // 1. Log in as admin
    await loginAs(page, "admin");

    // 2. Navigate to /doctors
    await page.goto("/doctors");
    await expect(page.getByRole("heading", { level: 1, name: /doctor management/i })).toBeVisible();

    // 3. Open Create Doctor Dialog
    const addDoctorBtn = page.getByRole("button", { name: /add doctor/i });
    await expect(addDoctorBtn).toBeVisible();
    await addDoctorBtn.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /add new doctor/i })).toBeVisible();

    // 4. Fill doctor registration details
    await page.fill("input#name", doctorName);
    await page.fill("input#specialization", "Endocrinology");
    await page.fill("input#hospital", "City Central Hospital");
    await page.fill("input#phone", doctorPhone);
    await page.fill("input#email", doctorEmail);

    // 5. Submit form
    await page.getByRole("button", { name: /save doctor/i }).click();

    // 6. Verify doctor appears in directory list
    const doctorRow = page.locator("tr").filter({ hasText: doctorName });
    await expect(doctorRow).toBeVisible();

    // 7. Open newly created doctor profile via action link
    const profileLink = doctorRow.getByRole("link", { name: /roster & profile/i });
    await expect(profileLink).toBeVisible();
    await profileLink.click();

    await expect(page).toHaveURL(/\/doctors\/[a-zA-Z0-9_-]+/);
    await expect(page.getByRole("heading", { level: 1, name: doctorName })).toBeVisible();

    // 8. Open Schedule Editor Dialog
    const configureScheduleBtn = page.getByRole("button", { name: /configure/i });
    await expect(configureScheduleBtn).toBeVisible();
    await configureScheduleBtn.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /edit clinical schedule/i })).toBeVisible();

    // 9. Apply the Mon–Fri 9–5 schedule preset
    const presetBtn = page.getByRole("button", { name: /Mon–Fri 9–5/i });
    await expect(presetBtn).toBeVisible();
    await presetBtn.click();

    // 10. Save the schedule
    await page.getByRole("button", { name: /save schedule/i }).click();

    // 11. Assert schedule was saved successfully
    await expect(page.getByText(/schedule updated successfully/i)).toBeVisible();
  });
});
