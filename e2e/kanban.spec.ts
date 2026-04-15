import { test, expect } from '@playwright/test';

test.describe('Kanban Board E2E', () => {
  test.beforeEach(async ({ page }) => {
    // In CI we use baseURL: http://localhost:8101
    // Locally for debugging it might be 5173 but I'll trust the config
    await page.goto('/');
  });

  test('should load the kanban board', async ({ page }) => {
    await expect(page).toHaveTitle(/kanbanboard/i);
    await expect(page.getByText('KanbanBoard')).toBeVisible();
  });

  test('should allow creating a new task', async ({ page }) => {
    // Find "Add New Card" button in the first column (To Do)
    const addCardBtn = page.getByRole('button', { name: /Add New Card/i }).first();
    await addCardBtn.click();

    // Fill in task details
    await page.getByPlaceholder(/Card Title/i).fill('E2E Test Task');
    await page.getByPlaceholder(/Add detailed description/i).fill('Created by Playwright');

    // Click Create Task
    await page.getByRole('button', { name: /Create Task/i }).click();

    // Verify task appears
    await expect(page.getByText('E2E Test Task')).toBeVisible();
  });

  test('should switch theme', async ({ page }) => {
    const settingsButton = page.getByRole('button', { name: /Settings/i });
    await settingsButton.click();

    const lightBtn = page.getByRole('button', { name: /Light/i });
    await lightBtn.click();

    await expect(lightBtn).toHaveClass(/btn-primary/);
  });

  test('should allow adding a new column', async ({ page }) => {
    const addColumnBtn = page.getByRole('button', { name: /Add Column/i });
    await addColumnBtn.click();

    // The app uses prompt() for adding a column in some places or a specific button
    // Looking at the code for "Add Column" button:
    // onClick={() => { const title = prompt('Enter new column name:'); if (title) addColumn(title); }}

    // Handling dialog
    page.once('dialog', dialog => dialog.accept('New E2E Column'));
    await addColumnBtn.click();

    await expect(page.getByText('New E2E Column')).toBeVisible();
  });
});
