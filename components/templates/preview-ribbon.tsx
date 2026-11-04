/**
 * Over the live preview while a locked template is shown on the client's own
 * card: honest about what is and isn't saved.
 */
export function PreviewRibbon({ templateName, themeName, onBack }: { templateName: string; themeName?: string; onBack: () => void }) {
  return (
    <div className="relative z-10 mx-auto mb-3 flex w-full max-w-[440px] flex-wrap items-center justify-between gap-2 rounded-xl bg-studio-ink px-3.5 py-2 text-studio-bg shadow-[0_8px_24px_-8px_rgb(0_0_0/0.4)]">
      <p className="text-sm">
        Previewing <span className="font-semibold">{templateName}</span>
        {themeName && <span className="opacity-80"> in {themeName}</span>}, not applied
      </p>
      <button type="button" onClick={onBack} className="inline-flex h-10 cursor-pointer items-center rounded-lg px-2.5 text-sm font-semibold underline underline-offset-2 hover:bg-white/10">
        Back to my card
      </button>
    </div>
  );
}
