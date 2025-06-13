import { test, expect } from '@playwright/test';

test.describe('Basic UI Tests', () => {
  test('frontend loads successfully', async ({ page }) => {
    // Navigate to the app with a longer timeout
    await page.goto('http://localhost:3000', { timeout: 60000 });
    
    // Wait for the app to fully load
    await page.waitForLoadState('networkidle');
    
    // Check that the page has loaded
    await expect(page).toHaveTitle(/React App/);
    
    // Check for any text content indicating the app loaded
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText?.length).toBeGreaterThan(0);
  });

  test('backend API is accessible', async ({ request }) => {
    // Test root endpoint
    const response = await request.get('http://localhost:8000/', { timeout: 30000 });
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.message).toBe('Probity Studio API');
  });

  test('can fetch models from API', async ({ request }) => {
    const response = await request.get('http://localhost:8000/api/models', { timeout: 30000 });
    expect(response.ok()).toBeTruthy();
    
    const models = await response.json();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toHaveProperty('name');
    expect(models[0]).toHaveProperty('layers');
  });
});