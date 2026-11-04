import { WORKSPACE } from "@/lib/mock/workspace";
import { cn } from "@/lib/utils";

/** The admin company's logo: a monogram tile and the name. Used in emails, the invite page and the portal. */
export function WorkspaceLogo({ size = "md", withName = true, className }: { size?: "sm" | "md" | "lg"; withName?: boolean; className?: string }) {
  const tile = { sm: "size-7 text-sm rounded-[7px]", md: "size-9 text-base rounded-[9px]", lg: "size-14 text-2xl rounded-[14px]" }[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden={withName}
        role={withName ? undefined : "img"}
        aria-label={withName ? undefined : WORKSPACE.company}
        className={cn("inline-flex shrink-0 items-center justify-center font-semibold text-white [font-family:var(--font-young-serif),Georgia,serif]", tile)}
        style={{ background: WORKSPACE.brandColor }}
      >
        {WORKSPACE.mark}
      </span>
      {withName && <span className={cn("font-semibold tracking-[-0.01em]", size === "lg" ? "text-lg" : "text-sm")}>{WORKSPACE.company}</span>}
    </span>
  );
}
