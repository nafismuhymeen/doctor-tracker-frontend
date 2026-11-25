import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("E2E: Clinical Visits & Addenda Workflow", () => {
  test("doctor records a visit for an assigned patient, then adds an append-only addendum", async ({ page }) => {
    const uniqueId = Date.now();
    const chiefComplaintText = `Routine evaluation ${uniqueId}`;
    const diagnosisText = `Hypertension stage 1 controlled ${uniqueId}`;
    const notesText = `Patient presents with no acute symptoms. Regular blood pressure monitoring advised. Ref: ${uniqueId}`;
    const addendumText = `Supplemental clinical addendum noted on ${uniqueId}. Lab tests confirmed normal.`;

    // 1. Log in as treating doctor (doctor@clinic.com is linked to Dr. Sarah Johnson)
    await loginAs(page, "doctor");
    await expect(page).toHaveURL(/\/(dashboard|appointments)/);

    // 2. Navigate to Patients directory to view Dr. Sarah Johnson's assigned patient (John Davis)
    await page.goto("/patients");
    await expect(page.getByRole("heading", { level: 1, name: /patient management/i })).toBeVisible();

    // 3. Open seeded patient John Davis (assigned to Dr. Sarah Johnson)
    const patientLink = page.getByRole("link", { name: /John Davis/i });
    await expect(patientLink).toBeVisible();
    await patientLink.click();

    await expect(page).toHaveURL(/\/patients\/[a-zA-Z0-9_-]+/);
    await expect(page.getByRole("heading", { level: 1, name: /John Davis/i })).toBeVisible();

    // 4. Switch to Visits tab
    const visitsTab = page.getByRole("tab", { name: /^visits$/i });
    await expect(visitsTab).toBeVisible();
    await visitsTab.click();

    // 5. Click "Record Visit"
    const recordVisitBtn = page.getByRole("button", { name: /record visit/i });
    await expect(recordVisitBtn).toBeVisible();
    await recordVisitBtn.click();

    // 6. Fill out Record Clinical Visit form
    await expect(page.getByRole("dialog")).toBeVisible();
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

    // 9. Assert that the visit card is displayed in the timeline
    await expect(page.getByText(chiefComplaintText)).toBeVisible();

    // 10. Click "Add Addendum" on the newly created visit card
    const addAddendumBtn = page.getByRole("button", { name: /add addendum/i }).first();
    await expect(addAddendumBtn).toBeVisible();
    await addAddendumBtn.click();

    // 11. Fill out Add Addendum form
    await expect(page.getByRole("heading", { name: /add clinical addendum/i })).toBeVisible();
    await page.fill("textarea#addendum-text", addendumText);

    // 12. Save Addendum
    const saveAddendumBtn = page.getByRole("button", { name: /save addendum/i });
    await expect(saveAddendumBtn).toBeVisible();
    await saveAddendumBtn.click();

    // 13. Verify toast and that addendum is permanently rendered on the visit card
    await expect(page.getByText(/addendum added/i)).toBeVisible();
    await expect(page.getByText(addendumText)).toBeVisible();
  });
});
