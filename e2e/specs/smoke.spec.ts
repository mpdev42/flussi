import { test, expect } from '@playwright/test';
import { launchApp } from '../fixtures/electron';

test("smoke — l'app démarre et ouvre une fenêtre", async () => {
  const { app, page } = await launchApp();

  // La fenêtre a un titre non vide
  const title = await page.title();
  expect(title).toBeTruthy();

  // Le pont IPC est exposé : window.api est défini côté renderer
  const apiExposed = await page.evaluate(
    () => typeof window.api !== 'undefined',
  );
  expect(apiExposed).toBe(true);

  // Le handler IPC `app:ping` répond `pong`
  const pong = await page.evaluate(() => window.api.ping());
  expect(pong).toBe('pong');

  await app.close();
});
