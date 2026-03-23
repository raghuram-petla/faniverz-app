# Faniverz Mobile App — Design Principles

> Extracted from 189 development sessions. This document captures every visual, interaction, and behavioral design decision made during the build. Follow these principles for consistency.

---

## 1. Color Palette & Theming

### Dark Theme (Primary)

- **Background**: Pure black (`#000000`)
- **Cards/Surfaces**: `zinc-900`
- **Primary accent**: `red-600` (buttons, active states, loading indicators)
- **Status colors**: Theatrical = `red-600`, OTT = `purple-600`, Upcoming = `blue-600`

### Light Theme

- Must be tested alongside dark for every change — elements visible in dark must remain visible in light and vice versa
- Light theme uses inverted surface tokens but keeps the same accent colors
- Post divider lines: darker in dark theme, lighter in light theme (contrast-appropriate)
- Controls overlaid on images (spotlight, hero) do NOT invert with theme — they use contrast-based coloring against the image

### Rules

- Every UI change must look correct in both dark and light themes before it's considered done
- Use semantic color tokens (`bg-surface-card`, `text-on-surface`, `text-on-surface-disabled`) — never hardcode hex values
- Status bar icons must be visible in both themes

---

## 2. Safe Area & Status Bar

- **Mandatory**: Every screen uses `useSafeAreaInsets()` — content must never bleed into the Dynamic Island / status bar zone
- Apply `paddingTop: insets.top` consistently (never hardcode values like `paddingTop: 56`)
- Hero/backdrop images start AFTER the safe area padding, not under it
- Bottom content adds `insets.bottom + 40` padding to clear the tab bar
- All screens use a centralized `SafeAreaCover` component
- Pull-to-refresh indicators must not appear in the safe area gap

---

## 3. Navigation Architecture

### Bottom Tab Bar (5 tabs, left to right)

1. **News Feed** — primary/landing screen with Faniverz branding
2. **Spotlight** — hero carousel, curated content
3. **Discover** — search and filters
4. **Watchlist** — saved movies
5. **Profile** — user info, settings

### Stack Navigation

- When stack depth >= 2, show a **home button next to the back button** (left side)
- Home button calls `router.dismissAll()` to collapse the entire stack
- Home button icon size must match back button icon size exactly
- No onboarding screens — app launches directly to News Feed

### Screen Transitions

- **No animated transitions between screens** — navigation must be instant/quick
- Smooth transitions were explicitly rejected: "All of them must be removed; they must be quick"

### After Auth Actions

- After logout: stay on Profile screen showing guest/login state
- After login: stay on current screen, don't jump to home
- Login accessible from both Profile and Watchlist screens

---

## 4. Header Behavior

### Scroll-Away Header (News Feed)

- YouTube-style: slides away on scroll-down, reappears on scroll-up
- Does NOT stay fixed while content flows under it (that was rejected as "ugly")
- The horizontal category panel scrolls with content

### Collapsing Hero Header (Media, Actor Detail)

- Starts expanded with immersive backdrop, collapses to compact nav bar on scroll
- Actor page: photo animates from 120px centered hero → 48px inline in nav bar; name scales from 24px → 18px
- Photo and name animate as single floating elements (not two copies appearing/disappearing)
- In collapsed state: avatar and name are side-by-side (not stacked)
- Back/home/follow buttons stay fixed — never scroll with content

### Branding

- Home header shows the Faniverz icon + stylized italic text (Exo 2 font, bold/italic)
- Icon and text must be vertically center-aligned
- Plain text for "Faniverz" is not acceptable

---

## 5. News Feed Layout

### Structure: X/Twitter-Style

- Two-column layout: left avatar gutter (60–64px) + right content column
- Avatar column accommodates 48–52px avatar + gap
- Left padding: 8px (reduced from 16px after feedback: "too much space toward the left")

### Entity Avatar Shapes

- **Movie**: Portrait rounded rectangle (52×78px, 2:3 poster ratio), `contentFit="contain"`
- **Actor/Person**: Diamond shape (rotated 45-degree rounded square)
- **User**: Circle
- **Production House**: Square with rounded corners
- All avatars have a white border

