import { test, expect } from '@playwright/test';
import path from 'path';

// Define the local URL mapped by playwright webServer
const AppUrl = 'http://localhost:3009';

test.describe('WEKO Service E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Mock the Google Apps script endpoint to prevent real network requests
        await page.route('**/exec*', async route => {
            const request = route.request();
            if (request.url().includes('getParts')) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        parts: [
                            { name: "АКБ 60V 22AH", price: 24466 },
                            { name: "Зарядное устройство 5A 60V", price: 1282 },
                            { name: "Штырь 27,2 30см", price: 423 },
                            { name: "Крыло переднее", price: 425 }
                        ]
                    })
                });
            } else {
                await route.fulfill({ status: 200, body: JSON.stringify({ success: true, history: [] }) });
            }
        });
        
        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER ERROR:', err));
        page.on('response', res => {
            if (res.url().includes('app.js') || res.status() >= 400) {
                console.log(`NET: ${res.status()} ${res.url()}`);
            }
        });
        await page.goto(AppUrl);
        // Wait for the app to initialize
        await page.waitForTimeout(500);
    });

    test('Calculator logic: Parts selection and calculations', async ({ page }) => {
        // Toggle off delivery for pure repair calculation
        await page.locator('label[for="needDelivery"]').click();
        
        const totalLocator = page.locator('#displayTotal');
        await expect(totalLocator).toHaveText('0 ₽');

        // Search for a part
        await page.locator('#searchInput').fill('штырь');
        // Click the checkbox for "Штырь"
        await page.locator('.part-card:has-text("Штырь") input[type="checkbox"]').check();

        await expect(totalLocator).toHaveText('423 ₽');
    });

    test('Delivery logic: x1, x2 and custom price overrides', async ({ page }) => {
        const totalLocator = page.locator('#displayTotal');
        const summaryPrice = page.locator('#deliverySummaryPrice');
        
        // Default is on, 900
        await expect(totalLocator).toHaveText('900 ₽');
        await expect(summaryPrice).toHaveText('900 ₽');

        // Click x2
        await page.locator('#btnDelivX2').click();
        await expect(totalLocator).toHaveText('1 800 ₽');
        await expect(summaryPrice).toHaveText('1 800 ₽');

        // Click x1
        await page.locator('#btnDelivX1').click();
        await expect(totalLocator).toHaveText('900 ₽');
        await expect(summaryPrice).toHaveText('900 ₽');

        // Custom price
        await page.locator('#customDeliveryPrice').fill('3000');
        await expect(totalLocator).toHaveText('3 000 ₽');
        await expect(summaryPrice).toHaveText('3 000 ₽');
        
        // Turn delivery off
        await page.locator('label[for="needDelivery"]').click();
        await expect(totalLocator).toHaveText('0 ₽');
    });

    test('Form Reset: clears all fields and delivery settings', async ({ page }) => {
        // Fill fields
        await page.locator('#clientName').fill('Test Client');
        await page.locator('#rentNumber').fill('123');
        await page.locator('#customDeliveryPrice').fill('500');
        await page.locator('#btnDelivX2').click();
        
        // Click a part
        await page.locator('.part-card:has-text("Крыло переднее") input[type="checkbox"]').first().check();
        
        // Total should be 1800 (x2 delivery) + 423 part = 2223 (custom delivery cleared when x2 clicked)
        await expect(page.locator('#displayTotal')).toHaveText('2 223 ₽');

        // Press "Сброс" (Reset)
        await page.locator('button:has-text("Сброс")').click();

        // Fields should be cleared
        await expect(page.locator('#clientName')).toBeEmpty();
        await expect(page.locator('#rentNumber')).toBeEmpty();
        await expect(page.locator('#customDeliveryPrice')).toBeEmpty();
        
        // Delivery should be back to 900
        await expect(page.locator('#displayTotal')).toHaveText('900 ₽');
    });

    test('Search and filter parts', async ({ page }) => {
        // initially parts container has 49 mock parts
        await expect(page.locator('.part-card:visible')).toHaveCount(49);
        
        await page.locator('#searchInput').fill('АКБ');
        // Only 7 should be visible based on defaultPartsDB
        await expect(page.locator('.part-card:visible')).toHaveCount(7);
        
        await page.locator('#searchClearBtn').click();
        await expect(page.locator('.part-card:visible')).toHaveCount(49);
    });
});
