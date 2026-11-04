/** Loading state for the public card: same proportions as Keepsake, the default template. */
export function CardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading card"
      className="min-h-dvh bg-[#183A2E] [--skeleton-base:rgb(255_255_255/0.08)] [--skeleton-hi:rgb(255_255_255/0.16)]"
    >
      <div className="mx-auto flex max-w-[440px] flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pl-5">
          <div className="skeleton h-7 w-40 rounded-md" />
          <div className="skeleton size-11 rounded-full" />
        </div>
        <div className="px-4 pt-8">
          <div className="skeleton aspect-[1.586] w-full rounded-[14px]" />
        </div>
        <div className="grid grid-cols-2 gap-2.5 px-4 pt-8">
          <div className="skeleton h-14 rounded-xl" />
          <div className="skeleton h-14 rounded-xl" />
        </div>
        <div className="mt-[76px] flex flex-col gap-4 rounded-t-[22px] bg-white/[0.06] px-5 pt-9">
          <div className="skeleton h-7 w-4/5 rounded-md" />
          <div className="skeleton h-7 w-3/5 rounded-md" />
          <div className="skeleton mt-6 h-4 w-full rounded" />
          <div className="skeleton h-4 w-11/12 rounded" />
          <div className="skeleton h-4 w-2/3 rounded" />
        </div>
      </div>
    </div>
  );
}

/** Neutral fill shown inside a themed card root while a template's code loads. Uses the card's own colors. */
export function CardSkeletonFill() {
  return (
    <div aria-busy="true" aria-label="Loading card" className="min-h-[var(--c-vh,100svh)] bg-c-bg [--skeleton-base:var(--c-bg-tint)] [--skeleton-hi:var(--c-bg-line)]">
      <div className="mx-auto flex max-w-[440px] flex-col gap-4 px-5 pt-16">
        <div className="skeleton h-10 w-4/5 rounded-md" />
        <div className="skeleton h-10 w-3/5 rounded-md" />
        <div className="skeleton mt-6 aspect-[4/3] w-full rounded-2xl" />
        <div className="skeleton h-14 w-full rounded-xl" />
      </div>
    </div>
  );
}
