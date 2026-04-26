import { test, expect, type Page } from '@playwright/test';

test.describe('Kanban Board E2E', () => {
  // These tests share server-side board state, so run serially within this file.
  test.describe.configure({ mode: 'serial' });

  // Wipes any existing boards on the server and creates a single empty board
  // with the server-provided default columns. Uses the session cookie that
  // page.request inherits from the logged-in page context.
  async function ensureFreshBoard(page: Page) {
    await page.request.put('/api/boards', { data: { boards: [] } });
    await page.request.post('/api/boards', { data: { name: 'E2E Test Board' } });
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // If we're on the login page, perform login.
    if (await page.getByRole('heading', { name: /Sign in/i }).isVisible()) {
      await page.getByLabel(/USERNAME/i).fill('admin');
      await page.getByLabel(/PASSWORD/i).fill('password123');
      await page.getByRole('button', { name: /Sign in/i }).click();
      await expect(page.getByText('KanbanBoard', { exact: true })).toBeVisible();
    }

    // Hermetic state: each test starts against a freshly-seeded board.
    await ensureFreshBoard(page);
    await page.reload();
    await expect(page.getByText('KanbanBoard', { exact: true })).toBeVisible();
  });

  test('should load the kanban board', async ({ page }) => {
    await expect(page).toHaveTitle(/kanbanboard/i);
    await expect(page.getByText('KanbanBoard', { exact: true })).toBeVisible();
  });

  test('should allow creating a new task', async ({ page }) => {
    // First column's "Add card" button (column-header icon button has
    // title="Add card", picked up by Playwright's accessible-name match).
    const addCardBtn = page.getByRole('button', { name: /Add card/i }).first();
    await addCardBtn.waitFor({ state: 'visible' });
    await addCardBtn.click();

    await page.getByPlaceholder(/Card title/i).fill('E2E Test Task');
    await page.getByPlaceholder(/description/i).fill('Created by Playwright');

    await page.getByRole('button', { name: /Create card/i }).click();

    await expect(page.getByText('E2E Test Task')).toBeVisible();
  });
});
