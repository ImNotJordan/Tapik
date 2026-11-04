import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { TapikLogo } from "@/components/brand/tapik-logo";
import { buttonClass } from "@/components/ui/button-styles";
import { SEED_CARDS } from "@/lib/mock/seed";
import { getTemplate } from "@/templates/registry";

export default function Home() {
  const samples = SEED_CARDS.filter((c) => c.status === "published");
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between px-4 sm:px-6">
        <TapikLogo href="/" className="text-studio-ink" />
        <Link href="/design" className="text-sm font-medium text-studio-ink-2 hover:text-studio-ink">
          Style guide
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-14 px-4 pt-10 pb-16 sm:px-6 lg:pt-20">
        <div className="flex max-w-2xl flex-col gap-5">
          <h1 className="text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.03em]">
            {BRAND.tagline}
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-studio-ink-2">
            Each card is one page that opens from an NFC card, a QR code or a link. Admins build and publish every card in {BRAND.adminAppName}.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link href="/admin" className={buttonClass("primary", "lg")}>
              Open {BRAND.adminAppName}
            </Link>
            <Link href="/admin/cards/new" className={buttonClass("secondary", "lg")}>
              Create a card
            </Link>
          </div>
        </div>

        <section aria-labelledby="samples-h" className="flex flex-col gap-4">
          <h2 id="samples-h" className="text-base font-semibold">
            Sample cards
          </h2>
          <ul className="grid gap-3 md:grid-cols-3">
            {samples.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/c/${c.slug}`}
                  className="group flex h-full flex-col gap-1 rounded-2xl border border-studio-line bg-studio-surface p-5 transition-colors hover:border-studio-line-strong"
                >
                  <span className="flex items-center justify-between gap-2 text-base font-semibold">
                    {c.name}
                    <ArrowUpRight aria-hidden className="size-4 text-studio-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                  <span className="text-sm text-studio-ink-2">{[c.title, c.company].filter(Boolean).join(", ")}</span>
                  <span className="pt-2 text-2xs text-studio-ink-3">{getTemplate(c.templateId).name} template</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
