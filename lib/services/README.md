# Service layer

UI components import data and actions from `@/lib/services/*` only, never from
`firebase/*`, `lib/firebase/*`, `lib/store/*` or `lib/api`. Each service keeps
the function names and signatures the UI already uses.

| Service | What it covers | Backend (phase) |
|---|---|---|
| `data` | live data hooks (`useDB`, `useCardBundle`), sync errors, demo reset | Firestore listeners + write-back (4, done) |
| `cards` | draft edits, socials, photos, org chart, uploads, publish, review, slugs | Firestore + Storage + `createCardFromBundle`/`changeSlug`/`checkSlug` (4, done); publish and review (7) |
| `public-cards` | server-side public card reads (server components only) | Admin SDK + `'use cache'` (7) |
| `templates` | apply template/theme, entitlements, pricing, library | callables `applyTemplate`, `savePricing`, `setDefaultTemplate` (6) |
| `requests` | template requests and client notifications | callables (6) |
| `clients` | create client + card, disable, last active | callables (3, 5) |
| `invites` | invites, accept, sign-in links | callables (5) |
| `storage` | resized, resumable uploads under `cards/{cardId}/` | Cloud Storage (4, done) |
| `session` | sign-in, sign-out, the client session | Firebase Auth + `/api/session` (3, done) |
| `nfc` | NFC tags and batches | callables + `/t/[tagId]` (8) |
| `card-utils` | pure helpers: vCard, .ics, message links, maps | route handlers for vCard/.ics (7) |

While a phase is in progress, `NEXT_PUBLIC_DATA_SOURCE=mock` keeps the mock store
behind each service; `firebase` switches the finished ones over.
