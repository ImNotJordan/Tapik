import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { TapikLogo } from "@/components/brand/tapik-logo";
import { StyleGuide } from "@/components/design/style-guide";

export const metadata: Metadata = { title: { absolute: `Style guide · ${BRAND.adminAppName}` } };

export default function DesignPage() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-studio-line bg-studio-surface/95">
        <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <TapikLogo app="admin" href="/admin" className="text-studio-ink" />
          <nav aria-label="Main" className="flex items-center gap-1 text-sm font-medium">
            <Link href="/admin" className="inline-flex h-9 items-center rounded-lg px-3 text-studio-ink-2 hover:bg-studio-raised hover:text-studio-ink">
              Cards
            </Link>
            <Link href="/c/carmela-reyes-tan" className="inline-flex h-9 items-center rounded-lg px-3 text-studio-ink-2 hover:bg-studio-raised hover:text-studio-ink">
              Sample card
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex max-w-[1320px] flex-col gap-10 px-4 py-10 sm:px-6 lg:px-10">
        <div className="flex max-w-[65ch] flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Style guide</h1>
          <p className="text-base text-studio-ink-2">
            Tokens, components and every template of {BRAND.name}, in one place. {BRAND.adminAppName} is calm and systematic; the cards carry the personality.
          </p>
        </div>
        <StyleGuide />
      </main>
    </div>
  );
}
