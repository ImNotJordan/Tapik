/**
 * Templates, themes, entitlements, pricing and the template library.
 * TODO(backend, phase 6): applyTemplate / savePricing / setDefaultTemplate / unlock callables.
 */
export { applyTemplate, patchLibrary, removeSavedTemplate, restoreSavedTemplate, saveTemplate, toggleFavoriteTemplate } from "@/lib/store/actions";
export {
  applyTemplateAs, applyThemeOnly, applyUnlocked, cardsOnDefault, entitlementsFor, pricingOf,
  savePricing, setDefaultTemplate, undoApply, unlockTemplateNow,
} from "@/lib/store/portal";
export { importTemplate } from "@/lib/api";
