/**
 * Dev-only: runs every theme of every template through the WCAG 2.2 AA checks
 * the color editor uses, and lists failures. `npm run check:contrast`
 * Exits 1 when anything fails, so it can gate CI.
 */
import { contrastRatio, formatRatio } from "@/lib/design/contrast";
import { themeChecks } from "@/lib/design/resolve";
import { TEMPLATES } from "@/templates/registry";
import { brandContrastPairs } from "@/templates/hyacinth-executive/brand";
import { promptContrastPairs } from "@/templates/prompt/roles";

/** Templates with more color roles than the seven tokens list their extra text pairs here. */
const EXTRA: Record<string, typeof brandContrastPairs> = { "hyacinth-executive": brandContrastPairs, prompt: promptContrastPairs };

let failures = 0;
let total = 0;
for (const t of TEMPLATES) {
  if (t.themes.length < 3) {
    console.log(`FAIL  ${t.name}: has ${t.themes.length} themes, needs at least 3`);
    failures++;
  }
  for (const th of t.themes) {
    for (const c of themeChecks(t, th.tokens)) {
      total++;
      if (!c.passes) {
        failures++;
        console.log(`FAIL  ${t.name} / ${th.name}: ${c.label} ${c.fg} on ${c.bg} = ${formatRatio(c.ratio)} (needs ${c.required}:1)`);
      }
    }
    for (const c of EXTRA[t.id]?.(th.tokens) ?? []) {
      total++;
      const ratio = contrastRatio(c.fg, c.bg);
      if (ratio < c.min) {
        failures++;
        console.log(`FAIL  ${t.name} / ${th.name}: ${c.label} ${c.fg} on ${c.bg} = ${formatRatio(ratio)} (needs ${c.min}:1)`);
      }
    }
  }
}
const themes = TEMPLATES.reduce((n, t) => n + t.themes.length, 0);
console.log(`\n${TEMPLATES.length} templates, ${themes} themes, ${total} contrast pairs checked. ${failures ? `${failures} failing.` : "All pass WCAG AA."}`);
process.exit(failures ? 1 : 0);
