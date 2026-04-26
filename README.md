# Clear Edge Solutions - repaired website package

Upload the CONTENTS of this folder to the root of your GitHub repository.

Important files:
- `index.html` = repaired website
- `_headers` = browser security headers for Netlify
- `netlify.toml` = Netlify build/functions configuration
- `netlify/functions/form-intake.js` = serverless function that sends all forms to Supabase
- `supabase_setup.sql` = SQL table you must run in Supabase
- `images/` + root image files = assets used by the site

Netlify environment variables required:
- `SUPABASE_URL` = `https://sjgrbcqgkxwvzetjhutf.supabase.co`
- `SUPABASE_ANON_KEY` = your Supabase publishable/anon key

The site now uses only 3 Netlify form names:
1. `clear-edge-client-contact`
2. `clear-edge-client-quote`
3. `clear-edge-partner-application`

All records go into the same Supabase table:
- `website_submissions`

The field `source_type` separates the 3 sources:
- `client_contact`
- `client_quote`
- `partner_application`
