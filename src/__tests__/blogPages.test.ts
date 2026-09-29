import { describe, expect, it } from 'vitest';
import {
  parseFrontmatter,
  loadPosts,
  renderPost,
  renderIndex,
  CONTENT_DIR,
} from '../../scripts/lib/blog.mjs';
import type { BlogPost } from '../../scripts/lib/blog.mjs';

const siteUrl = 'https://qfza.app';

const all = () => loadPosts(CONTENT_DIR);

/** Fail loudly if seed content goes missing, rather than rendering undefined. */
async function pick(predicate: (post: BlogPost) => boolean): Promise<BlogPost> {
  const found = (await all()).find(predicate);
  if (!found) throw new Error('expected a matching blog post in content/blog');
  return found;
}

const jsonLdOf = (html: string) =>
  JSON.parse(/application\/ld\+json">(.*?)<\/script>/s.exec(html)![1]);

describe('blog frontmatter', () => {
  it('splits frontmatter from the body and trims quotes', () => {
    const { data, body } = parseFrontmatter(
      ['---', 'title: "Hello"', 'description: World', 'date: 2026-01-02', '---', '', '# Hi'].join(
        '\n',
      ),
    );
    expect(data).toEqual({ title: 'Hello', description: 'World', date: '2026-01-02' });
    expect(body.trim()).toBe('# Hi');
  });

  it('treats a document without frontmatter as all body', () => {
    const { data, body } = parseFrontmatter('# Just markdown');
    expect(data).toEqual({});
    expect(body).toBe('# Just markdown');
  });
});

describe('blog posts', () => {
  it('publishes EN at /blog/<slug>/ and AR at /ar/blog/<slug>/', async () => {
    const en = await pick((p) => p.locale === 'en');
    const ar = await pick((p) => p.locale === 'ar');
    expect(en.url).toMatch(/^\/blog\/[a-z0-9-]+\/$/);
    expect(ar.url).toMatch(/^\/ar\/blog\/[a-z0-9-]+\/$/);
  });

  it('pairs every EN post with an AR translation of the same slug', async () => {
    const posts = await all();
    const slugs = (locale: string) =>
      posts.filter((p) => p.locale === locale).map((p) => p.slug);
    expect(slugs('en').length).toBeGreaterThan(0);
    expect([...slugs('en')].sort()).toEqual([...slugs('ar')].sort());
  });

  it('gives every post a title, description and parseable date', async () => {
    for (const post of await all()) {
      expect(post.title).toBeTruthy();
      expect(post.description).toBeTruthy();
      expect(Number.isNaN(Date.parse(post.date))).toBe(false);
    }
  });

  it('orders posts newest first', async () => {
    const dates = (await all()).map((p) => p.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});

describe('blog page output', () => {
  it('emits a canonical URL, description and BlogPosting markup', async () => {
    const post = await pick((p) => p.locale === 'en');
    const html = renderPost(post, { siteUrl, css: '', posts: await all() });

    expect(html).toContain(`<link rel="canonical" href="${siteUrl}${post.url}">`);
    expect(html).toContain('<meta name="description"');
    expect(jsonLdOf(html)).toMatchObject({ '@type': 'BlogPosting', inLanguage: 'en' });
  });

  it('cross-links translations with hreflang and an x-default', async () => {
    const post = await pick((p) => p.slug === 'search-youtube-transcript' && p.locale === 'en');
    const html = renderPost(post, { siteUrl, css: '', posts: await all() });

    expect(html).toContain('hreflang="ar"');
    expect(html).toContain('hreflang="en"');
    expect(html).toContain('hreflang="x-default"');
  });

  it('sets RTL direction and language on Arabic pages only', async () => {
    const posts = await all();
    const ar = posts.find((p) => p.locale === 'ar')!;
    const en = posts.find((p) => p.locale === 'en')!;
    expect(renderPost(ar, { siteUrl, css: '', posts })).toContain('<html lang="ar" dir="rtl">');
    expect(renderPost(en, { siteUrl, css: '', posts })).toContain('<html lang="en" dir="ltr">');
  });

  it('renders the article body as real markup, not escaped markdown', async () => {
    const post = await pick((p) => p.locale === 'en');
    const html = renderPost(post, { siteUrl, css: '', posts: await all() });
    expect(html).toContain('<h2>');
    expect(html).toContain('<p>');
    expect(html).not.toContain('## ');
  });

  it('links every post from the index for that locale', async () => {
    const posts = await all();
    for (const locale of ['en', 'ar']) {
      const index = renderIndex({ locale, posts, siteUrl, css: '' });
      for (const post of posts.filter((p) => p.locale === locale)) {
        expect(index).toContain(`href="${post.url}"`);
      }
    }
  });

  it('colours titles with the brand accent via theme variables, not raw hex', async () => {
    const post = await pick((p) => p.locale === 'en');
    const posts = await all();
    const styles = /<style>(.*?)<\/style>/s.exec(renderPost(post, { siteUrl, css: '', posts }))![1];

    expect(styles).toMatch(/\.qlf-post h1\{[^}]*color:var\(--color-accent\)/);
    expect(styles).toMatch(/\.qlf-index-list h2 a\{[^}]*color:var\(--color-accent-strong\)/);
  });

  it('gives every post a large social card with absolute image dimensions', async () => {
    for (const post of await all()) {
      const html = renderPost(post, { siteUrl, css: '', posts: await all() });

      // A 1200x630 card is 1.91:1 — what Facebook wants and what Twitter's
      // summary_large_image expects. `summary` (small) letterboxes a wide card.
      expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
      expect(html).toContain('<meta property="og:image" content="https://qfza.app/og-blog.png">');
      expect(html).toContain('<meta property="og:image:width" content="1200">');
      expect(html).toContain('<meta property="og:image:height" content="630">');
      expect(html).toContain('<meta name="twitter:image" content="https://qfza.app/og-blog.png">');
    }
  });
});