### Post Structure (top to bottom)

- Badge on its own line above the title (not inline)
- Timestamp in user's local timezone, up to minutes
- No pinned posts (explicitly removed)

### Action Bar (5 items, `flex: 1` each for equal spacing)

1. Comments (chat bubble + count)
2. Upvote (love heart icon + count, turns green when voted)
3. Downvote (broken heart icon + count, turns red when voted — "dramatic" broken heart)
4. Views (eye icon + count, display-only)
5. Share (share icon, works without sign-in)

- All counts default to 0 (never "undefined")
- Follow button in the name row, right-aligned, with red-600 accent

### Media in Feed

- YouTube videos and posters go **edge-to-edge** (no horizontal padding) — modeled after YouTube
- One video per row (never two-column grid — "videos look so small" was rejected)
- Posters shown at ~70% screen width with top/bottom 15% crop; tapping shows full image
- Text elements get 12px horizontal padding

---

## 6. Spotlight / Hero Carousel

- Shows 5–7 movies
- **Manually swipeable** — auto-scrolling every second was rejected; manual swipe takes precedence
- Loop animation: forward-animate from last to first (append clone of first item for infinite scroll illusion)
- Backdrop brightness must match movie detail hero (no dull transparent overlay)
- Focal point offset from admin applies to both spotlight and movie detail hero (single setting)

### Hero Carousel Buttons

- All action buttons share identical style: `rgba(240,240,240,0.7)` background, black text/icons
- This was iterated through: white → greyish → more whitish
- OTT platform icons on spotlight must match the icons used on movie posters
- Controls overlaid on images do NOT invert with theme

---

## 7. Movie Detail Page

### Tab Structure

- Overview | Media | Cast | Reviews (4 tabs)
- Tab indicator animation speed: "too slow" → speed it up

### Media Tab Behavior

