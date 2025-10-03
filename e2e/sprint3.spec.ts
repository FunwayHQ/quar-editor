/**
 * Sprint 3 E2E Tests
 *
 * Tests for Object Manipulation features:
 * - Object creation
 * - Selection system
 * - Transform controls
 * - Hierarchy panel
 * - Properties panel
 * - Keyboard shortcuts
 * - Undo/Redo
 */

import { test, expect } from '@playwright/test';

test.describe('Sprint 3: Object Manipulation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Create a new project
    await page.click('button:has-text("New Project")');
    await page.fill('input[placeholder="My Awesome Project"]', 'Sprint 3 Test Project');
    await page.click('button:has-text("Create")');

    // Wait for editor to load
    await page.waitForSelector('canvas');
  });

  test('should display object creation toolbar', async ({ page }) => {
    // Check for object creation toolbar
    await expect(page.locator('text=Add Object:')).toBeVisible();

    // Check for primitive buttons
    const primitives = ['Cube', 'Sphere', 'Cylinder', 'Cone', 'Torus', 'Plane'];
    for (const primitive of primitives) {
      await expect(page.locator(`button[title*="${primitive}"]`)).toBeVisible();
    }
  });

  test('should display hierarchy and properties panels', async ({ page }) => {
    // Check for hierarchy panel
    await expect(page.locator('text=Hierarchy')).toBeVisible();

    // Check for properties panel
    await expect(page.locator('text=Properties')).toBeVisible();

    // Initially should show "No object selected"
    await expect(page.locator('text=No object selected')).toBeVisible();
  });

  test('should create a cube object', async ({ page }) => {
    // Click the cube button
    await page.click('button[title*="Cube"]');

    // Wait for object to appear in hierarchy
    await expect(page.locator('text=Box001')).toBeVisible();

    // Check that it appears in properties panel
    await expect(page.locator('text=No object selected')).not.toBeVisible();
  });

  test('should create multiple objects', async ({ page }) => {
    // Create cube
    await page.click('button[title*="Cube"]');
    await expect(page.locator('text=Box001')).toBeVisible();

    // Create sphere
    await page.click('button[title*="Sphere"]');
    await expect(page.locator('text=Sphere001')).toBeVisible();

    // Create cylinder
    await page.click('button[title*="Cylinder"]');
    await expect(page.locator('text=Cylinder001')).toBeVisible();

    // All objects should be in hierarchy
    await expect(page.locator('text=Box001')).toBeVisible();
    await expect(page.locator('text=Sphere001')).toBeVisible();
    await expect(page.locator('text=Cylinder001')).toBeVisible();
  });

  test('should select object from hierarchy panel', async ({ page }) => {
    // Create objects
    await page.click('button[title*="Cube"]');
    await page.click('button[title*="Sphere"]');

    // Click on Box001 in hierarchy
    await page.click('text=Box001');

    // Properties panel should show Box001
    await expect(page.locator('.text-sm:has-text("Box001")')).toBeVisible();
  });

  test('should show transform modes when object is selected', async ({ page }) => {
    // Create an object
    await page.click('button[title*="Cube"]');

    // Transform mode buttons should be visible
    await expect(page.locator('button[title*="Move (W)"]')).toBeVisible();
    await expect(page.locator('button[title*="Rotate (E)"]')).toBeVisible();
    await expect(page.locator('button[title*="Scale (R)"]')).toBeVisible();
  });

  test('should delete object using Delete button', async ({ page }) => {
    // Create an object
    await page.click('button[title*="Cube"]');
    await expect(page.locator('text=Box001')).toBeVisible();

    // Make sure it's selected
    await page.click('text=Box001');

    // Click delete button in hierarchy panel
    await page.click('button[title*="Delete"]');

    // Object should be removed
    await expect(page.locator('text=Box001')).not.toBeVisible();
    await expect(page.locator('text=No objects in scene')).toBeVisible();
  });

  test('should delete object using Delete key', async ({ page }) => {
    // Create an object
    await page.click('button[title*="Cube"]');
    await expect(page.locator('text=Box001')).toBeVisible();

    // Make sure it's selected
    await page.click('text=Box001');

    // Press Delete key
    await page.keyboard.press('Delete');

    // Object should be removed
    await expect(page.locator('text=Box001')).not.toBeVisible();
  });

  test('should duplicate object using Duplicate button', async ({ page }) => {
    // Create an object
    await page.click('button[title*="Cube"]');
    await expect(page.locator('text=Box001')).toBeVisible();

    // Make sure it's selected
    await page.click('text=Box001');

    // Click duplicate button in hierarchy panel
    await page.click('button[title*="Duplicate"]');

    // Should have two boxes
    await expect(page.locator('text=Box001')).toBeVisible();
    await expect(page.locator('text=Box002')).toBeVisible();
  });

  test('should duplicate object using Ctrl+D', async ({ page }) => {
    // Create an object
    await page.click('button[title*="Cube"]');
    await expect(page.locator('text=Box001')).toBeVisible();

    // Make sure it's selected
    await page.click('text=Box001');

    // Press Ctrl+D (or Cmd+D on Mac)
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+KeyD`);

    // Should have two boxes
    await expect(page.locator('text=Box001')).toBeVisible();
    await expect(page.locator('text=Box002')).toBeVisible();
  });

  test('should switch transform modes using keyboard shortcuts', async ({ page }) => {
    // Create an object
    await page.click('button[title*="Cube"]');
    await page.click('text=Box001');

    // Press W for Move mode
    await page.keyboard.press('KeyW');
    await expect(page.locator('button[title*="Move (W)"].bg-accent')).toBeVisible();

    // Press E for Rotate mode
    await page.keyboard.press('KeyE');
    await expect(page.locator('button[title*="Rotate (E)"].bg-accent')).toBeVisible();

    // Press R for Scale mode
    await page.keyboard.press('KeyR');
    await expect(page.locator('button[title*="Scale (R)"].bg-accent')).toBeVisible();
  });

  test('should undo object creation', async ({ page }) => {
    // Create an object
    await page.click('button[title*="Cube"]');
    await expect(page.locator('text=Box001')).toBeVisible();

    // Press Ctrl+Z to undo
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+KeyZ`);

    // Object should be removed
    await expect(page.locator('text=Box001')).not.toBeVisible();
    await expect(page.locator('text=No objects in scene')).toBeVisible();
  });

  test('should redo object creation', async ({ page }) => {
    // Create an object
    await page.click('button[title*="Cube"]');
    await expect(page.locator('text=Box001')).toBeVisible();

    // Undo
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+KeyZ`);
    await expect(page.locator('text=Box001')).not.toBeVisible();

    // Redo
    await page.keyboard.press(`${modifier}+Shift+KeyZ`);
    await expect(page.locator('text=Box001')).toBeVisible();
  });

  test('should edit object name in properties panel', async ({ page }) => {
    // Create an object
    await page.click('button[title*="Cube"]');
    await page.click('text=Box001');

    // Find and edit the name input in properties panel
    const nameInput = page.locator('.flex-1.overflow-y-auto input[type="text"]').first();
    await nameInput.fill('My Custom Cube');

    // Check that hierarchy panel shows new name
    await expect(page.locator('text=My Custom Cube')).toBeVisible();
  });

  test('should toggle object visibility', async ({ page }) => {
    // Create an object
    await page.click('button[title*="Cube"]');
    await page.click('text=Box001');

    // Find visibility checkbox in properties panel
    const visibilityCheckbox = page.locator('label:has-text("Visible") input[type="checkbox"]');
    await visibilityCheckbox.click();

    // Checkbox should be unchecked
    await expect(visibilityCheckbox).not.toBeChecked();

    // Toggle back
    await visibilityCheckbox.click();
    await expect(visibilityCheckbox).toBeChecked();
  });

  test('should edit transform values in properties panel', async ({ page }) => {
    // Create an object
    await page.click('button[title*="Cube"]');
    await page.click('text=Box001');

    // Find position X input
    const positionInputs = page.locator('.mb-3:has-text("Position") input[type="number"]');
    const positionX = positionInputs.first();

    // Change position
    await positionX.fill('5');
    await positionX.blur();

    // Value should update
    await expect(positionX).toHaveValue('5.000');
  });

  test('should deselect object with Escape key', async ({ page }) => {
    // Create an object
    await page.click('button[title*="Cube"]');
    await page.click('text=Box001');

    // Properties panel should show object
    await expect(page.locator('text=No object selected')).not.toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Properties panel should show "No object selected"
    await expect(page.locator('text=No object selected')).toBeVisible();
  });

  test('should handle multiple undo/redo operations', async ({ page }) => {
    // Create multiple objects
    await page.click('button[title*="Cube"]');
    await page.click('button[title*="Sphere"]');
    await page.click('button[title*="Cylinder"]');

    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

    // Undo three times
    await page.keyboard.press(`${modifier}+KeyZ`);
    await page.keyboard.press(`${modifier}+KeyZ`);
    await page.keyboard.press(`${modifier}+KeyZ`);

    // All should be gone
    await expect(page.locator('text=No objects in scene')).toBeVisible();

    // Redo three times
    await page.keyboard.press(`${modifier}+Shift+KeyZ`);
    await page.keyboard.press(`${modifier}+Shift+KeyZ`);
    await page.keyboard.press(`${modifier}+Shift+KeyZ`);

    // All should be back
    await expect(page.locator('text=Box001')).toBeVisible();
    await expect(page.locator('text=Sphere001')).toBeVisible();
    await expect(page.locator('text=Cylinder001')).toBeVisible();
  });
});
