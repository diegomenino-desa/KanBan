import { test, expect } from '@playwright/test';

test.describe('Kanban Board E2E', () => {
    test.beforeEach(async ({ page }) => {
          await page.goto('/');

                        // If we are on the login page, perform login
                        if (await page.getByRole('heading', { name: /Sign in/i }).isVisible()) {
                                // Use credentials that match the default LDAP setup in docker-compose.yml
            // or common local bootstrap credentials.
            // Based on docker-compose.yml, it's currently using local auth with bootstrap.
            await page.getByLabel(/USERNAME/i).fill('admin');
                                await page.getByLabel(/PASSWORD/i).fill('password123');
                                await page.getByRole('button', { name: /Sign in/i }).click();

            // Wait for navigation/loading to complete
            await expect(page.getByText('KanbanBoard', { exact: true })).toBeVisible();
                        }
    });

                test('should load the kanban board', async ({ page }) => {
                      await expect(page).toHaveTitle(/kanbanboard/i);
                      await expect(page.getByText('KanbanBoard', { exact: true })).toBeVisible();
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
});
