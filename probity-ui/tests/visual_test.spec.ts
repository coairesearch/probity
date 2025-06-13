import { test, expect } from '@playwright/test';

test.describe('Visual UI Verification', () => {
  test('capture screenshots of all pages', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Navigate to the app
    await page.goto('http://localhost:3000', { timeout: 60000 });
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for React to fully render
    await page.waitForTimeout(2000);
    
    // Take screenshot of dashboard
    await page.screenshot({ path: 'test-results/dashboard.png', fullPage: true });
    
    // Check if navigation links are visible
    const navLinks = await page.locator('nav a').count();
    console.log(`Found ${navLinks} navigation links`);
    
    // Try to click on Dataset if it exists
    const datasetLink = page.locator('text=Dataset').first();
    if (await datasetLink.isVisible()) {
      await datasetLink.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/dataset-builder.png', fullPage: true });
    }
    
    // Try to click on Model if it exists
    const modelLink = page.locator('text=Model').first();
    if (await modelLink.isVisible()) {
      await modelLink.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/model-explorer.png', fullPage: true });
    }
    
    // Try to click on Experiment if it exists
    const experimentLink = page.locator('text=Experiment').first();
    if (await experimentLink.isVisible()) {
      await experimentLink.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/experiment-setup.png', fullPage: true });
    }
    
    // Try to click on Results if it exists
    const resultsLink = page.locator('text=Results').first();
    if (await resultsLink.isVisible()) {
      await resultsLink.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/results-viewer.png', fullPage: true });
    }
    
    // Log page content for debugging
    const pageContent = await page.textContent('body');
    console.log('Page content preview:', pageContent?.substring(0, 200) + '...');
  });

  test('verify UI components render', async ({ page }) => {
    await page.goto('http://localhost:3000', { timeout: 60000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check if the main app container exists
    const app = await page.locator('#root').isVisible();
    expect(app).toBe(true);
    
    // Check for any error messages
    const errorMessages = await page.locator('.error, .Error, [class*="error"]').count();
    console.log(`Found ${errorMessages} error elements`);
    
    // Get all visible text on the page
    const allText = await page.locator('body').innerText();
    console.log('All visible text:', allText);
    
    // Verify no compilation errors are shown
    expect(allText).not.toContain('Failed to compile');
    expect(allText).not.toContain('Module not found');
    expect(allText).not.toContain('Cannot find module');
  });
});