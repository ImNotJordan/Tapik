# Tapik: Digital Business Cards

> Your business card, one tap away.

UI/UX build of Tapik, a digital business card product (*tapik* is Filipino for a light tap on the shoulder). The product name, tagline and placeholder domain (`tapik.ph`) live in `lib/brand.ts`; no component hardcodes them. A public card page opens from an NFC tap, a QR code or a link. Admins build cards in Tapik Studio (the Admin Studio) and invite each client to edit their own card in the Client Portal. Only the Default template is free; other templates are a one-time unlock per card, and themes are always free.

**Scope:** interface only. There is no auth, database, storage, payments or NFC writing. Data is typed mock data in `lib/mock`, kept in the browser (localStorage) by `lib/store`. Every place that needs a backend is a stub in `lib/api.ts` marked `TODO(backend)`.

Stack: Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS 4, Radix primitives, dnd-kit. Deploys to Vercel.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run check:contrast   # every theme of every template against WCAG AA
npm run test:guards      # paid-template guard (canApplyTemplate) and seed data
```

Changes stay in the browser. Use **Reset demo data** in the studio sidebar to return to the sample cards, clients and requests.

In development a dashed **role switcher** sits at the bottom left: it flips the browser between Admin and any client (`Client: Carmela Reyes-Tan` and so on) so every screen can be reviewed in both roles. It is not rendered in production unless `NEXT_PUBLIC_ROLE_SWITCHER=1`.

## Routes

| Route | What it is |
|---|---|
| `/` | Index with links to the studio, sample cards and style guide |
| `/c/[slug]` | Public card (mobile-first). Samples: `carmela-reyes-tan`, `joel-mercado`, `kapehan-sa-calle-real` |
| `/admin` | Cards dashboard: search, filters, grid/list, quick actions |
| `/admin/cards/new` | New card for a client, 4 steps: client details, template (Default preselected; a paid pick is unlocked now, paid or comped, or the card starts on the Default), starter content, invite (permissions, email preview, send / copy link / send later) |
| `/admin/cards/[id]?tab=…` | Card editor with live phone/tablet/desktop preview. Tabs: content, media, socials, photos, org, map, details, sections, design, share |
| `/admin/cards/[id]/preview` | Full-screen draft preview |
| `/admin/templates` | Template library: filter, search, sort, star, preview full size, compare up to 3, apply to a card, duplicate, set availability and the default. `?card=` picks the card to apply to |
| `/admin/library` | Redirects to `/admin/templates` |
| `/admin/clients` | Clients: invite status, last active, current template, unlocks, pending requests, row actions, detail drawer (invite timeline, change log, unlocks, requests). `?client=` opens one |
| `/admin/template-requests` | Clients who want a paid template: filters, search, template filter, bulk actions, send payment details, mark paid and unlock, comp, decline, Undo. `?request=` opens one |
| `/admin/settings/templates` | Templates & pricing: Free/Paid and price per template, Set as Default (cards on the old Default keep it), requests per template, how clients see locks |
| `/admin/theme-requests`, `/admin/settings/themes` | Redirect to the template routes above |
| `/invite/[token]` | Invite landing: welcome, then sign-in choice (email link by default, or a password). Expired, revoked, already accepted and invalid states. Seed tokens: `mvs-4hT9qL`, `nd-8pR2xk` (valid), `jm-old-2Fv7` (expired), `ls-1Qa7zt` (revoked), `crt-9Lm4vd` (accepted) |
| `/portal/sign-in` | Client sign-in: email me a sign-in link, check your email |
| `/portal` | Client Portal home: card preview, status, Edit / View live / Share, checklist, open request, notifications |
| `/portal/edit?tab=…` | The studio editor with role = client: same panels, admin-only controls hidden, Publish or Submit for review per card, paid-template previews and requests in Design |
| `/design` | Style guide: tokens, components, every template with the same card, themes, fonts, catalog, photo credits |
| `/design/preview/[id]` | One template full size with its sample card. `?theme=<id>`, `?sparse=1` (missing-data worst case) |

The studio has no 404 pages. Unknown `/admin/...` addresses and missing cards show an in-studio recovery screen with links back. A client who opens `/admin` sees a way to their own card instead.

## Roles and paid templates

- **One editor, two roles.** `components/admin/editor/editor.tsx` takes `role`. Clients get the same panels without the Share tab (slug, NFC, QR, unpublish) or custom colors, fonts and buttons; on phones the editor has a bottom tab bar and a slide-up preview.
- **Prices live in one place:** `lib/pricing.ts` (Default `keepsake`, ₱299 standard, ₱499 Pro: Boardroom, Event / Promo, Bilingual, Transport & Logistics, Hyacinth Executive). Admin overrides and the Default are set in Templates & pricing.
- **Honest locks:** `canApplyTemplate(role, entitlements, pricing, templateId)` in `lib/entitlements.ts` guards every apply (editor, gallery, apply dialog, notification "Apply now") and every publish. Previewing never saves. An admin applying a paid template to a client card unlocks it (a comp). Changing the Default unlocks the old Default for cards already on it.

## Templates

Fifteen templates, each a self-contained folder in `/templates`:

```
templates/
  registry.ts        TemplateManifest[]: the single source of truth
  components.ts      id → Card component (one lazy chunk per template)
  previews.ts        id → sample card for thumbnails
  <id>/manifest.ts   name, category, tags, fonts, 3+ themes, default section order, supports
  <id>/Card.tsx      renders the public card from (bundle, tokens, mode)
  <id>/sections/     optional template-specific section variants
  <id>/preview.ts    the sample persona used by thumbnails