- Tapping Media tab pushes a new full-screen Media screen (doesn't show inline)
- Media tab is **always shown** even with no content — display empty state, never hide the tab ("Completely hiding is not good")
- Overview shows a `MediaSummaryCard`: full-width 16:9 thumbnail + "X Videos · Y Photos" + "Explore All Media →"

### Media Screen

- Collapsing hero header with backdrop
- Sub-tabs: Videos | Photos
- Filter pills for categories (Teaser, Trailer, Song, BTS) with counts
- Videos: full-width 16:9 cards, one per row — never compact/small
- Photos: 2-column grid with title overlay
- Home button always shown (`forceShowHome`)

### Hero Backdrop

- Immersive banner with 4-stop gradient overlay
- Floating back/home nav buttons
- Movie title with text shadow
- `paddingTop: insets.top` on container

### Cast & Crew

- Both cast AND crew show photos
- Cast ordered by `display_order` per movie (not global `tier_rank` — that concept was rejected)
- Crew shows specific role titles (Director, Producer, DOP — not generic "Technician")

---

## 8. Video Player

- YouTube iframe with custom overlay controls
- **Play button**: top-left corner of thumbnail, opacity 0.2 (very transparent)
- YouTube play button (red) is hidden
- Tapping play must simultaneously dismiss overlay AND start playback
- YouTube icon opens native YouTube app (not in-app web view)
- Share button opens iOS native share sheet
- Progress bar visible, draggable, positioned slightly above bottom edge
- When paused, show paused frame (not thumbnail)
- Thumbnail shows actual YouTube thumbnail image (not placeholder color)

---

## 9. Image Handling

### Placeholders & Fallbacks

- Every image has a placeholder fallback from `src/constants/placeholders.ts`
- Never show broken images, blank/black screens, or "undefined"
- Gender-appropriate placeholder avatars: male, female, minor male, minor female variants

### Aspect Ratios

- Poster: 2:3 portrait
- Backdrop/Hero: 16:9
- Image orientation must match tile orientation (portrait tile + landscape image = "ugly")

### Full-Screen Image Viewer

- Black background in both themes
- Double-tap to zoom ~400% with finger-scrollable pan + momentum
- Extra scroll room at top/bottom (for Dynamic Island area)
- Swipe down to dismiss
- Close button disappears immediately on dismiss gesture (no fade transition)

### Loading

- Show skeleton placeholder while loading (never blank)
- Thin progress bar in red-600 at TOP of image while hi-res loads
- Feed shows feed-size image first, seamlessly transitions to full-res

### Shared Element Transitions

- Tapping poster in feed: image flies from card position to full screen (Pinterest-style)
- On dismiss: flies back to card position
- Uses `measureInWindow` (not Reanimated's `measure()`)

---

## 10. Follow vs Watchlist

### Context-Sensitive Single Button

- Pre-OTT movies (announced/upcoming/in_theaters): show **Follow** (heart-outline icon)
- Streaming movies: show **Watchlist** (bookmark icon)
- The `+` combining both was rejected: "This + design looks so ugly"
- Heart-outline chosen over bell (bell conflicts with notifications icon)

### On Movie Detail Header

- Button order: Follow → Watchlist → Share
- Uses `heroButton` style: `rgba(0,0,0,0.4)` dark circle background

---

## 11. Pull-to-Refresh

- Consistent across ALL screens (same spinner size, same colors)
- Theme-aware colors (different in dark vs light)
- X/Twitter pattern: down-arrow appears when pulling, rotates at threshold, releases to refresh
- Arrow appears only after sufficient pull distance (not half-visible at tiny distance)
- If user drags back up before threshold, cancel the refresh

---

## 12. Loading & Empty States

### Loading

- Never show blank/null screens — always show skeleton/shimmer
- Implemented on: spotlight, movie detail, release calendar, watchlist
- `LoadingCenter`: centralized ActivityIndicator (red-600, large, centered)
- Never show "0" for stats while loading — use skeleton instead

### Empty States

- Every list has an empty state (no blank screens)
- Media tab shows "No videos available yet" / "No photos available yet"
- All numbers default to 0

---

## 13. Animations

### Implemented Animations

- `AnimatedPressable` — scale on press/release
- Star rating bounce, empty state spring, carousel dot width/opacity
- Review modal scale, vote button bounce, follow button bounce
- Filter pills FadeIn/FadeOut, sort chevron rotation
- Tab indicator slide, accordion chevron rotation
- Theme crossfade LayoutAnimation

### Animation Rules

- Configurable via settings toggle — if disabled, none play
- Screen-to-screen transitions: NO animation (must be instant)
- Spotlight carousel loop: animate forward (never backward through all slides)
- Tab indicator: fast (initial speed was "too slow")
- Full-screen poster: source poster disappears from feed and "flies" to full screen

---

## 14. Profile Screen

### Guest State

- Shows ONLY "Sign In / Sign Up" prompt (not just "Sign In")
- No menu items, no settings, no editing visible

### Authenticated State

- Profile info, edit options, settings, favorites, watched movies
- Logout lives in Account Settings (separate screen), not on the profile screen itself

---

## 15. OTT Platform Display

- Platform icons must not be cropped at bottom — display complete with proper sizing
- Thin borders (not thick)
- White-background logos (like Aha) need internal padding
- Dark logos (like JioHotstar) need visible borders (not black-on-black)
- "Browse by Platform" shows all platforms with real logos (not text)
- Watch links filtered by user's detected country (no manual country selector in-app)

---

## 16. Actor/Person Detail Page

- Photo and name center-aligned (not offset)
- Full bio: height, weight, birth date, nationality
- Tapping photo shows full screen
- "Also known as" filters out empty strings
- Collapsible header with animate-to-navbar pattern (see Header Behavior)

---

## 17. Release Calendar & Infinite Scroll

- Default: upcoming movies from today, paginated by 10
- Filters: year, month, platform, genre (all independently nullable)
- No pre-selected filters on load (auto-selecting was a bug)
- "Clear All Filters" must work reliably
- Infinite scroll on: Discover, Calendar, Watchlist, actor lists

---

## 18. Search

- Search input strips leading/trailing whitespace before executing
- Full-text server-side search (not just current page)
- The Discover screen needs a back button
- Search button on Home and Spotlight screens: identical circular 40×40 button
