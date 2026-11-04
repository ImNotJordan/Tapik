# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, deployed on Vercel. UI/UX build only: typed mock data and local state; every future backend touchpoint is a named stub marked `// TODO(backend)`. Data shapes stay Supabase-friendly (flat tables, `id` / `created_at`).

## Users

- **Card visitors**: clients and prospects of a Philippine business owner or agent. They arrive on a phone, usually by tapping a physical NFC card or scanning a QR code, often mid-conversation. Their job: call, message, save the contact, check photos, find the office.
- **Admins**: the people who set up and maintain cards for business owners and agents. They work on a desktop or tablet, customizing every card from the Admin Studio (Tapik Studio).

## Product Purpose

The product is **Tapik** ("Your business card, one tap away."; *tapik* is Filipino for a light tap on the shoulder). The admin side is **Tapik Studio**; clients see **Tapik**. Name, tagline and placeholder domain `tapik.ph` live in `lib/brand.ts`. Public cards carry only a plain "Powered by Tapik" line, never the mark, so the client's brand leads.

Each business owner or agent gets one public page, the Digital Business Card, at `/c/[slug]`. It opens from an NFC tap, a QR scan or a link. Success is a visitor who calls, messages or saves the contact within seconds, and an admin who can build and publish a card without help.

## Positioning

The page is the continuation of a physical card someone just tapped. It is not a link-in-bio list. It is a premium personal-brand page with real contact actions, a photo album, a map and an organization chart.

## Operating Context

- Visitors: mobile first, one-handed, sometimes on weak data. Call, Message and Save Contact must stay within thumb reach.
- Message buttons may open SMS, WhatsApp, Viber or Messenger. Viber and Messenger are common in the Philippines.
- Phone numbers are Philippine (+63). Licensed professionals such as real estate brokers show registration numbers (e.g. PRC REB No.).
- Admins: desktop-first split view (controls left, live preview right), fully usable on tablet.

## Capabilities and Constraints

- Public card sections, each admin-controlled and hideable: background photo, logo, agent photo, name/title/company, quote, description, Call, Message, Email, Socials, Map, Photos (album), Organization Chart, Save Contact, Share, "Powered by Tapik" footer.
- Section order is admin-defined.
- Templates: **The Card** (default), **Landmark** and **Place**. All three can be chosen per card in the Admin Studio. Six starting designs (Executive, Real Estate Agent, Bold Creator, Corporate Team, Minimal Mono, Local Business) are built on those templates.
- Themes per template (Light, Dark, Warm, Ocean, Forest, Noir) plus Custom colors, curated font pairings, button shape and fill, and a motion toggle.
- Admin Studio rule from the owner: **no 404 pages**. Every admin link resolves to a real screen; unknown cards show an in-studio recovery state.
- Out of scope: real auth, database writes, storage, payments, NFC writing, API routes, server actions.

## Evidence on Hand

- Mock clients (invented, Philippine context): a Cebu real estate broker, a Manila freight operations manager and an Iloilo café owner.
- Photos: openly licensed images from Wikimedia Commons in `public/mock/*`, with credits in each folder's `credits.json`. Credits must stay visible somewhere in the product (style guide).
- No real portraits: people appear as initial monograms until an admin uploads a photo. Do not fabricate testimonials, stats or reviews.

## Product Principles

1. Contact first: the fastest path to Call, Message or Save Contact wins every layout argument.
2. Holds up with missing content: no photo, no quote, zero album photos, long names and long bios must all still look intentional.
3. Admin changes are token swaps: template + theme + custom values resolve to one set of CSS variables.
4. Calm studio, characterful cards: the admin recedes so the cards can carry the personality.

## Accessibility & Inclusion

WCAG 2.2 AA: contrast, 44×44px touch targets, alt text fields for every uploaded image, semantic headings, focus management in dialogs and the lightbox, `prefers-reduced-motion` and `prefers-color-scheme` respected. Checked at 360, 390, 768, 1024 and 1440px.
