import { test, expect, type Page } from '@playwright/test';

// Credentials for the test admin account, overridable via env vars so the
// password doesn't have to be committed. Defaults match the docker-compose
// BOOTSTRAP_ADMIN_* values for first-time setup; if you've since rotated
// the admin password, set E2E_USERNAME / E2E_PASSWORD before running.
const E2E_USERNAME = process.env.E2E_USERNAME ?? 'admin';
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? 'password123';

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
      await page.getByLabel(/USERNAME/i).fill(E2E_USERNAME);
      await page.getByLabel(/PASSWORD/i).fill(E2E_PASSWORD);
      await page.getByRole('button', { name: /Sign in/i }).click();
      // Wait for the login form to actually disappear before proceeding —
      // the "KanbanBoard" wordmark exists on both the login page (logo) and
      // the post-login nav, so checking for it here is a false positive that
      // lets the test race ahead of the Set-Cookie response.
      await expect(page.getByRole('heading', { name: /Sign in/i })).toBeHidden();
    }

    // Hermetic state: each test starts against a freshly-seeded board.
    await ensureFreshBoard(page);
    await page.reload();
    // Confirm the session cookie carried through the reload — if it didn't,
    // we'd be back at the login screen and every subsequent assertion would
    // fail with a misleading "Add card not found" timeout.
    await expect(page.getByRole('heading', { name: /Sign in/i })).toBeHidden();
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
