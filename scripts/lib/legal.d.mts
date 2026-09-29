import type { Plugin } from 'vite';

export interface LegalPage {
  slug: string;
  locale: string;
  dir: 'ltr' | 'rtl';
  prefix: string;
  ogLocale: string;
  title: string;
  description: string;
  updated: string;
  url: string;
  html: string;
}

export declare const LOCALES: Record<string, { dir: 'ltr' | 'rtl'; prefix: string; ogLocale: string }>;

export declare const ROOT: string;

export declare const CONTENT_DIR: string;

export declare function loadPages(contentDir?: string): Promise<LegalPage[]>;

export declare function renderPage(
  page: LegalPage,
  ctx: { siteUrl: string; css: string; cssHref?: string; twin?: LegalPage },
): string;

export declare function legalDevPlugin(siteUrl: string): Plugin;
