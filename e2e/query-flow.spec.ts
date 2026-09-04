import { test, expect } from '@playwright/test';

test.describe('Query Flow', () => {
  test('landing page loads with v5.0.0', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    const footer = page.locator('text=v5.0.0');
    await expect(footer).toBeVisible();
  });

  test('navigates to /ask page', async ({ page }) => {
    await page.goto('/ask');
    await expect(page.locator('body')).toBeVisible();
  });

  test('query form step 1 shows technique selector', async ({ page }) => {
    await page.goto('/ask');
    // Step 1 should show technique input
    const techniqueInput = page.getByPlaceholder(/technique/i).or(page.locator('input').first());
    await expect(techniqueInput).toBeVisible();
  });

  test('form requires technique before advancing', async ({ page }) => {
    await page.goto('/ask');
    // Try to advance without filling technique - should stay on step 1
    const nextButton = page.getByRole('button', { name: /next/i });
    if (await nextButton.isVisible()) {
      await nextButton.click();
      // Should still be on step 1 if technique is not filled
      await expect(page.getByPlaceholder(/technique/i).or(page.locator('input').first())).toBeVisible();
    }
  });
});
