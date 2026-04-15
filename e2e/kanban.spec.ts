import { test, expect } from '@playwright/test';

test.describe('Kanban Board E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the kanban board', async ({ page }) => {
    await expect(page).toHaveTitle(/Kanban/i);
    await expect(page.getByText(/Elite Teams/i)).toBeVisible();
  });

  test('should allow creating a new task', async ({ page }) => {
    // Find "Add Card" button in the first column
    const addCardBtn = page.getByRole('button', { name: /Add Card/i }).first();
    await addCardBtn.click();

    // Fill in task details
    await page.getByPlaceholder(/Task Title/i).fill('E2E Test Task');
    await page.getByPlaceholder(/Task Description/i).fill('Created by Playwright');

    // Click Create
    await page.getByRole('button', { name: /Create Task/i }).click();

    // Verify task appears
    await expect(page.getByText('E2E Test Task')).toBeVisible();
  });

  test('should switch theme', async ({ page }) => {
    // Let's try to find it by text if it has any, or by icon
    const settingsButton = page.locator('button:has(svg.lucide-settings), button:has-text("Settings")').first();
    await settingsButton.click();

    const lightBtn = page.getByRole('button', { name: /Light/i });
    await lightBtn.click();

    await expect(lightBtn).toHaveClass(/btn-primary/);
  });

  test('should allow adding a new column', async ({ page }) => {
    const addColumnBtn = page.getByRole('button', { name: /Add Column/i });
    await addColumnBtn.click();

    await page.getByPlaceholder(/Column Name/i).fill('New E2E Column');
    await page.keyboard.press('Enter');

    await expect(page.getByText('New E2E Column')).toBeVisible();
  });
});
