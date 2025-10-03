/**
 * Sprint 4 E2E Tests
 *
 * Tests for Material System & File Import features:
 * - PBR material system
 * - Material creation and assignment
 * - Material library and presets
 * - Texture uploads
 * - File import (GLB/GLTF)
 * - Material property editing
 */

import { test, expect } from '@playwright/test';

test.describe('Sprint 4: Material System & File Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Create a new project
    await page.click('button:has-text("New Project")');
    await page.fill('input[placeholder="My Awesome Project"]', 'Sprint 4 Test Project');
    await page.click('button:has-text("Create")');

    // Wait for editor to load
    await page.waitForSelector('canvas');
  });

  test('should display Material tab in right sidebar', async ({ page }) => {
    // Check for Properties and Material tabs
    await expect(page.locator('button:has-text("Properties")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Material")').first()).toBeVisible();
  });

  test('should switch between Properties and Material tabs', async ({ page }) => {
    // Properties tab should be active by default
    await expect(page.locator('button:has-text("Properties").bg-accent').first()).toBeVisible();

    // Click Material tab
    await page.click('button:has-text("Material")');

    // Material tab should be active
    await expect(page.locator('button:has-text("Material").bg-accent').first()).toBeVisible();
  });

  test('should show Assign Material button when object is selected', async ({ page }) => {
    // Create an object
    await page.click('button[title*="Cube"]');

    // Switch to Material tab
    await page.click('button:has-text("Material")');

    // Should show "Assign Material" button
    await expect(page.locator('button:has-text("Assign Material")')).toBeVisible();
  });

  test('should display material library with presets', async ({ page }) => {
    // Create an object
    await page.click('button[title*="Cube"]');

    // Switch to Material tab
    await page.click('button:has-text("Material")');

    // Click Assign Material
    await page.click('button:has-text("Assign Material")');

    // Should show material library
    await expect(page.locator('text=Material Library')).toBeVisible();
    await expect(page.locator('button:has-text("Create New Material")')).toBeVisible();

    // Should show presets
    await expect(page.locator('text=Presets')).toBeVisible();
    await expect(page.locator('text=Default')).toBeVisible();
    await expect(page.locator('text=Metal')).toBeVisible();
    await expect(page.locator('text=Plastic')).toBeVisible();
    await expect(page.locator('text=Glass')).toBeVisible();
    await expect(page.locator('text=Emissive')).toBeVisible();
  });

  test('should assign material from preset', async ({ page }) => {
    // Create an object
    await page.click('button[title*="Cube"]');

    // Switch to Material tab
    await page.click('button:has-text("Material")');

    // Click Assign Material
    await page.click('button:has-text("Assign Material")');

    // Click Metal preset
    await page.click('text=Metal');

    // Should close library and show material properties
    await expect(page.locator('text=Material Library')).not.toBeVisible();
    await expect(page.locator('text=PBR Properties')).toBeVisible();
  });

  test('should display PBR property controls', async ({ page }) => {
    // Create object and assign material
    await page.click('button[title*="Cube"]');
    await page.click('button:has-text("Material")');
    await page.click('button:has-text("Assign Material")');
    await page.click('text=Metal');

    // Check for PBR controls
    await expect(page.locator('text=Albedo Color')).toBeVisible();
    await expect(page.locator('text=Metallic')).toBeVisible();
    await expect(page.locator('text=Roughness')).toBeVisible();
    await expect(page.locator('text=Emission Color')).toBeVisible();
    await expect(page.locator('text=Emission Intensity')).toBeVisible();
    await expect(page.locator('text=Opacity')).toBeVisible();
  });

  test('should display texture upload slots', async ({ page }) => {
    // Create object and assign material
    await page.click('button[title*="Cube"]');
    await page.click('button:has-text("Material")');
    await page.click('button:has-text("Assign Material")');
    await page.click('text=Default');

    // Check for texture map uploads
    await expect(page.locator('text=Texture Maps')).toBeVisible();
    await expect(page.locator('text=Albedo Map')).toBeVisible();
    await expect(page.locator('text=Normal Map')).toBeVisible();
    await expect(page.locator('text=Roughness Map')).toBeVisible();
    await expect(page.locator('text=Metallic Map')).toBeVisible();
    await expect(page.locator('text=Emission Map')).toBeVisible();
  });

  test('should display import button in toolbar', async ({ page }) => {
    // Check for import button
    await expect(page.locator('button[title*="Import Model"]')).toBeVisible();
  });

  test('should create new material', async ({ page }) => {
    // Create object
    await page.click('button[title*="Cube"]');
    await page.click('button:has-text("Material")');
    await page.click('button:has-text("Assign Material")');

    // Create new material
    await page.click('button:has-text("Create New Material")');

    // Should close library and show material editor
    await expect(page.locator('text=Material Library')).not.toBeVisible();
    await expect(page.locator('text=PBR Properties')).toBeVisible();
  });

  test('should change material name', async ({ page }) => {
    // Create object and assign material
    await page.click('button[title*="Cube"]');
    await page.click('button:has-text("Material")');
    await page.click('button:has-text("Assign Material")');
    await page.click('text=Default');

    // Find and edit material name
    const nameInput = page.locator('h3:has-text("Material") ~ div input[type="text"]').first();
    await nameInput.fill('My Custom Material');

    // Name should update
    await expect(nameInput).toHaveValue('My Custom Material');
  });

  test('should toggle transparent option', async ({ page }) => {
    // Create object and assign material
    await page.click('button[title*="Cube"]');
    await page.click('button:has-text("Material")');
    await page.click('button:has-text("Assign Material")');
    await page.click('text=Default');

    // Find transparent checkbox
    const transparentCheckbox = page.locator('label:has-text("Transparent") input[type="checkbox"]');
    await transparentCheckbox.click();

    // Checkbox should be checked
    await expect(transparentCheckbox).toBeChecked();
  });

  test('should switch back to Properties tab', async ({ page }) => {
    // Create object
    await page.click('button[title*="Cube"]');

    // Switch to Material tab
    await page.click('button:has-text("Material")');
    await expect(page.locator('button:has-text("Material").bg-accent').first()).toBeVisible();

    // Switch back to Properties tab
    await page.click('button:has-text("Properties")');
    await expect(page.locator('button:has-text("Properties").bg-accent').first()).toBeVisible();

    // Should show object properties
    await expect(page.locator('text=Transform')).toBeVisible();
  });

  test('should show material library with existing materials', async ({ page }) => {
    // Create object and assign two different materials
    await page.click('button[title*="Cube"]');
    await page.click('button:has-text("Material")');
    await page.click('button:has-text("Assign Material")');
    await page.click('text=Metal');

    // Create another object
    await page.click('button[title*="Sphere"]');
    await page.click('button:has-text("Material")');
    await page.click('button:has-text("Assign Material")');

    // Should show "Existing Materials" section
    await expect(page.locator('text=Existing Materials')).toBeVisible();
  });
});
