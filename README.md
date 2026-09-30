# Qfza (قفزة)

**Jump to the exact moment a phrase is spoken in a YouTube video.**

Paste a YouTube URL, enter a word or phrase, and Qfza searches the video's transcript
to return the exact timestamps where that phrase is spoken — so you watch the scene
instead of scrubbing.

## Live site

- English: <https://qfza.app/>
- عربي: <https://qfza.app/>

Hosted on Vercel. The retired blog URLs are permanently redirected in
`vercel.json`; `middleware.ts` returns a 503 with a bilingual notice while
`VITE_MAINTENANCE` is on.

## Features

- **Exact phrase matching** — the full transcript is searched word by word, so you only
  get timestamps where the exact phrase appears.
- **Faster repeat searches** — transcripts are cached for the session, so searching the
  same video again skips the processing wait.
- **Watch at the right second** — every result links straight to the exact moment on
  YouTube.

## Tech

React + TypeScript + Vite + Tailwind CSS v4, bilingual (EN/AR) with RTL support.

## Development

```bash
npm install
npm run dev        # start the dev server
npm test           # vitest
npm run lint       # eslint
npm run build      # typecheck + vite build + prerender shell + sitemap/404/robots
```