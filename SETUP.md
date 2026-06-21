# Backend Setup Guide — Supabase

Your site now reads/writes real data via Supabase instead of mock arrays.
Follow these steps once to finish wiring it up.

## 1. Run the database schema

1. Go to your Supabase project: https://supabase.com/dashboard
2. Open **SQL Editor** in the left sidebar → **New query**
3. Open `supabase/schema.sql` from this folder, copy the whole file
4. Paste it into the SQL editor and click **Run**

This creates 5 tables (`profiles`, `sessions`, `prayers`, `threads`, `replies`),
turns on Row Level Security for all of them, and sets up policies so:
- **Anyone** can read sessions, prayers, threads, and replies (public)
- **Only logged-in users** can post sessions, threads, and replies
- **Anyone** (logged in or not) can submit a prayer request — matches your
  "public, but posting requires login... except prayer requests can be anonymous" setup
- A trigger auto-creates a `profiles` row (with display name) the moment
  someone signs up

If you ever need to start over, you can drop all 5 tables and re-run the
script — it's written to run cleanly on a fresh project.

## 2. Turn on email confirmation

1. In Supabase, go to **Authentication → Providers → Email**
2. Make sure **"Confirm email"** is toggled ON (you asked for this — new
   accounts won't be able to log in until they click the link in their inbox)
3. Optional: under **Authentication → Email Templates**, you can customize
   the confirmation email and the magic-link email to match your church's tone

## 3. Add your real site URL

Supabase needs to know where to send people back to after they click a
confirmation or magic-link email.

1. Go to **Authentication → URL Configuration**
2. Set **Site URL** to wherever this site will live (e.g.
   `https://yourchurch.org` or your GitHub Pages / Netlify URL)
3. Add that same URL under **Redirect URLs** too

Until you deploy somewhere, links will redirect to whatever `window.location.href`
was when the email was sent (e.g. `http://localhost:8000` if you're testing
locally) — so testing only works cleanly once you're testing from the real
deployed URL, or consistently from the same local server address.

## 4. Test it

1. Open the site, click **Sign up**, create an account
2. Check your inbox for the confirmation email and click it
3. Come back and log in
4. Try posting a prayer request, scheduling a Bible study session, and
   posting to the discussion board — all three should now show up
   immediately and persist across a page reload
5. Check your Formspree inbox — prayer requests and scheduled sessions
   should also arrive there as email notifications

## What's still local (not in Supabase yet)

- **Calendar "events"** (Sunday service times, etc.) — still a hardcoded
  array in `app.js`. Bible study sessions you schedule DO show up on the
  calendar (merged in at render time), but recurring service times don't
  have their own database table yet.
- **News & Events articles** — still hardcoded. This is more of a
  content-management concern; if you want church staff to be able to post
  news from the site itself (not just you editing the file), that would be
  a good next addition — either its own Supabase table, or a connection to
  whatever CMS you end up using.

## A note on the anon key

The key in `app.js` (`sb_publishable_...`) is meant to be public — it's
safe to ship in client-side code. Row Level Security (set up by the schema
script) is what actually protects your data, not keeping this key secret.
Never put your Supabase **service_role** key in this file or any other
client-side code.
