import { test, expect } from "@playwright/test";

const DOCTOR_EMAIL = process.env.E2E_DOCTOR_EMAIL || "doctor@clinic.com";
const DOCTOR_PASSWORD = process.env.E2E_DOCTOR_PASSWORD || "Password123!";

test.describe("E2E: Clinical Visits & Addenda Workflow", () => {
  test("doctor records a visit from a past appointment, then adds an append-only addendum", async ({ page }) => {
    const uniqueId = Date.now();
    const chiefComplaintText = `Routine evaluation ${uniqueId}`;
    const diagnosisText = `Hypertension stage 1 controlled ${uniqueId}`;
    const notesText = `Patient presents with no acute symptoms. Regular blood pressure monitoring advised. Ref: ${uniqueId}`;
    const addendumText = `Supplemental clinical addendum noted on ${uniqueId}. Lab tests confirmed normal.`;

    // 1. Log in as treating doctor
    await page.goto("/login");
    await page.fill('input[type="email"]', DOCTOR_EMAIL);
    await page.fill('input[type="password"]', DOCTOR_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/(dashboard|appointments)/);

    // 2. Navigate to appointments list view
    await page.goto("/appointments?view=list");
    await expect(page.locator("h1")).toContainText(/appointments/i);

    // 3. Open details on a past appointment
    // Find appointment row and click Details
    const detailsBtn = page.getByRole("button", { name: /details/i }).first();
    await expect(detailsBtn).toBeVisible();
    await detailsBtn.click();

    // 4. Verify Appointment Details Dialog opens
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /appointment details/i })).toBeVisible();

    // 5. Click "Record Visit"
    const recordVisitBtn = page.getByRole("button", { name: /record visit/i });
    await expect(recordVisitBtn).toBeVisible();
    await recordVisitBtn.click();

    // 6. Fill out Record Clinical Visit form
    await expect(page.getByRole("heading", { name: /record clinical visit/i })).toBeVisible();
    await page.fill("input#chiefComplaint", chiefComplaintText);
    await page.fill("input#diagnosis", diagnosisText);
    await page.fill("textarea#notes", notesText);

    // 7. Save Clinical Visit
    const saveVisitBtn = page.getByRole("button", { name: /record clinical visit/i });
    await expect(saveVisitBtn).toBeVisible();
    await saveVisitBtn.click();

    // 8. Assert successful visit creation toast
    await expect(page.getByText(/visit recorded successfully/i)).toBeVisible();

    // 9. Navigate to Patients directory to view the recorded visit timeline
    await page.goto("/patients");
    await expect(page.locator("h1")).toContainText(/patients/i);

    // Click on the first patient
    const patientRowLink = page.locator('table tbody tr td a[href^="/patients/"]').first();
    await expect(patientRowLink).toBeVisible();
    await patientRowLink.click();

    await expect(page).toHaveURL(/\/patients\/[a-zA-Z0-9_-]+/);

    // 10. Switch to Clinical Visits tab
    const visitsTab = page.getByRole("tab", { name: /clinical visits/i });
    await expect(visitsTab).toBeVisible();
    await visitsTab.click();

    // 11. Assert that the visit card is displayed
    await expect(page.getByText(chiefComplaintText)).toBeVisible();

    // 12. Click "Add Addendum" on the visit card
    const addAddendumBtn = page.getByRole("button", { name: /add addendum/i }).first();
    await expect(addAddendumBtn).toBeVisible();
    await addAddendumBtn.click();

    // 13. Fill out Add Addendum form
    await expect(page.getByRole("heading", { name: /add clinical addendum/i })).toBeVisible();
    await page.fill("textarea#addendum-text", addendumText);

    // 14. Save Addendum
    const saveAddendumBtn = page.getByRole("button", { name: /save addendum/i });
    await expect(saveAddendumBtn).toBeVisible();
    await saveAddendumBtn.click();

    // 15. Verify toast and that addendum is permanently rendered on the visit card
    await expect(page.getByText(/addendum added/i)).toBeVisible();
    await expect(page.getByText(addendumText)).toBeVisible();
  });
});
