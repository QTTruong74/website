# Credits, Licenses and Sources

Everything on this website that was **not written by the site owner** is listed here:
what it is, where it was downloaded from, when, and under which license.

Last updated: 2026-11-22

## Privacy: no external requests

The site loads **nothing** from third-party servers. All fonts, scripts and styles are
served from this repository (GitHub Pages). In particular, **Google Fonts is not used**,
so visitors' IP addresses are not sent to Google. The only external links are normal
links the visitor clicks (GitHub, LinkedIn, email).

## Fonts (self-hosted in [`fonts/`](fonts/))

Both fonts are licensed under the **SIL Open Font License, Version 1.1 (OFL-1.1)**. The OFL
allows free use (including commercial), embedding and redistribution, as long as the license
and copyright notice stay with the fonts and the fonts are not sold on their own.
License text: <https://openfontlicense.org>

### VT323 (body text)

| | |
|---|---|
| Copyright | Copyright 2011, The VT323 Project Authors (peter.hull@oikoi.com) |
| License | SIL OFL 1.1 – full text in [`fonts/LICENSE-VT323-OFL.txt`](fonts/LICENSE-VT323-OFL.txt) |
| Downloaded from | npm package `@fontsource/vt323` v5.3.0 – <https://www.npmjs.com/package/@fontsource/vt323> (project page: <https://fontsource.org/fonts/vt323>) |
| Downloaded on | 2026-11-14 |
| File used | `vt323-latin-400-normal.woff2` (Regular) – Latin subset only |

### Jersey 10 (headings, buttons, labels)

| | |
|---|---|
| Copyright | Copyright 2023 The Soft Type Project Authors (https://github.com/scfried/soft-type-jersey) |
| License | SIL OFL 1.1 – full text in [`fonts/LICENSE-Jersey-10-OFL.txt`](fonts/LICENSE-Jersey-10-OFL.txt) |
| Upstream project | <https://github.com/scfried/soft-type-jersey> |
| Downloaded from | npm package `@fontsource/jersey-10` v5.3.0 – <https://www.npmjs.com/package/@fontsource/jersey-10> (project page: <https://fontsource.org/fonts/jersey-10>) |
| Downloaded on | 2026-11-14 |
| File used | `jersey-10-latin-400-normal.woff2` (Regular) – Latin subset only |

**Where the font files originally come from:** the Fontsource npm packages bundle the font
files from the open-source `google/fonts` repository on GitHub
(<https://github.com/google/fonts>) and convert them to `.woff2` web format. The files were
downloaded **once** (from the npm registry) and are now stored in this repository. Visitors
never contact Google, Fontsource or npm.

Both fonts are unmodified apart from the web-format (`.woff2`) conversion and the Latin
subsetting done by Fontsource.

**How they are used on the site:** the same two `.woff2` files are embedded inside
[`style.css`](style.css) as base64 data (so they load in every browser, even when a page is
opened straight from disk). The standalone copies in [`fonts/`](fonts/) are kept as the
reference originals together with their license texts. If you ever update a font, update both.

### Checksums (SHA-256) of the font files in this repository

```
8ddbebcc1048154132e1d78eb9b1f7850bca1b7d857035ccf1cb4318ebc615b6  fonts/vt323-latin-400-normal.woff2
a606eb9b440abe7386c0e8aa2c081fb40d4a241758e2b0e49fdd963741ac4590  fonts/jersey-10-latin-400-normal.woff2
```

Verify with: `shasum -a 256 fonts/*.woff2`

### Fonts tried earlier and removed

IBM Plex Mono, Press Start 2P and Pixelify Sans (all OFL 1.1) were used in earlier versions of
the design and have been **removed** from the repository. They are no longer used.

## Code and design

| File | Origin | License / notes |
|---|---|---|
| [`board.js`](board.js) | Animated pixel-art circuit-board background, written for this site. No third-party libraries or code were copied from elsewhere. | Original work for this site; no external dependencies. |
| [`index.html`](index.html), [`cv.html`](cv.html), [`style.css`](style.css) | Written for this site. | Original work; no frameworks, no CDN files. |
| [`.github/workflows/static.yml`](.github/workflows/static.yml) | Standard "deploy static content to GitHub Pages" workflow, based on the starter template GitHub publishes at <https://github.com/actions/starter-workflows>. It only runs GitHub's own actions (`checkout`, `configure-pages`, `upload-pages-artifact`, `deploy-pages`). | MIT License, Copyright (c) 2020 GitHub (<https://github.com/actions/starter-workflows/blob/main/LICENSE>). Not part of the website itself. |
| Icons / favicon | Inline SVG written for this site (the "QT" tab icon); the page itself uses no icon libraries or images. | Original work. |

## Names and trademarks

Product and company names on the site (for example STM32, SDL2, Vue, Node.js, MySQL, Chart.js,
GitHub, LinkedIn, TU Berlin, HTW Berlin) belong to their respective owners. They are used only as
plain text to describe my education, experience and the technologies I have worked with. No logos,
images or other branded material of third parties are used.

## Keeping this file up to date

If you add anything new to the website (a font, image, icon, script, template, photo),
add a row here with: what it is, the download URL, the date, and the license.
