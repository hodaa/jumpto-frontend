---
title: Privacy Policy
description: How Qfza handles the video links, search terms, and analytics data you give it.
---

Qfza ("the app") searches the text of a YouTube video so you can jump to the moment a word or phrase was said. This policy explains what the app does with the information you provide.

## What you give us

To run a search, the app sends two things to our server: **the YouTube video URL** you paste, and **the word or phrase you search for**. Our server uses them to retrieve the video's transcript and report where your phrase appears.

## What we do with it

Your video URL and search term are **processed in order to return your results**. The app does not build a profile from them and does not sell them to anyone.

Results are cached in your browser's memory so that searching the same video again is instant. That cache:

- lives only in the tab you are using,
- holds at most 20 recent searches,
- is never written to disk, and
- disappears when you close or refresh the page.

We do not use browser storage to keep a record of what you searched for.

## What is stored on your device

The app sets no cookies of its own. It saves one preference in your browser's local storage: your **language choice** (English or Arabic), under the key `qfza.lang`. That value never leaves your browser and you can clear it at any time through your browser's settings.

## Analytics

We use two analytics services to understand which parts of the app are used:

- **Google Analytics 4**, provided by Google, which may set the cookies `_ga` and `_ga_<property-id>`.
- **Umami**, a privacy-focused analytics service, which is cookieless and uses your IP address only to derive an approximate country.

They record page views and the following interactions: a search was submitted (from cache or from the network), a search failed, a search was cancelled, and the interface language was changed.

**We do not send your search term to analytics.** A search event tells us only whether it was served from cache or the network, and a failure event tells us which error occurred — never the words you typed or the video you picked.

## Shared links and your address bar

If you share a moment from a result, the app builds a link in this form:

```
https://qfza.app/?v=<video-id>&t=<seconds>
```

This means the **video ID and timestamp sit in your address bar**. Analytics services normally receive the full address of the page you opened, including its query string, so opening or sharing one of these links can cause the video ID and timestamp to appear in the analytics providers' logs. If you would rather not disclose which video you are watching, avoid opening shared links on a shared or monitored device.

## Service providers and third parties

| Provider         | What it does                                                                | Where it runs |
| ---------------- | --------------------------------------------------------------------------- | ------------- |
| YouTube / Google | Hosts the videos and the transcripts we read, and delivers embedded players | Worldwide     |
| Google           | Provides Google Analytics 4                                                 | Worldwide     |
| Umami Cloud      | Provides Umami analytics                                                    | United States |

Links to YouTube take you to a third-party site governed by **Google's own privacy policy**, not this one.

## International transfers

Some of the providers above process information outside the EEA and the UK. Where information is transferred without an adequacy decision, transfers rely on safeguards such as Standard Contractual Clauses. You can contact us for more detail on the safeguards used.

## Retention

We keep information only for as long as it is needed for the purpose it was collected for. Analytics data is retained for a limited period and then deleted; standard web-server logs (such as your IP address and the time of a request) may be retained for a short period for security and troubleshooting.

## Your rights

Depending on where you live, you may have the right to:

- ask what information we hold about you, and get a copy,
- correct information that is inaccurate or incomplete,
- ask us to delete information,
- restrict or object to how we use it,
- receive it in a portable, machine-readable format, and
- complain to your local data-protection authority.

Because the app does not keep a profile of you, there is normally nothing for us to look up. The fastest way to exercise a right is to write to the address below. If your request relates to Google Analytics, Google also provides its own [data-privacy controls](https://myaccount.google.com/data-and-privacy).

## Children's privacy

The app is not directed at children under 13, and we do not knowingly collect information from them. If you believe a child has provided us with information, contact us and we will delete it.

## Changes to this policy

If we change how the app handles information, we will update this page and change the date at the top. Continuing to use the app after a change means the updated policy applies.

## Contact

Questions about this policy, or a request about your information, can be sent to **<support@qfza.app>**. You can also [read this page in Arabic](/ar/privacy/).
