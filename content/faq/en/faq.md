---
title: Frequently Asked Questions
description: What Qfza searches, why a search can come back empty, which videos work, and what happens to your data.
---

The short version: Qfza searches the **transcript** of a public YouTube video for an exact phrase, and gives you the timestamp where that phrase was actually said. The questions below cover how that behaves in practice.

## What exactly does Qfza search?

The transcript — the automatically generated captions that come with every public YouTube video. Your phrase is matched against that text word by word and in order, with no fuzzy matching and no synonyms.

That strictness is the point. A result is a real position inside the video, not a video that merely looks related to what you typed.

## Which videos can I search?

Public YouTube videos, reached through a `youtube.com/watch?v=…` or a `youtu.be/…` link.

Channels, playlists, Shorts, live and embed URLs are not accepted directly — open the video's own watch page and copy that link instead. Private or restricted videos may be unavailable.

## Why does the first search take a few minutes?

Because the transcript has to be fetched and prepared before anything can be searched. Searching the same video again reuses what is already stored, so repeat searches are usually much faster.

## My search found no matches. Why?

Most often, the exact phrase is not in the transcript. Matching works on whole words in order, so a shorter phrase — or one distinctive word taken from the sentence you half-remember — will usually get you there.

Two things are worth knowing before you conclude the video does not mention it:

- The transcript is built from the **audio**. Anything written only on screen is not in it.
- Auto-generated captions get unusual words wrong more often than ordinary ones. Try the nearest common phrasing.

## Why can't it find a word I can plainly see on screen?

Transcripts are generated from audio, so text baked into slides, charts, screenshots or on-screen graphics was never heard, and therefore is not there. Search for the spoken version of what you are looking for.

## What if the video has no speech at all?

Music, ambient footage and silent screencasts have no transcript to search. Qfza says so directly instead of returning an empty result set that looks like a broken search.

## Do I need an account?

No. You can search without signing in at all.

If you do sign in, your searches are kept in your account history so you can return to them later — the video, the phrase, and where it matched.

## Can I delete my saved searches?

Yes. Delete one search at a time, or all of them at once, from your history. Deleting is permanent. Your list is private to your account, and nobody else can see it.

## Can I share the exact moment I found?

Yes. Every match has a share action that builds a link to that second in the video, which is useful for sending someone the exact point you mean.

One thing to be aware of: such a link carries the video ID and the timestamp in its address bar, so opening or sharing it can expose those two values to analytics providers. The [privacy policy](/privacy/) explains this in full.

## Can I take my results somewhere else?

Yes. Copy all of them to your clipboard, or export them as a CSV file.

## What happens to my video link and search phrase?

Both are sent to our server so it can fetch the transcript and do the matching, and neither is sold to anyone. Signed-in searches are kept in your account history until you delete them.

The [privacy policy](/privacy/) is the authoritative answer: it covers what is stored, what is cached where, what analytics record, and how to exercise your rights.

## Which languages is Qfza in?

English and Arabic, and you can switch between them at any time from the header. Your choice is remembered in your own browser and never sent to us.

## Can I use it on my phone?

Yes — the layout adapts to small screens. The URL field also carries a Paste button, for mobile browsers that do not let you paste into a field directly.

## Still stuck?

Write to us — there is a [contact form](/contact/) on the app, and the [blog](/blog/) goes deeper into how transcript search behaves and how to phrase a query well.
