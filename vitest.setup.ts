import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import i18n from './src/i18n';

// jsdom has no blob URL store; downloads under test just need a stand-in.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:http://localhost/mock-download';
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => {};
}

beforeEach(async () => {
  cleanup();
  localStorage.clear();
  await i18n.init();
  await i18n.changeLanguage('en');
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
