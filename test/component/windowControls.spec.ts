import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

// test/component/windowControls.spec.ts

const openControls = async (page: Page, platform: string, initiallyFullscreen = false) => {
    await page.addInitScript(({ platform, initiallyFullscreen }) => {
        let fullscreen = initiallyFullscreen;
        let maximized = false;
        Object.defineProperty(window, 'electron', { value: {
            platform,
            isWindowFullscreen: async () => fullscreen,
            isWindowMaximized: async () => maximized,
            toggleFullscreenWindow: async () => {
                document.body.dataset.fullscreenRequested = 'true';
                return !fullscreen;
            },
            toggleMaximizeWindow: async () => {
                maximized = !maximized;
                document.body.dataset.maximizeRequested = 'true';
                return maximized;
            },
            onWindowFullscreenChanged: (callback: (value: boolean) => void) => {
                const listener = (event: Event) => {
                    fullscreen = (event as CustomEvent<boolean>).detail;
                    callback(fullscreen);
                };
                window.addEventListener('test-fullscreen', listener);
                return () => {
                    window.removeEventListener('test-fullscreen', listener);
                    document.body.dataset.fullscreenUnsubscribed = 'true';
                };
            },
        } });
    }, { platform, initiallyFullscreen });
    await page.goto('/test/fixtures/window-controls.html');
};

test('Mac titlebar requests fullscreen and follows native transition events', async ({ page }) => {
    await openControls(page, 'darwin');
    await page.getByRole('button', { name: 'Enter fullscreen', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-fullscreen-requested', 'true');
    await expect(page.locator('body')).not.toHaveAttribute('data-maximize-requested');
    // The invocation result is a requested target, not proof that macOS has finished animating.
    await expect(page.getByRole('button', { name: 'Enter fullscreen', exact: true })).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('test-fullscreen', { detail: true })));
    await expect(page.getByRole('button', { name: 'Exit fullscreen', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Exit fullscreen', exact: true }).click();
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('test-fullscreen', { detail: false })));
    await expect(page.getByRole('button', { name: 'Enter fullscreen', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Unmount controls' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-fullscreen-unsubscribed', 'true');
});

test('Mac titlebar restores its state when mounted in an already fullscreen window', async ({ page }) => {
    await openControls(page, 'darwin', true);
    await expect(page.getByRole('button', { name: 'Exit fullscreen', exact: true })).toBeVisible();
    // An exit initiated by the system must update the button without a browser resize event.
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('test-fullscreen', { detail: false })));
    await expect(page.getByRole('button', { name: 'Enter fullscreen', exact: true })).toBeVisible();
});

for (const platform of ['win32', 'linux']) {
    test(`${platform} titlebar retains maximize and restore behavior`, async ({ page }) => {
        await openControls(page, platform);
        await page.getByRole('button', { name: 'Maximize', exact: true }).click();
        await expect(page.locator('body')).toHaveAttribute('data-maximize-requested', 'true');
        await expect(page.locator('body')).not.toHaveAttribute('data-fullscreen-requested');
        await page.getByRole('button', { name: 'Restore window', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Maximize', exact: true })).toBeVisible();
    });
}
