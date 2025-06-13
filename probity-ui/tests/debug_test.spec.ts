import { test, expect } from '@playwright/test';

test.describe('Debug UI Loading', () => {
  test('check for JavaScript errors and console logs', async ({ page }) => {
    // Collect all console messages
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        consoleErrors.push(text);
      }
      consoleLogs.push(`[${type}] ${text}`);
    });
    
    // Collect page errors
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });
    
    // Navigate to the app
    await page.goto('http://localhost:3000', { timeout: 60000 });
    
    // Wait for potential JavaScript execution
    await page.waitForTimeout(5000);
    
    // Print all console logs
    console.log('\n=== Console Logs ===');
    consoleLogs.forEach(log => console.log(log));
    
    // Print all errors
    if (consoleErrors.length > 0) {
      console.log('\n=== Console Errors ===');
      consoleErrors.forEach(error => console.log(error));
    }
    
    if (pageErrors.length > 0) {
      console.log('\n=== Page Errors ===');
      pageErrors.forEach(error => console.log(error));
    }
    
    // Check page HTML
    const html = await page.content();
    console.log('\n=== Page HTML (first 500 chars) ===');
    console.log(html.substring(0, 500));
    
    // Try to get React root
    const reactRoot = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        exists: !!root,
        innerHTML: root?.innerHTML || 'N/A',
        childCount: root?.children.length || 0
      };
    });
    
    console.log('\n=== React Root Info ===');
    console.log('Root exists:', reactRoot.exists);
    console.log('Child count:', reactRoot.childCount);
    console.log('Inner HTML preview:', reactRoot.innerHTML.substring(0, 200));
    
    // Check for common React build issues
    const bodyText = await page.textContent('body');
    
    // Assertions
    expect(pageErrors.length).toBe(0);
    expect(bodyText).not.toContain('Failed to compile');
    expect(bodyText).not.toContain('Module not found');
    expect(reactRoot.exists).toBe(true);
  });
});