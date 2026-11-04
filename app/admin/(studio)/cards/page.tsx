import { redirect } from "next/navigation";

/* /admin/cards has no screen of its own; the card list lives at /admin. */
export default function CardsIndex() {
  redirect("/admin");
}
