import { test, expect } from '@playwright/test';

test.describe('Probity Studio UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should load dashboard', async ({ page }) => {
    // Check that the main title is present
    await expect(page.locator('h2')).toContainText('Probity Studio');
    
    // Verify stats cards are present
    await expect(page.locator('text=Datasets')).toBeVisible();
    await expect(page.locator('text=Models')).toBeVisible();
    await expect(page.locator('text=Experiments')).toBeVisible();
  });

  test('should navigate to Dataset Builder', async ({ page }) => {
    // Click on Dataset tab
    await page.click('text=Dataset');
    
    // Check Dataset Builder elements
    await expect(page.locator('h2').first()).toContainText('Dataset Builder');
    await expect(page.locator('text=Define Template')).toBeVisible();
    await expect(page.locator('textarea[placeholder*="template"]')).toBeVisible();
  });

  test('should create a dataset template', async ({ page }) => {
    // Navigate to Dataset Builder
    await page.click('text=Dataset');
    
    // Enter dataset name
    await page.fill('input[placeholder="Enter dataset name"]', 'Test Sentiment Dataset');
    
    // Enter template
    const template = 'I thought this {movie} was {sentiment}, I {feeling} it.';
    await page.fill('textarea[placeholder*="template"]', template);
    
    // Add a variable
    await page.click('text=Add Variable');
    await page.fill('input[placeholder="Variable name"]', 'movie');
    await page.fill('input[placeholder="Add value and press Enter"]', 'movie');
    await page.press('input[placeholder="Add value and press Enter"]', 'Enter');
    
    // Check preview update
    await expect(page.locator('text=Preview Examples')).toBeVisible();
  });

  test('should navigate to Model Explorer', async ({ page }) => {
    // Click on Model tab
    await page.click('text=Model');
    
    // Check Model Explorer elements
    await expect(page.locator('h2').first()).toContainText('Model Explorer');
    await expect(page.locator('text=Select Model')).toBeVisible();
    await expect(page.locator('select')).toBeVisible();
  });

  test('should select a model and layers', async ({ page }) => {
    // Navigate to Model Explorer
    await page.click('text=Model');
    
    // Select GPT-2 model
    await page.selectOption('select', 'gpt2');
    
    // Click on a layer
    await page.click('text=Layer 0');
    
    // Verify layer is selected (should have different styling)
    const layer = page.locator('text=Layer 0').locator('..');
    await expect(layer).toHaveClass(/bg-indigo-50/);
  });

  test('should navigate to Experiment Setup', async ({ page }) => {
    // Click on Experiment tab
    await page.click('text=Experiment');
    
    // Check Experiment Setup elements
    await expect(page.locator('h2').first()).toContainText('Experiment Setup');
    await expect(page.locator('text=Basic Configuration')).toBeVisible();
    await expect(page.locator('input[placeholder="Enter experiment name"]')).toBeVisible();
  });

  test('should configure an experiment', async ({ page }) => {
    // Navigate to Experiment Setup
    await page.click('text=Experiment');
    
    // Enter experiment name
    await page.fill('input[placeholder="Enter experiment name"]', 'Test Sentiment Probe');
    
    // Select probe type
    await page.selectOption('select', 'logistic');
    
    // Configure training parameters
    await page.fill('input#epochs', '20');
    await page.fill('input#batch_size', '64');
    
    // Check that Run Experiment button is visible
    await expect(page.locator('button:has-text("Run Experiment")')).toBeVisible();
  });

  test('should navigate to Results Viewer', async ({ page }) => {
    // Click on Results tab
    await page.click('text=Results');
    
    // Check Results Viewer elements
    await expect(page.locator('text=No experiments yet')).toBeVisible();
    await expect(page.locator('text=Run your first experiment')).toBeVisible();
  });

  test('should have responsive navigation', async ({ page }) => {
    // Test each navigation link
    const tabs = ['Dashboard', 'Dataset', 'Model', 'Experiment', 'Results'];
    
    for (const tab of tabs) {
      await page.click(`text=${tab}`);
      
      // Verify active tab styling
      const navItem = page.locator(`nav >> text=${tab}`);
      await expect(navItem).toHaveClass(/text-indigo-600/);
      
      // Small delay to ensure smooth navigation
      await page.waitForTimeout(100);
    }
  });
});

// Test API endpoints are accessible
test.describe('API Integration Tests', () => {
  test('should connect to backend API', async ({ request }) => {
    // Test root endpoint
    const response = await request.get('http://localhost:8000/');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.message).toBe('Probity Studio API');
  });

  test('should fetch available models', async ({ request }) => {
    const response = await request.get('http://localhost:8000/api/models');
    expect(response.ok()).toBeTruthy();
    const models = await response.json();
    expect(models).toHaveLength(2);
    expect(models[0].name).toBe('GPT-2');
  });

  test('should create a dataset', async ({ request }) => {
    const response = await request.post('http://localhost:8000/api/datasets/create', {
      data: {
        name: 'Test Dataset',
        template: 'Test {var}',
        variables: [
          {
            name: 'var',
            values: ['a', 'b'],
            classBound: false
          }
        ]
      }
    });
    expect(response.ok()).toBeTruthy();
    const dataset = await response.json();
    expect(dataset.name).toBe('Test Dataset');
  });
});