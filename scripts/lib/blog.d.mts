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

export declare function parseFrontmatter(raw: string): { data: Record<string, string>; body: string };

export declare function loadPosts(contentDir: string): Promise<BlogPost[]>;

export declare function renderPost(post: BlogPost, ctx: BlogCtx): string;

export declare function renderIndex(args: BlogCtx & { locale: string }): string;

export declare function blogDevPlugin(siteUrl: string): Plugin;
