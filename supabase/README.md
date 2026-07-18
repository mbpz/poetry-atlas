# Supabase database workflow

Supabase is the only runtime database supported by this project. Local PostgreSQL and Docker are intentionally outside the current scope.

## Schema

`migrations/` is the sole source of truth for database structure and RLS. Apply files in filename order through the Supabase SQL Editor before running a seed.

The current product contract contains:

- `places`
- `poems`
- `poem_places`
- `dynasties`
- `authors`
- `author_routes`
- `search_poems()`

Annotation, translation, and appreciation fields are not part of the current contract.

## Data sync

Use a Supabase Secret key in an ignored `.env.local` or `.env` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx
```

Then run:

```bash
npm run check:data
npm run seed:data -- --prune
npm run check:database
```

`--prune` makes Supabase match `public/data/places.json`, including removal of stale poems, places, relations, and derived authors. Back up production before using it.

## Disaster recovery

The implemented backup schedule, retention policy, integrity checks, and restore runbook are documented in [`../DISASTER_RECOVERY.md`](../DISASTER_RECOVERY.md).

Manual commands:

```bash
npm run backup:database
npm run backup:verify -- --input <backup-directory> --check-migrations
npm run restore:database -- --input <backup-directory>
```

Restore is dry-run by default. Database writes require both `--apply` and an exact `--confirm-project-ref` value.
