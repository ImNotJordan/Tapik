/** Shown when a card link points to nothing, or to a card that was unpublished. */
export function CardUnavailable() {
  return (
    <main className="flex min-h-dvh flex-col bg-studio-bg px-6 py-10 text-studio-ink">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8">
        <div
          aria-hidden
          className="relative aspect-[1.586] w-full max-w-[300px] rotate-[-3deg] rounded-[14px] border-[1.5px] border-dashed border-studio-line-strong"
        >
          <svg viewBox="0 0 24 24" className="absolute right-4 bottom-4 size-7 text-studio-ink-3" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36" />
            <path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58" />
            <path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8" />
            <path d="M16.37 2a20.16 20.16 0 0 1 0 20" />
          </svg>
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">This card isn’t available</h1>
          <p className="text-base leading-relaxed text-studio-ink-2">
            The link may have a typo, or the owner has taken the card offline for now. If someone just tapped their card for
            you, ask them for their number directly.
          </p>
        </div>
      </div>
    </main>
  );
}
