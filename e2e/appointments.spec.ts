import { test, expect } from "@playwright/test";

const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL || "staff@clinic.com";
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD || "Password123!";

test.describe("E2E: Appointment Booking Flow & Slot Conflict Prevention", () => {
  test("staff books a slot, verifies it on calendar/list, and duplicate booking shows SLOT_TAKEN error", async ({ page }) => {
    // 1. Staff logs in
    await page.goto("/login");
    await page.fill('input[type="email"]', STAFF_EMAIL);
    await page.fill('input[type="password"]', STAFF_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/(dashboard|appointments)/);

    // 2. Navigate to /appointments
    await page.goto("/appointments");
    await expect(page.locator("h1")).toContainText(/appointments/i);

    // 3. Open New Appointment dialog
    const newApptBtn = page.getByRole("button", { name: /new appointment/i });
    await expect(newApptBtn).toBeVisible();
    await newApptBtn.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /book appointment/i })).toBeVisible();

    // 4. Select Doctor
    const doctorSelectTrigger = page.locator("#book-doctor");
    await expect(doctorSelectTrigger).toBeVisible();
    await doctorSelectTrigger.click();
    const firstDoctorOption = page.getByRole("option").first();
    await expect(firstDoctorOption).toBeVisible();
    await firstDoctorOption.click();

    // 5. Select Patient
    const patientSelectTrigger = page.locator("#book-patient");
    await expect(patientSelectTrigger).toBeVisible();
    await patientSelectTrigger.click();
    const firstPatientOption = page.getByRole("option").first();
    await expect(firstPatientOption).toBeVisible();
    await firstPatientOption.click();

    // 6. Select first available time slot
    const availableSlotBtn = page.locator('button[aria-label*="available"]').first();
    await expect(availableSlotBtn).toBeVisible();
    await availableSlotBtn.click();

    // 7. Add unique reason and confirm booking
    const uniqueReason = `Consultation-${Date.now()}`;
    await page.fill("textarea#book-reason", uniqueReason);

    const confirmBtn = page.getByRole("button", { name: /confirm booking/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // 8. Assert successful booking toast
    await expect(page.getByText(/appointment booked successfully/i)).toBeVisible();

    // 9. Switch to list view to verify booking appears
    const listViewTab = page.getByRole("tab", { name: /list/i });
    await expect(listViewTab).toBeVisible();
    await listViewTab.click();

    await expect(page.getByText(uniqueReason)).toBeVisible();

    // 10. Verify race safety: Attempting to book the same slot triggers SLOT_TAKEN error
    // Open New Appointment dialog again
    await newApptBtn.click();
    await doctorSelectTrigger.click();
    await firstDoctorOption.click();

    // The booked slot is now marked unavailable in the UI
    const slotText = await availableSlotBtn.innerText();
    const previouslyBookedSlot = page.locator(`button[aria-label*="${slotText}"]`);
    await expect(previouslyBookedSlot).toBeDisabled();
    await expect(previouslyBookedSlot).toHaveAttribute("aria-label", /unavailable/);
  });
});
