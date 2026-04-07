Pull content from Supabase DB to repo files (content/db/).

Run: `npm run content:pull`

This syncs blocks, layouts, and pages from the database into JSON files in `content/db/`.
Use after someone edits content in Studio to capture the latest state in git.

Optional filter: `npm run content:pull -- blocks` or `npm run content:pull -- layouts`
