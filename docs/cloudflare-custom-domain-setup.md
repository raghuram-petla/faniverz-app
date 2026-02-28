# Cloudflare Custom Domain Setup for R2 Buckets

Domain: `faniverz.com` (registered at Squarespace)

For background on why this is needed, see [GitHub issue #17](https://github.com/raghuram-petla/faniverz-app/issues/17).

---

## Step 1 — Add faniverz.com to Cloudflare

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Add a domain**
2. Enter `faniverz.com` → Continue
3. Select the **Free plan** → Continue
4. Cloudflare scans existing DNS records — review and keep any Squarespace website records
5. Note down the **2 nameserver addresses** Cloudflare assigns (e.g. `aria.ns.cloudflare.com`)

---

## Step 2 — Update nameservers in Squarespace

1. Log in to Squarespace → **Domains** → click `faniverz.com`
2. Go to **DNS Settings → Nameservers**
3. Switch to **Custom Nameservers**
4. Replace with the 2 Cloudflare nameservers from Step 1
5. Save — propagation takes a few minutes to a few hours
6. Wait until Cloudflare dashboard shows the domain as **Active**

> Your Squarespace website is unaffected — you're only adding new subdomains.

---

## Step 3 — Connect subdomains to R2 buckets

Once the domain is Active in Cloudflare, for each bucket:

**R2 → open bucket → Settings → Custom Domains → Connect Domain**

| Bucket                     | Subdomain                |
| -------------------------- | ------------------------ |
| `faniverz-movie-posters`   | `posters.faniverz.com`   |
| `faniverz-movie-backdrops` | `backdrops.faniverz.com` |
| `faniverz-actor-photos`    | `actors.faniverz.com`    |

Cloudflare auto-creates the CNAME records — no manual DNS setup needed.

---

## Step 4 — Update env vars and rewrite DB URLs

Update the 3 public URL env vars in production:

```
R2_PUBLIC_BASE_URL_POSTERS=https://posters.faniverz.com
R2_PUBLIC_BASE_URL_BACKDROPS=https://backdrops.faniverz.com
R2_PUBLIC_BASE_URL_ACTORS=https://actors.faniverz.com
```

Then run the URL fix script (no re-uploading — only DB string updates):

```bash
SUPABASE_URL=https://nolfeefxpgngrvhxhnvo.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
R2_PUBLIC_BASE_URL_POSTERS=https://posters.faniverz.com \
R2_PUBLIC_BASE_URL_BACKDROPS=https://backdrops.faniverz.com \
R2_PUBLIC_BASE_URL_ACTORS=https://actors.faniverz.com \
npx tsx scripts/fix-r2-urls.ts
```

---

## Step 5 — Verify

Open a sample `poster_url` from the `movies` table in the browser.
After the first request, subsequent responses should have `CF-Cache-Status: HIT` in the headers.
