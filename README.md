# Firewood Company

A static marketing page for Madrone firewood at **$700 per full cord**.

No build step, database, analytics, or payment processing. The request form stays in the browser: it prepares an email draft or copies the request. It does not send anything to a server.

## Run locally

From this directory:

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

You can also open `index.html` directly. An internet connection loads the Fraunces and Outfit typefaces. If those are blocked, the page uses Palatino and Avenir/Segoe fallbacks.

`/pricing` (or `pricing.html`) repeats the same $700 cord price.

## Before you publish

Search the project and replace every occurrence:

- `Your town` — the delivery area (`data-price-per-cord` is not this; leave that alone)
- `you@example.com` — the address that receives order drafts (visible text and `mailto:` links)

The price lives in the page copy and on `<body data-price-per-cord="700">`. The form multiplies that figure by the number of cords. Change both the visible `$700` and `data-price-per-cord` together if the price ever changes.

## Files

- `index.html` — the page
- `styles.css` — layout and type
- `site.js` — menu, cord total, and the on-device request draft
- `pricing.html` — the same price for the `/pricing` path
- `favicon.svg`
