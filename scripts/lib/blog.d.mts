import type { Plugin } from 'vite';

export interface BlogLocaleMeta {
  dir: 'ltr' | 'rtl';
  prefix: string;
  ogLocale: string;
}

export interface BlogPost {
  slug: string;
  locale: string;
  dir: 'ltr' | 'rtl';
  prefix: string;
  ogLocale: string;
  title: string;
  description: string;
  date: string;
  updated: string | null;
  file: string;
  url: string;
  html: string;
}

export interface BlogCtx {
  siteUrl: string;
  posts: BlogPost[];
  css: string;
  cssHref?: string;
}

export declare const LOCALES: Record<string, BlogLocaleMeta>;

export declare const ROOT: string;

export declare const CONTENT_DIR: string;

export declare const ARTICLE_CSS: string;

export declare function parseFrontmatter(raw: string): { data: Record<string, string>; body: string };

export declare function loadPosts(contentDir: string): Promise<BlogPost[]>;

export declare function renderPost(post: BlogPost, ctx: BlogCtx): string;

export declare function renderIndex(args: BlogCtx & { locale: string }): string;

export interface DocumentArgs {
  siteUrl: string;
  url: string;
  title: string;
  description: string;
  locale: string;
  dir: string;
  css: string;
  cssHref?: string;
  jsonLd?: string;
  body: string;
  header?: string;
  ogType?: string;
  articleTimes?: string;
  headExtra?: string;
}

/** Shell shared by every generated page: metadata, inlined CSS, and JSON-LD. */
export declare function document_(args: DocumentArgs): string;

export declare function blogDevPlugin(siteUrl: string): Plugin;
