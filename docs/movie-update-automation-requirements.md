# Movie Update Automation — Requirements Document

## What Is Faniverz?

Faniverz is a movie discovery app focused on Telugu cinema (and expanding to other Indian languages). The app has an **admin panel** where movies are managed — their posters, trailers, release dates, cast, OTT streaming info, etc.

Today, all of this is updated manually. The automation should **monitor the internet for movie updates and apply them in the admin panel automatically** (or flag them for human review when unsure).

---

## Before You Start

1. Read the product training manual to understand the app end-to-end.
2. Get admin panel access from the team.
3. Manually create 2–3 movies and edit them to understand the full workflow — add posters, trailers, cast, release dates, OTT platforms, etc.
4. Only then begin building the automation.

---

## Sources to Monitor

The automation must watch these sources continuously (every 10–15 minutes):

### 1. X (Twitter)

Subscribe to / monitor these types of accounts:

- **Production house official handles** — e.g., @MythriOfficial, @SVC_official, @SitharaEnts, @HaarikаHassine, @GeethaArts, @UV_Creations, @DilRajuProdctns, etc.
- **Film news handles** — e.g., @Telugu360, @IdlebrainMedia, @123telugu, @greatandhra, @ciaborede, etc.
- **Major actor/director handles** — official handles of top Telugu actors and directors.
- **Official movie handles** — created per-movie, e.g., @PushpaTheMovie, @GameChangerFilm, etc.

### 2. YouTube

Subscribe to / monitor these channels:

- **Production house YouTube channels** — Mythri Movie Makers, Anil Sunkara AKE, Sri Venkateswara Creations, Geetha Arts, UV Creations, etc.
- **Music label channels** — Aditya Music, Lahari Music, Saregama Telugu, T-Series Telugu, Mango Music, etc.
- **Official movie channels** — when they exist for specific films.

### 3. Instagram

Monitor the same production houses, actors, and movie accounts as X — most post on both platforms.

### 4. Facebook

Monitor official movie pages and production house pages.

---

## What Counts as an Update

When monitoring these sources, look for these specific types of movie updates:

| Update Type                             | Example                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| **New movie announcement**              | "Excited to announce our next film #MovieTitle" with a title card or first look |
| **New poster or first look**            | An image posted with "#MovieName First Look" or "Title Poster"                  |
| **New trailer, teaser, or song**        | A YouTube link posted with "Official Trailer", "Teaser", "Lyrical Video", etc.  |
| **Release date announcement or change** | "Releasing on June 15th" or "Postponed to July"                                 |
| **New cast/crew joining**               | "Welcome aboard @ActorName" or press articles about casting                     |
| **OTT/streaming announcement**          | "Now streaming on Netflix" or "Digital rights acquired by Amazon Prime"         |
| **OTT streaming date**                  | "Streaming from March 25th on Aha"                                              |
| **Certification**                       | "Censored with U/A certificate"                                                 |
| **Runtime**                             | Usually from censor reports — "Runtime: 2h 34m"                                 |
| **Production house attachment**         | "Produced by Mythri Movie Makers and Sukumar Writings"                          |
| **Title change**                        | When a movie's working title changes to final title                             |

---

## What to Do With Each Update

### For movies that already exist in the admin panel

| Update Found                                     | Action in Admin Panel                                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| New poster / first look image                    | Go to the movie → **Posters tab** → Upload the image as a new poster                                                      |
| New backdrop / banner image                      | Go to the movie → **Posters tab** → Upload as a new backdrop                                                              |
| New trailer / teaser / song (YouTube)            | Go to the movie → **Videos tab** → Add the YouTube video with correct type (trailer, teaser, song, glimpse, making, etc.) |
| Release date announced or changed                | Go to the movie → **Basic Info tab** → Update the Release Date field                                                      |
| New cast member                                  | Go to the movie → **Cast & Crew tab** → Search for the person, add them with their role                                   |
| New crew member (director, music director, etc.) | Go to the movie → **Cast & Crew tab** → Add as crew with their department/role                                            |
| OTT platform announced                           | Go to the movie → **Releases tab** → Add the platform with the streaming date (if known)                                  |
| Certification received                           | Go to the movie → **Basic Info tab** → Set certification (U, U/A, or A)                                                   |
| Runtime confirmed                                | Go to the movie → **Basic Info tab** → Update runtime in minutes                                                          |
| Production house attached                        | Go to the movie → **Cast & Crew tab** → Production Houses section → Add the production house                              |