```

To add one: create the folder, then add a line to `registry.ts`, `components.ts` and `previews.ts`. Fonts go in `app/fonts.ts` and `lib/design/fonts.ts`.

| Id | Name | Category |
|---|---|---|
| keepsake | Keepsake (default) | Real estate |
| landmark | Landmark | Personal brand |
| place-first | Place First | Real estate |
| noir-ledger | Noir Ledger | Corporate |
| sunny-counter | Sunny Counter | Local business |
| reel | Reel | Creative |
| boardroom | Boardroom | Corporate |
| clinic-calm | Clinic Calm | Professional |
| folio | Folio | Professional |
| split-hero | Split Hero | Real estate |
| gallery-wall | Gallery Wall | Creative |
| event-promo | Event / Promo | Local business |
| faith-community | Faith & Community | Personal brand |
| transit | Transport & Logistics | Corporate |
| bilingual | Bilingual | Professional |
| hyacinth-executive | Hyacinth Executive (Hyacinth Industries brand; `brand.ts` is its source of truth) | Corporate |

Content never changes between templates. Template-specific fields live on every card: hours, services, service areas, ID card and event in the editor's Details tab; the booking button (link, label, sub-line), industries & expertise chips, tagline and the tag above the name in the Content tab. Templates that don't support a field keep it hidden, so switching never loses it. Cards saved under the old ids (`card`, `place`) are migrated on load.

## Theme engine

`lib/design/resolve.ts` turns template (from the registry) + theme + custom colors + font pairing + button style into one set of `--c-*` CSS variables on the card root. Card components only read those variables, so every admin change is a token swap. Studio tokens (`--studio-*`, light and dark) live in `app/globals.css` and are exposed to Tailwind as `studio-*` colors.

## Backend (Firebase)

The backend is Firebase in **asia-southeast1** (Singapore): Auth, Firestore, Storage (bucket `tapik-ph-media`), Cloud Functions (2nd gen, Node 20) and App Check. It is being wired in phases; until a phase lands, its service still runs on the mock store.

**Architecture:** UI → `lib/services/*` → Firebase. Components and routes import only from `lib/services` (ESLint enforces it). `lib/firebase/client.ts` (browser SDK) and `lib/firebase/admin.ts` (Admin SDK, `server-only`) are used by the service layer only. `lib/schemas` (zod) validates every write and is shared with `functions/`. `lib/firebase/model.ts` lists every collection and converts between the UI types and stored documents.

**Run it locally** (needs Java 21+ for the emulators, set `JAVA_HOME`):

```bash
cp .env.example .env.local      # then fill in; NEXT_PUBLIC_USE_EMULATORS=1 for local work
npm run emulators               # Auth, Firestore, Storage, Functions as project demo-tapik; UI at http://127.0.0.1:4000
npm run seed                    # in another terminal: loads the mock data (wipes the emulators first)
npx tsx scripts/smoke-emulators.ts   # rules + callable smoke test
```

The seed creates `admin@tapik.ph` (password `SEED_ADMIN_PASSWORD`, default `tapik-dev-admin`, emulators only) and an auth user for every active client. In emulator mode the project is always `demo-tapik`, so local work can't touch production.

**Auth** (`NEXT_PUBLIC_DATA_SOURCE=firebase`):
- Tapik Studio: email + password at `/admin/sign-in`, custom claim `{ role: "admin" }`.
- Clients: passwordless email link at `/portal/sign-in` (sent by the `sendSignInLink` function, only to active clients; the answer is the same for any email), finished at `/portal/sign-in/finish`. Claims `{ role: "client", clientId, cardId }`.
- `/api/session` exchanges a fresh ID token for an httpOnly `__session` cookie (admins 5 days, clients 14). `proxy.ts` redirects requests without the cookie; the server gates in `components/auth/server-gates.tsx` verify it on every request (revoked, expired and disabled accounts are refused) inside `app/admin/(studio)` and `app/portal/(app)`.
- Disabling a client (`setClientDisabled`) disables their Auth account and revokes their sessions; Firestore rules also check the status.
- The dev RoleSwitcher only appears in mock mode or against the emulators, where it signs in as seeded accounts.

**Data** (Firebase mode): screens read and write the same store as before (`useDB`, `lib/store/actions`). `lib/store/firebase-sync.ts` fills it from Firestore listeners (admins: every card; a client: only their own documents) and writes changes back: optimistic, batched about 800 ms after the last edit, retried after network trouble, and rolled back with a message if the server refuses. Duplicating a card and changing its link go through Functions (`createCardFromBundle`, `changeSlug`; old links stay reserved as redirects). Uploads are resized in the browser and stored under `cards/{cardId}/` in Storage with progress and Cancel; `onPhotoUpload` adds a 400px thumbnail for album photos. The change log is written by the `onCardWritten` trigger. Public card pages never load the Firebase SDK.

**Clients and invites** (Firebase mode): "New card for a client" is one Function, `createClientCard` (client, card, unique link, unlocks, "Unlock now" and the draft invite in a single transaction; photos upload into the new card's folder because the flow reserves the card id up front). Invite links carry a random token; only its SHA-256 is stored, so "Copy link" on an invite that was already sent makes a new link and the old one stops working. The invite page asks `getInvite` (and marks it opened); "Open my card editor" calls `acceptInvite`, which creates the client's account and signs them in with one click (no password). `revokeInvite` turns links off and ends the client's sessions; `resendInvite` replaces every open link. Email sending waits for the Trigger Email extension: until `MAIL_ENABLED=true` in `functions/.env.tapik-ph`, "Send invite" asks the admin to use Copy link (on the emulators the email is printed to the Functions log).

**Admins:** `npm run make-admin -- someone@company.ph` (needs `FIREBASE_SERVICE_ACCOUNT_JSON`) after creating their email + password account in Firebase Console. There is no public admin sign-up.

Files: `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `functions/` (bundled with esbuild so it can import `lib/schemas`).

## Photo credits

Sample photos are openly licensed from Wikimedia Commons. Credits are listed in each `public/mock/*/credits.json` and on the `/design` page.
