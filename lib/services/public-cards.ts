/**
 * Public card reads for server components (/c/[slug]). Safe to import on the server.
 * TODO(backend, phase 7): read publicCards/{slug} with the Admin SDK inside 'use cache' + cacheTag.
 */
export { getCardBySlug, listPublishedSlugs } from "@/lib/api";
