# Fence & Gate Builder

React fence and gate fabrication calculator with Supabase authentication, cloud-saved projects, and feature requests.

## Run locally

```bash
npm start
```

Then open:

```text
http://localhost:4173/
```

Use `http://localhost:4173/` for auth testing. Do not use a `file://` URL for Supabase auth redirects.

## Supabase setup

The app reads Supabase settings from:

```text
src/supabase-config.js
```

That file should contain:

```js
window.FGB_SUPABASE_CONFIG = {
  url: "https://YOUR_PROJECT_REF.supabase.co",
  anonKey: "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY"
};
```

For this project it is already pointed at the `Fence & Gate Builder` Supabase project.

## Database

The Supabase project has:

- `projects`: saved gate/fence builds
- `feature_requests`: user feature requests

Both tables have row-level security enabled. Users can only select, insert, update, and delete rows where `auth.uid() = user_id`.

## Auth

Users can:

- Create an account with email and password
- Sign in with Google when Google OAuth is enabled in Supabase
- Sign in
- Reset password
- Stay logged in across sessions
- Log out from the app header

The main app is protected. Logged-out users only see the auth screen.

## Deploy

This is still a static app. Deploy the whole folder to GitHub Pages or any static host. Make sure these files are included:

- `index.html`
- `src/App.jsx`
- `src/main.jsx`
- `src/styles.css`
- `src/supabase-config.js`
- `src/assets/*`

If deploying to a new domain, add that URL in Supabase under Authentication settings so password reset and signup redirects are allowed.

For Google sign-in, enable Google under Supabase Authentication Providers and add the Google OAuth client ID/secret from Google Cloud.

Recommended Supabase redirect URLs:

- `http://localhost:4173/`
- Your GitHub Pages URL, for example `https://dirtcollins.github.io/brendan/`
