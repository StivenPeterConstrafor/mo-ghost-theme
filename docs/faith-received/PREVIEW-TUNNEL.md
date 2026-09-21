# Public local preview

The preview bridge exposes the locally running Ghost site through a temporary Cloudflare Quick Tunnel. It rewrites local navigation and public Cloudflare data URLs so the reader and catalogue work on the tunnel origin. It does not change a production worker or its CORS policy.

From the theme checkout, with Ghost already running on port 2368:

```bash
python3 scripts/check-preview-tunnel.py
python3 scripts/preview-tunnel.py --port 2370
```

In another terminal, use an empty config file so an existing named-tunnel configuration is not selected:

```bash
printf '{}\n' > /tmp/tfr-preview-cloudflared.yml
cloudflared tunnel --config /tmp/tfr-preview-cloudflared.yml --no-autoupdate --url http://127.0.0.1:2370
```

Open the printed HTTPS URL followed by `/the-faith-received/all-works/?collection=all`. Keep both processes and Ghost running. The address changes when a new Quick Tunnel starts. Stop those two processes to close the public preview; Ghost can continue running locally.

Python uses the existing `certifi` package for TLS certificate validation. No secret keys, member tokens or cookies are used or forwarded. The bridge accepts GET and HEAD, blocks account writes and admin routes, and exposes only public file reads plus Scripture chapter/evidence reads. Portal may read public site configuration and the Content API's settings, tiers and newsletters using the public key already present in page markup. Sign-in, Ask requests, payments and account changes are outside this preview. Existing upstream access checks remain in place.

This helper is for temporary review, not production deployment. It does not add authentication to the public reading pages. It streams binary assets, rewrites text data, and avoids logging browsing queries.

The owner's withdrawn Westminster Minutes volume 1 remains excluded from catalogue responses and direct preview requests. The public hostname does not bypass that library policy.
