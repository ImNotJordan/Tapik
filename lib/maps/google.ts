/**
 * Google Maps in the browser: the map on public cards and in the editor, and
 * "Place pin from address" (geocoding). The key is a browser key restricted to
 * our sites (HTTP referrers), so everything here runs client-side; the server
 * never calls Google. Without a key the card shows its drawn stand-in map.
 */
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
/** Cloud-styled map (Google Cloud console → Map Management). Advanced markers need one. */
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";
export const mapsEnabled = KEY.length > 0;

let boot: Promise<void> | null = null;
let authFailed = false;
const authListeners = new Set<() => void>();

/** Google calls this when the key is refused (wrong site, API not enabled, billing off). */
export function onMapsAuthFailure(fn: () => void): () => void {
  if (authFailed) fn();
  authListeners.add(fn);
  return () => authListeners.delete(fn);
}

function bootstrap(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Google Maps runs in the browser only."));
  if (typeof window.google?.maps?.importLibrary === "function") return Promise.resolve();
  boot ??= new Promise<void>((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    w.__tapikMapsReady = () => resolve();
    w.gm_authFailure = () => {
      authFailed = true;
      console.warn("[maps] Google refused the Maps key for this site. Check the key's website and API restrictions.");
      authListeners.forEach((fn) => fn());
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({ key: KEY, v: "weekly", loading: "async", callback: "__tapikMapsReady", region: "PH" })}`;
    s.async = true;
    s.onerror = () => {
      boot = null;
      reject(new Error("Google Maps didn't load."));
    };
    document.head.append(s);
  });
  return boot;
}

export async function mapsLibrary(name: "maps"): Promise<google.maps.MapsLibrary>;
export async function mapsLibrary(name: "marker"): Promise<google.maps.MarkerLibrary>;
export async function mapsLibrary(name: "geocoding"): Promise<google.maps.GeocodingLibrary>;
export async function mapsLibrary(name: "core"): Promise<google.maps.CoreLibrary>;
export async function mapsLibrary(name: "places"): Promise<google.maps.PlacesLibrary>;
export async function mapsLibrary(name: "maps" | "marker" | "geocoding" | "core" | "places") {
  if (!mapsEnabled) throw new Error("No Google Maps key.");
  await bootstrap();
  return google.maps.importLibrary(name);
}

/** Address → coordinates with Google, biased to the Philippines. */
export async function geocodeWithGoogle(address: string): Promise<Result<{ lat: number; lng: number }>> {
  if (address.trim().length < 8) return { ok: false, error: "Add a street and city so the pin lands in the right place." };
  try {
    const { Geocoder } = await mapsLibrary("geocoding");
    const { results } = await new Geocoder().geocode({ address, region: "ph" });
    const loc = results[0]?.geometry.location;
    if (!loc) return { ok: false, error: "We couldn’t find that address. Add the building, street and city." };
    return { ok: true, data: { lat: loc.lat(), lng: loc.lng() } };
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "ZERO_RESULTS") return { ok: false, error: "We couldn’t find that address. Add the building, street and city." };
    if (code === "REQUEST_DENIED") return { ok: false, error: "Address search is switched off for this map key. Turn on the Geocoding API for it in Google Cloud." };
    if (code === "OVER_QUERY_LIMIT") return { ok: false, error: "Too many address searches just now. Try again in a minute." };
    return { ok: false, error: "Address search didn’t respond. Check your connection and try again." };
  }
}

/* ------------------------------------------------------- Address search */

/** One suggestion under the address field. resolve() fetches where it is (billed once, when picked). */
export type AddressHit = { id: string; main: string; secondary: string; resolve: () => Promise<{ address: string; lat: number; lng: number } | null> };

/** Cards are Philippine: the country adds nothing to the address on the card. */
const trimCountry = (s: string) => s.replace(/,\s*Philippines$/i, "").trim();

let placesOff = false;
let session: google.maps.places.AutocompleteSessionToken | null = null;

/**
 * Suggestions while someone types an address: Google Places (buildings and
 * businesses by name, e.g. "Four-C Building"), biased to the Philippines and
 * to `near`. If Places API (New) isn't enabled for the key, falls back to the
 * Geocoding API (street addresses only).
 */
export async function searchAddress(input: string, near?: { lat: number; lng: number }): Promise<AddressHit[]> {
  const q = input.trim();
  if (q.length < 3) return [];
  if (!placesOff) {
    try {
      const { AutocompleteSuggestion, AutocompleteSessionToken } = await mapsLibrary("places");
      session ??= new AutocompleteSessionToken();
      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: q,
        sessionToken: session,
        includedRegionCodes: ["ph"],
        language: "en",
        ...(near ? { locationBias: { center: near, radius: 50_000 } } : {}),
      });
      return suggestions.flatMap(({ placePrediction: p }) => {
        if (!p) return [];
        const full = trimCountry(p.text.text);
        return [{
          id: p.placeId,
          main: p.mainText?.text ?? full,
          secondary: trimCountry(p.secondaryText?.text ?? ""),
          resolve: async () => {
            const place = p.toPlace();
            await place.fetchFields({ fields: ["location"] });
            session = null; // a pick ends the billing session
            const loc = place.location;
            return loc ? { address: full, lat: loc.lat(), lng: loc.lng() } : null;
          },
        }];
      });
    } catch (e) {
      const msg = String((e as Error).message ?? e);
      if (!/denied|not (been )?(used|enabled|authori[sz]ed)|permission|forbidden|blocked/i.test(msg)) return [];
      console.warn("[maps] Place search is off for this key (enable Places API (New)); using address lookup instead.");
      placesOff = true;
    }
  }
  try {
    const { Geocoder } = await mapsLibrary("geocoding");
    const { results } = await new Geocoder().geocode({ address: q, region: "ph" });
    return results.slice(0, 5).map((r) => {
      const full = trimCountry(r.formatted_address);
      const [main, ...rest] = full.split(", ");
      const at = { address: full, lat: r.geometry.location.lat(), lng: r.geometry.location.lng() };
      return { id: r.place_id, main: main ?? full, secondary: rest.join(", "), resolve: async () => at };
    });
  } catch {
    return [];
  }
}

/** True when a CSS color is dark (picks Google's dark map style on dark card themes). Any CSS color syntax. */
export function isDarkColor(css: string): boolean {
  const c = document.createElement("canvas").getContext("2d");
  if (!c || !css.trim()) return false;
  c.fillStyle = "#fff";
  c.fillStyle = css.trim();
  c.fillRect(0, 0, 1, 1);
  const [r, g, b] = c.getImageData(0, 0, 1, 1).data;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}

/** The card's own pin (same shape as the drawn map), coloured by the card's theme variables. */
export function pinElement(fill: string, ring: string, label: string): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("aria-label", label);
  el.innerHTML = `<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true" style="display:block;filter:drop-shadow(0 3px 4px rgb(0 0 0 / .35))"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill="${fill}" stroke="${ring}" stroke-width="1.5"/><circle cx="12" cy="10" r="3" fill="${ring}"/></svg>`;
  return el;
}
