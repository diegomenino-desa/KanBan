import { test, expect } from '@playwright/test';

test.describe('Kanban Board E2E', () => {
        test.beforeEach(async ({ page }) => {
                  await page.goto('/');

                            // If we are on the login page, perform login
                            if (await page.getByRole('heading', { name: /Sign in/i }).isVisible()) {
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
                          // Ensure we are on the board
                         await expect(page.getByText('KanbanBoard', { exact: true })).toBeVisible();

                         // Find "Add card" button in the first column (To Do)
                         const addCardBtn = page.getByRole('button', { name: /Add card/i }).first();
                          await addCardBtn.waitFor({ state: 'visible' });
                          await addCardBtn.click();

                         // Fill in task details
                         await page.getByPlaceholder(/Card title/i).fill('E2E Test Task');
                          await page.getByPlaceholder(/description/i).fill('Created by Playwright');

                         // Click Create card
                         await page.getByRole('button', { name: /Create card/i }).click();

                         // Verify task appears
                         await expect(page.getByText('E2E Test Task')).toBeVisible();
                });
});
