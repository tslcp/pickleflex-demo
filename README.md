# PickleFlex (Demo)

A flexible, league-style pickleball tournament web app. This is a local demo — no
real accounts, payments, or emails are involved, and all data lives on your own
machine.

## 1. Run it

**Requirements:** [Node.js](https://nodejs.org) 20 or later.

```bash
npm install
npm run dev
```

Then open **http://localhost:3000** in your browser.

To stop the app, go back to the terminal and press `Ctrl+C`.

## 2. Sign in

There's no real authentication behind this — it's a local account system for the
demo. Go to `/signup` and create any account with a made-up name, any email
address (doesn't need to be real), a zip code (any real 5-digit one), and a
password (8+ characters). You'll be signed in automatically afterward.
`/signin` works the same way for a returning account.

## 3. What to try

### Player view
- **Player Dashboard** — your matches, quick stats.
- **Browse Tournaments** → click into **"Summer Smash Open"** — this is the
  tournament sign-up flow, built around a "cohort" scheduling system: instead
  of picking one exact time, you commit to a block of 3 candidate days (e.g.
  Mon/Wed/Fri) and mark at least 2 of them as available in a 3-hour window.
  This guarantees any two signed-up players in the same cohort share at least
  one overlapping day.
  - There are **two versions** of this sign-up page to compare — look for the
    toggle/links on the tournament page for the "all-in-one" single-page
    version vs. the "wizard" pop-up version.

### My Availability
Go to **My Availability** in the sidebar to record when you can (or can't)
play, for matching you with other players later:

- The calendar works like Google Calendar: a **Month** view with your times
  as chips in each day, and a **Week** view with them as blocks on an hourly
  grid (switch with the Month / Week toggle; **Today** and the arrows move
  around). Click a day, a chip, or a block to open that day; in Week view
  you can also click or drag on the grid to start a time with it filled in.
  Times of the same kind that touch or overlap (e.g. can't play 5–6 PM and
  6–7 PM) are drawn as one block; the day popup still lists each entry.
- In that popup choose **Can play** or **Can't play** and enter any
  start/end time, or tick **All day** for a whole day (e.g. a day you can't
  play at all). Tick
  **Repeat every <weekday>** to make it a weekly entry instead of a one-off,
  optionally with **Starting** / **Until** dates (blank = every week, no end).
- If a new "can play" time overlaps an existing "can't play" one (or the
  other way round), you're asked to **Override** (the overlapping part takes
  the new value; a weekly entry is split around it) or **Discard** (the new
  entry isn't saved). Same-kind overlaps just merge.
- Deleting (×) a one-off time removes it straight away. For a repeating time
  you choose: **Only** the selected day, the **whole repeat**, or **Choose
  days** (a From/Until range; blank Until = from then on). The rest of the
  repeat is kept around whatever you remove, and still counts as one repeat:
  **whole repeat** later removes every part of it. Leftover parts that would
  only cover past dates aren't kept.
- Any leftover overlap (e.g. from before this check existed) still resolves
  with "can't play" winning, and the day shows what's left as **Free to play**.
- Saved in Supabase (`availability` table). Create it once by running
  `sql/availability.sql` in the Supabase SQL editor. A table created from an
  older version also needs, in order, `sql/availability-repeat-range.sql`
  and `sql/availability-series.sql`.

### Admin view
Go to **Admin Panel** in the sidebar — this is where most of the interesting
mechanics are:

- **Tournament Operations** → **Add Test Player** a few times on a division to
  quickly populate it with fake registrants (each gets a random cohort and
  availability, so you'll see a realistic mix).
- **Generate Schedule** — creates the round-robin match list for the
  tournament. Matches are **scheduled automatically** based on both players'
  cohort availability; a match only stays "Unscheduled" if the two players
  genuinely have no overlapping day (usually because they're in different
  cohorts) — check the **"When"** column in the match table.
- **Generate Bracket** — brackets are generated **per cohort within a
  division**, not for the whole division at once. You'll see one row per
  cohort that has at least 2 registrants (e.g. "Mon / Wed / Fri" and
  "Tue / Thu / Sat" each get their own bracket). This is deliberate: every
  player in a cohort shares the same 3 candidate days, so any two cohort-mates
  are guaranteed to have an overlapping day — meaning every match in a
  cohort's bracket gets auto-scheduled with a real date/time, instead of
  risking a division-wide bracket pairing two players who never share a day.
  - Click **View Bracket** to see it. Byes are handled automatically, matches
    get scheduled the same overlap-based way, and — for double elimination —
    you can watch a loser drop into the losers' bracket and, if they make it
    all the way back to the Grand Final and win game 1, trigger a genuine
    "bracket reset" second final.
  - Matches whose *next* opponent isn't decided yet (still waiting on another
    match to finish) show as **"Tentative"** with a preview of both possible
    scheduled times — it locks in instantly once the other match ends.
  - The bracket page has both a division picker and a cohort picker.

### Reschedule flow
On a bracket page, under **My Matches**, if you're signed in as one of the two
players in a match, you'll see **Report Score** and **Request Reschedule**
buttons:
- Reschedule lets you pick any new date/time yourself.
- Each player gets **2 reschedules per tournament** — try it a third time to
  see it get blocked. (An admin-override path exists in the API to bypass
  this, but there's no UI button for it yet.)

### Public view
- **Public Standings** — read-only leaderboard, computed live from actually
  completed round-robin match results (not mock data) — report a score on
  the Player Dashboard, then check standings to see it move. Named "public"
  for a future version without a sign-in wall; this demo still requires
  being signed in to view any page.

## 4. Resetting demo data

Data is split across two places:

- **Accounts + brackets** live in a local SQLite file at `data/pickleflex.db`.
  Delete that file (server must be stopped first) to wipe all accounts and
  brackets and start clean.
- **Tournaments, sign-ups, and round-robin matches** live in your browser's
  `localStorage`, not the server. Clearing site data for `localhost:3000` (or
  just using a different browser / incognito window) resets that part
  independently of the database.

## 5. Known limitations (it's a demo)

- No real email/payment integration — "Forgot Password" is a placeholder.
- Doubles team formation has no dedicated sign-up UI yet; brackets currently
  seed from individual registrations only.
- Round-robin standings aren't wired into bracket seeding (brackets seed
  directly from registrations).
