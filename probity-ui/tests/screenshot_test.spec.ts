import { test, expect } from '@playwright/test';

test.describe('UI Screenshot Tests', () => {
  test('capture UI state and verify basic functionality', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Navigate to the app
    await page.goto('http://localhost:3000', { timeout: 60000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/ui-dashboard.png', fullPage: true });
    console.log('Dashboard screenshot captured');
    
    // Log what's visible on the page
    const visibleText = await page.locator('body').innerText();
    console.log('Visible text on page:', visibleText);
    
    // Check if we have the main navigation
    const navItems = await page.locator('nav a').allTextContents();
    console.log('Navigation items found:', navItems);
    
    // Click on each navigation item and take screenshots
    for (const navItem of navItems) {
      if (navItem && navItem.trim()) {
        console.log(`Clicking on: ${navItem}`);
        await page.click(`text="${navItem}"`);
        await page.waitForTimeout(1000);
        await page.screenshot({ 
          path: `test-results/ui-${navItem.toLowerCase().replace(/\s+/g, '-')}.png`, 
          fullPage: true 
        });
      }
    }
    
    // Basic assertions
    expect(navItems.length).toBeGreaterThan(0);
    expect(visibleText).toBeTruthy();
  });
});