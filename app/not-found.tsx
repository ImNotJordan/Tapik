import { CardUnavailable } from "@/components/card/card-unavailable";

/* Public-facing not-found: most visitors arrive from a card link, so speak to them. */
export default function NotFound() {
  return <CardUnavailable />;
}
