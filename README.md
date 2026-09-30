# PRANA-NET / VayuDrishti pilot

Private climate incident workspace with four city contexts, regional Open-Meteo/CAMS data, citizen reporting, photo storage, sensor JSON/CSV intake, saved incident response, evidence dossier export and labeled-row evaluation.

## Run

`npm install`, `npm run build`, `npx wrangler d1 migrations apply prana-preview --local`, then `npm run dev`.

`npm test` checks reading validation and detection evaluation. `npm run db:generate` generates schema-only migrations from `db/schema.ts`. Sites provisions DB and BUCKET from `.openai/hosting.json` and applies migrations during publication. Do not deploy directly with Wrangler.

## MVP flow

Select a city → open Pilot tools → load the synthetic sample or supply sensor readings → validate and save → inspect the rule decision → submit corroborating evidence → save incident → resume response from history → export a dossier.

JSON arrays and simple unquoted CSV are accepted, up to 500 rows / 200 KB. Fields: timestamp (ISO date), pm, baseline, sigma, reports and satellite (true/false or 1/0), and optional label (1 incident, 0 no incident). Units are µg/m³. Photos accept JPEG/PNG/WebP up to 3 MB.

## Evidence and limits

The anomaly rule uses local deviation and evidence flags; its score is not a calibrated probability. Imported evidence is user supplied, not a verified hardware feed. Evaluation is row-level on uploaded labels; the bundled sample is synthetic. Plume geometry and exposure values are illustrative; real sensor deployment, census exposure estimation, source attribution and federated model training require further work. No SMS, agency dispatch, legal notices or building controls are sent. Response stages are saved review records.

Reports, photos, sensor datasets, incidents and feedback are stored in hosted D1/R2 on the private Site. Raw citizen media is omitted from JSON exchange. Four city contexts do not represent four independent deployed municipal systems. No Firebase, Gemini or Google Maps credentials are configured; OpenStreetMap provides geographic context.
