Push content from repo files to Supabase DB.

Run: `npm run content:push`

This syncs JSON files in `content/db/` back into the database.
Use to restore DB state from git after accidental overwrites, or to deploy code-level changes to blocks/layouts.

Optional filter: `npm run content:push -- blocks` or `npm run content:push -- layouts`
