# Vercel deployment

Public dashboard: https://vayusetu-seven.vercel.app

The public dashboard supports scenarios, regional context and local evaluation. Visit `/operator` to sign in before saving reports, photos, datasets or incident progress. Shared operator credentials are provided separately; never commit them. All records and photo API operations require authentication. This is prototype access control, not tenant-level roles.

The Vercel app uses a Node.js function and a private Vercel Blob store. Configure `BLOB_READ_WRITE_TOKEN`, `PRANA_USER` and `PRANA_PASSWORD` in project environments. Run `npm run build:vercel` and deploy with Vercel. The root `presentation.pptx` is included as a public download.

The original Sites deployment retains its separate D1/R2 storage. Its historical records were not migrated or removed. Vercel starts with a new record store.

Verification included anonymous API denial, authenticated reads, photo upload/retrieval, incident creation and persistent stage updates. Synthetic verification records and photos were removed afterward.

Future work: individual accounts, operator roles, retention/consent policies, audit logs and field validation. No regulatory certification, automated agency dispatch or validated emission-source attribution is claimed.
