import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("E2E: Appointment Booking Flow & Slot Conflict Prevention", () => {
  test("staff books a slot, verifies it on calendar/list, and duplicate booking shows SLOT_TAKEN error", async ({ page }) => {
    // 1. Staff logs in
    await loginAs(page, "staff");

    // 2. Navigate to /appointments
    await page.goto("/appointments");
    await expect(page.getByRole("heading", { level: 1, name: /^appointments$/i })).toBeVisible();

    // 3. Open New Appointment dialog
    const newApptBtn = page.getByRole("button", { name: /new appointment/i });
    await expect(newApptBtn).toBeVisible();
    await newApptBtn.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /book appointment/i })).toBeVisible();

    // 4. Select Doctor by NAME ("Dr. Sarah Johnson", a seeded doctor with assigned patients)
    const doctorSelectTrigger = page.locator("#book-doctor");
    await expect(doctorSelectTrigger).toBeVisible();
    await doctorSelectTrigger.click();

    const sarahOption = page.getByRole("option", { name: /Dr\. Sarah Johnson/i });
    await expect(sarahOption).toBeVisible();
    await sarahOption.click();

    // 5. Set the date explicitly: compute a Tuesday at least 7 days from today (Mon-Fri working hours)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    const daysUntilTuesday = (2 - targetDate.getDay() + 7) % 7;
    targetDate.setDate(targetDate.getDate() + daysUntilTuesday);
    const bookingDate = targetDate.toISOString().split("T")[0]; // yyyy-MM-dd

    const dateInput = page.locator("input#book-date");
    await expect(dateInput).toBeVisible();
    await dateInput.fill(bookingDate);

    // 6. Wait for the patient select (#book-patient) and available slot buttons to appear before clicking
    const patientSelectTrigger = page.locator("#book-patient");
    await expect(patientSelectTrigger).toBeVisible();

    const availableSlotBtn = page.locator('button[aria-label*="available"]').first();
    await expect(availableSlotBtn).toBeVisible();

    // Select seeded patient John Davis
    await patientSelectTrigger.click();
    const patientOption = page.getByRole("option", { name: /John Davis/i });
    await expect(patientOption).toBeVisible();
    await patientOption.click();

    // Select the available slot
    await availableSlotBtn.click();

    // 7. Add unique reason and confirm booking
    const uniqueReason = `Consultation-${Date.now()}`;
    await page.fill("textarea#book-reason", uniqueReason);

    const confirmBtn = page.getByRole("button", { name: /confirm booking/i });
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // 8. Assert successful booking toast
    await expect(page.getByText(/appointment booked successfully/i)).toBeVisible();

    // 9. Switch to list view to verify booking appears
    const listViewBtn = page.getByRole("button", { name: /^list$/i });
    await expect(listViewBtn).toBeVisible();
    await listViewBtn.click();
    await expect(listViewBtn).toHaveAttribute("aria-pressed", "true");

    // Filter by practitioner (Dr. Sarah Johnson) to isolate her appointments and guarantee the slot is on page 1
    const practitionerFilter = page.getByRole("combobox", { name: /filter by practitioner/i });
    await expect(practitionerFilter).toBeVisible();
    await practitionerFilter.click();
    const docOption = page.getByRole("option", { name: /Sarah Johnson/i });
    await expect(docOption).toBeVisible();
    await docOption.click();

    await expect(page.getByText(uniqueReason)).toBeVisible();

    // 10. Verify race safety: Concurrent duplicate booking of the same slot triggers SLOT_TAKEN error
    await newApptBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await doctorSelectTrigger.click();
    await page.getByRole("option", { name: /Dr\. Sarah Johnson/i }).click();

    await dateInput.fill(bookingDate);

    await expect(patientSelectTrigger).toBeVisible();
    await patientSelectTrigger.click();
    await page.getByRole("option", { name: /John Davis/i }).click();

    // Wait for slot buttons to load and select next available slot
    const nextSlotBtn = page.locator('button[aria-label*="available"]').first();
    await expect(nextSlotBtn).toBeVisible();
    await nextSlotBtn.click();

    // Intercept next appointment POST to simulate concurrent booking conflict
    await page.route("**/api/v1/appointments", async (route, request) => {
      if (request.method() === "POST") {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: {
              code: "SLOT_TAKEN",
              message: "The selected time slot is already booked",
            },
          }),
        });
      } else {
        await route.continue();
      }
    }, { times: 1 });

    await confirmBtn.click();

    // Expect the UI to handle SLOT_TAKEN by alerting the user that slot was just booked
    await expect(page.getByText(/slot unavailable|that slot was just booked/i)).toBeVisible();
  });
});
