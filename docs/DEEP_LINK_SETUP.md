# Deep Linking & Sharing — Cloud Setup Guide

The app code handles generating share links and receiving deep links. But for the full flow to work (user taps a shared link → app opens or store page shows), you need to configure three things on the server side:

1. Deploy the web landing page to Cloudflare Pages
2. Serve the Apple & Android verification files
3. Replace placeholder values with real credentials

---

## Step 1: Deploy the Landing Page to Cloudflare Pages

The `web/` directory contains everything needed for the website.

### 1a. Create a Cloudflare Pages project

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create**
2. Select **Pages** → **Connect to Git**
3. Choose the `faniverz-app` repository
4. Configure the build:
   - **Project name**: `faniverz` (or whatever you prefer)
   - **Production branch**: `master`
   - **Build output directory**: `web`
   - **Build command**: leave empty (static files, no build step needed)
   - **Root directory**: `/` (the repo root)

### 1b. Connect your domain

1. In the Cloudflare Pages project, go to **Custom domains**
2. Add `faniverz.com`
3. Cloudflare will auto-configure DNS if the domain is already on Cloudflare DNS
4. If not, you'll need to add a CNAME record:
   ```
   CNAME  faniverz.com  →  <your-project>.pages.dev
   ```
5. Wait for SSL certificate provisioning (usually a few minutes)

### 1c. Verify deployment

After deploying, confirm these URLs work:

- `https://faniverz.com/` → your home page
- `https://faniverz.com/movie/test` → the deep link landing page (should show "Opening Faniverz..." then fall back)
- `https://faniverz.com/.well-known/apple-app-site-association` → JSON file
- `https://faniverz.com/.well-known/assetlinks.json` → JSON file

---

## Step 2: Apple App Site Association (iOS Universal Links)

The file `web/.well-known/apple-app-site-association` tells iOS that your app is authorized to handle links from `faniverz.com`. You need to replace the placeholder Team ID.

### 2a. Find your Apple Team ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Click **Membership Details** (or look in the top right)
3. Copy your **Team ID** (a 10-character alphanumeric string like `A1B2C3D4E5`)

### 2b. Update the file

Open `web/.well-known/apple-app-site-association` and replace `TEAM_ID` with your actual Team ID:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "A1B2C3D4E5.com.faniverz.app",
        "paths": ["/movie/*", "/actor/*", "/production-house/*", "/post/*", "/user/*"]
      }
    ]
  }
}
```

The format is `<TeamID>.<BundleID>`.

### 2c. Verify it's served correctly

Apple requires this file to be served:

- At exactly `https://faniverz.com/.well-known/apple-app-site-association`
- With `Content-Type: application/json`
- Over HTTPS (Cloudflare Pages handles this automatically)
- Without any redirects (the `_redirects` file should NOT catch `.well-known` paths — it doesn't, since we only redirect content paths)

**Test it**: Visit the URL in a browser and confirm valid JSON is returned.

### 2d. Validate with Apple's tool

Apple provides a validation endpoint:

```
https://app-site-association.cdn-apple.com/a/v1/faniverz.com
```

After deploying, visit this URL. It should return your AASA file contents. Apple caches this file, so changes may take up to 24 hours to propagate.

---

## Step 3: Android Asset Links (Android App Links)

The file `web/.well-known/assetlinks.json` tells Android that your app is authorized to handle links from `faniverz.com`. You need your app's signing key fingerprint.

### 3a. Get your SHA-256 fingerprint

**For EAS-managed signing (recommended):**

```bash
eas credentials -p android
```

Select your production profile, then look for the **SHA-256 Fingerprint** of the keystore.

**For a local keystore:**

```bash
keytool -list -v -keystore @faniverz__faniverz.jks -alias <alias-name>
```

The fingerprint looks like: `14:6D:E9:83:C5:73:06:50:D8:...` (a colon-separated hex string)

### 3b. Update the file

Open `web/.well-known/assetlinks.json` and replace the placeholder:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.faniverz.app",
      "sha256_cert_fingerprints": [
        "14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5"
      ]
    }
  }
]
```

### 3c. Validate with Google's tool

Google provides a validation tool:

```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://faniverz.com&relation=delegate_permission/common.handle_all_urls
```

This should return your asset links JSON.

---

## Step 4: Rebuild the App

After updating `app.config.ts` with `associatedDomains` and `intentFilters`, you need to create a **new build** for the changes to take effect. These are native-level configurations that don't hot-reload.

```bash
# Development build (for testing)
eas build --profile development --platform all

