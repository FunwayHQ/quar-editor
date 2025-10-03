/**
 * Sprint 1 E2E Tests
 *
 * Acceptance tests for Sprint 1: Project Setup & Basic Infrastructure
 */

import { test, expect } from '@playwright/test';

test.describe('Sprint 1: Basic Infrastructure', () => {
  test('OSS-001: Application loads offline', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);

    // Navigate to app
    await page.goto('/');

    // Should see main interface
    await expect(page.getByText('QUAR Editor')).toBeVisible();
    await expect(page.getByText('Offline Mode')).toBeVisible();

    // Go back online
    await context.setOffline(false);
  });

  test('OSS-002: IndexedDB initialization', async ({ page }) => {
    await page.goto('/');

    // Check that app loaded without errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);

    // Should have no IndexedDB errors
    expect(errors.filter((e) => e.includes('IndexedDB'))).toHaveLength(0);
  });

  test('Create new project', async ({ page }) => {
    await page.goto('/');

    // Click "New Project"
    await page.getByText('New Project').click();

    // Should navigate to editor
    await expect(page).toHaveURL(/\/editor\/.+/);

    // Should see editor interface
    await expect(page.getByText('Untitled Project')).toBeVisible();
    await expect(page.getByText('Save')).toBeVisible();
  });

  test('Save and reload project', async ({ page }) => {
    await page.goto('/');

    // Create new project
    await page.getByText('New Project').click();
    await expect(page).toHaveURL(/\/editor\/(.+)/);

    // Get project ID from URL
    const url = page.url();
    const projectId = url.split('/').pop();

    // Change project name
    await page.getByRole('textbox', { name: /Untitled Project/i }).click();
    await page.getByRole('textbox', { name: /Untitled Project/i }).fill('Test Project');

    // Save
    await page.getByText('Save').click();

    // Go back to home
    await page.getByTitle('Back to projects').click();
    await expect(page).toHaveURL('/');

    // Should see project in list
    await expect(page.getByText('Test Project')).toBeVisible();

    // Open project again
    await page.getByText('Test Project').click();

    // Should load with saved name
    await expect(page.getByText('Test Project')).toBeVisible();
  });

  test('Download .quar file', async ({ page }) => {
    await page.goto('/');

    // Create new project
    await page.getByText('New Project').click();

    // Download .quar
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByText('Download .quar').click(),
    ]);

    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.quar$/);
  });

  test('Upload .quar file', async ({ page }) => {
    await page.goto('/');

    // Create a mock .quar file
    const quarData = {
      version: '1.0',
      scene: { objects: [], lights: [], cameras: [] },
      assets: [],
    };

    const buffer = Buffer.from(JSON.stringify(quarData));

    // Upload file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('Open .quar File').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'test-project.quar',
      mimeType: 'application/json',
      buffer,
    });

    // Should navigate to editor
    await expect(page).toHaveURL(/\/editor\/.+/);
  });

  test('Offline indicator appears when offline', async ({ page, context }) => {
    await page.goto('/');

    // Go offline
    await context.setOffline(true);

    // Create new project
    await page.getByText('New Project').click();

    // Should see offline indicator
    await expect(page.getByText('Offline')).toBeVisible();

    // Go back online
    await context.setOffline(false);
  });
});
