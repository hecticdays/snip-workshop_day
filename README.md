# Snip Backend

A zero-dependency Bun API for creating and resolving short links. Links are held in memory and are cleared when the server restarts.

## Run

```sh
bun start
```

The server listens on port `3000` by default. Set `PORT` to change it, `BASE_URL` to set the origin used in returned short URLs, or `RAILWAY_PUBLIC_DOMAIN` to use `https://<domain>` when `BASE_URL` is unset. Set `PUBLIC_DIR` to serve static files from a directory; `/` serves its `index.html`.

## API

- `POST /api/links` with `{ "url": "https://example.com" }` creates a link and returns its details.
- `GET /api/links` returns all links.
- `GET /:code` redirects to the original URL and increments its hit count.