# Or just iOS / Android
eas build --profile development --platform ios
eas build --profile development --platform android
```

**Important**: Universal links and App Links only work in **production/preview builds**, not in Expo Go. You must use a development build or a production build to test them.

---

## Step 5: Update Store Links (When Published)

Once the app is published to the App Store and Google Play, update the placeholder `href="#"` links in `web/link/index.html`:

```html
<!-- Replace href="#" with actual store URLs -->
<a href="https://apps.apple.com/app/faniverz/id<YOUR_APP_ID>" class="store-btn" id="ios-btn">
  <a
    href="https://play.google.com/store/apps/details?id=com.faniverz.app"
    class="store-btn"
    id="android-btn"
  ></a
></a>
```

---

## Testing the Full Flow

### Test 1: Share from the app

1. Open the app → go to any movie detail screen
2. Tap the share icon
3. Share to yourself (Notes, Messages, etc.)
4. Verify the message contains a `https://faniverz.com/movie/<id>` link

### Test 2: Web landing page

1. Open the shared link in a browser
2. You should see the "Opening Faniverz..." spinner briefly
3. Then the fallback landing page with store buttons

### Test 3: Universal link (iOS)

1. Install a development build with the updated `app.config.ts`
2. Deploy the AASA file to `faniverz.com`
3. Open a `https://faniverz.com/movie/<id>` link from Notes or Messages
4. The app should open directly to the movie detail screen

**Tip**: iOS caches AASA aggressively. If it's not working:

- Reinstall the app
- Reboot the device
- Wait up to 24 hours for Apple's CDN to refresh

### Test 4: App Link (Android)

1. Install a development build
2. Deploy the assetlinks.json file
3. Open a `https://faniverz.com/movie/<id>` link from Chrome or Messages
4. Android should show a disambiguation dialog or open the app directly

**Tip**: Run this to verify Android has registered the app link:

```bash
adb shell pm get-app-links com.faniverz.app
```

---

## Optional: Dynamic OG Tags (Future Enhancement)

Currently, all shared links show the same generic Faniverz preview image and description. For richer previews (showing the actual movie poster, actor photo, etc.), you'd need a **Cloudflare Worker** that:

1. Intercepts requests from social media crawlers (WhatsApp, iMessage, Twitter)
2. Fetches the content metadata from Supabase (title, image URL)
3. Returns dynamically-rendered HTML with content-specific OG tags
4. Passes all other requests through to the static landing page

This is not set up yet — the current implementation uses static branding for all shared links.

---

## Cloudflare-Specific Notes

- **`_redirects` file**: Cloudflare Pages uses this for URL rewriting. The file in `web/_redirects` rewrites content paths to the landing page with a `200` status (rewrite, not redirect), so the browser URL stays as `/movie/123`.
- **`.well-known` directory**: Cloudflare Pages serves static files from `.well-known/` by default with no special configuration needed.
- **HTTPS**: Cloudflare Pages provides automatic HTTPS — both Apple and Google require HTTPS for verification files.
- **Caching**: Cloudflare may cache the AASA/assetlinks files. If you update them, purge the cache from the Cloudflare dashboard → **Caching** → **Purge Everything**.

---

## Checklist

- [ ] Deploy `web/` directory to Cloudflare Pages
- [ ] Connect `faniverz.com` domain to the Pages project
- [ ] Replace `TEAM_ID` in `apple-app-site-association` with your real Apple Team ID
- [ ] Replace `SHA256_FINGERPRINT_HERE` in `assetlinks.json` with your real signing key fingerprint
- [ ] Verify `https://faniverz.com/.well-known/apple-app-site-association` returns valid JSON
- [ ] Verify `https://faniverz.com/.well-known/assetlinks.json` returns valid JSON
- [ ] Create a new EAS build with the updated `app.config.ts`
- [ ] Test sharing from the app and tapping the shared link
- [ ] Update store links in `web/link/index.html` after publishing to App Store / Play Store