### For brand new movies (not yet in the admin panel)

1. Go to **Movies → Create New Movie**
2. Fill in whatever is known from the announcement:
   - **Title** (required)
   - **Release date** (if announced, otherwise leave blank)
   - **Original language** (Telugu, Hindi, Tamil, etc.)
   - Upload the **first look / title poster** if one was shared
   - Add the **teaser/trailer** if one was released alongside the announcement
   - Add any **cast/crew** mentioned in the announcement
   - Add the **production house**

---

## Confidence and Review Rules

Not every social media post is reliable. The automation needs judgment.

### Auto-apply (high confidence — no human review needed)

- A YouTube video on an **official production house channel** — this is always real.
- A poster shared by the **official movie handle or production house** — this is always real.

### Flag for human review (do NOT auto-apply)

- **Release date changes** — these are critical and sometimes based on rumors.
- **New movie announcements** — need to verify it's a real announcement, not fan-made content.
- **OTT platform and date** — sometimes leaked or rumored before official confirmation.
- Any update from a **news handle** (not an official source) — could be speculation.
- **Anything the automation is unsure about** — when in doubt, always flag it.

The automation should maintain a **review queue** — a list of pending updates that a human needs to approve, reject, or edit before they go live in the app.

---

## Deduplication Rules

- **Don't add the same poster twice.** The same image is often posted on X, Instagram, and Facebook simultaneously — that's one poster, not three.
- **Don't add the same YouTube video twice.** The same trailer gets shared by multiple accounts — that's one video, not multiple.
- **Don't create a movie that already exists.** Match by title, even with slight spelling variations (e.g., "Pushpa 2" vs "Pushpa: The Rule").
- **If the same release date is announced by 3 different accounts, that's one update, not three.**

---

## Watchlist Management

The list of accounts to monitor should be easy to add to and remove from. Start with:

- **~20–30 production house accounts** (across X, YouTube, Instagram, Facebook)
- **~10–15 film news accounts** (primarily on X)
- **~20–30 major actor/director accounts** (on X and Instagram)
- **Per-movie official accounts** as they get created for new films

The engineer should research and compile the full initial watchlist of Telugu film industry accounts across all platforms.

As the app expands to other languages (Hindi, Tamil, Kannada, Malayalam), new accounts for those industries should be added to the watchlist.

---

## Monitoring Frequency

| Source          | Check Every                                                      |
| --------------- | ---------------------------------------------------------------- |
| **YouTube**     | 10 minutes (trailers drop at specific times; timeliness matters) |
| **X (Twitter)** | 10–15 minutes                                                    |
| **Instagram**   | 10–15 minutes                                                    |
| **Facebook**    | 10–15 minutes                                                    |

---

## Success Criteria

The automation is working correctly when:

1. A new trailer drops on YouTube and appears in the admin panel **within 15 minutes**.
2. A poster is shared on X/Instagram and gets uploaded to the right movie **within 15 minutes**.
3. A release date announcement is **flagged for review within 15 minutes**.
4. A brand new movie announcement is **flagged for review with extracted details within 15 minutes**.
5. **No duplicate entries** are created (same poster, same video, same movie).
6. **No false or rumored information** is auto-applied without review.
7. The review queue is manageable — most routine updates (posters, trailers) are handled automatically, and **only judgment calls reach the queue**.
