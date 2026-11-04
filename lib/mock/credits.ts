import baguio from "@/public/mock/baguio/credits.json";
import bazaar from "@/public/mock/bazaar/credits.json";
import boardroom from "@/public/mock/boardroom/credits.json";
import cafe from "@/public/mock/cafe/credits.json";
import carinderia from "@/public/mock/carinderia/credits.json";
import clinic from "@/public/mock/clinic/credits.json";
import coach from "@/public/mock/coach/credits.json";
import freight from "@/public/mock/freight/credits.json";
import gallery from "@/public/mock/gallery/credits.json";
import hyacinth from "@/public/mock/hyacinth/credits.json";
import law from "@/public/mock/law/credits.json";
import parish from "@/public/mock/parish/credits.json";
import realty from "@/public/mock/realty/credits.json";
import reel from "@/public/mock/reel/credits.json";
import tagaytay from "@/public/mock/tagaytay/credits.json";
import transit from "@/public/mock/transit/credits.json";

export type PhotoCredit = { url: string; credit: string; page: string };

type Raw = { file: string; credit: string; page: string };
const SETS: Raw[][] = [realty, freight, cafe, coach, boardroom, law, carinderia, clinic, bazaar, reel, gallery, tagaytay, parish, transit, baguio, hyacinth];

/** Openly licensed sample photos and how to credit them. */
export const PHOTO_CREDITS: PhotoCredit[] = SETS.flat().map((c) => ({
  url: c.file.replace(/^public/, ""),
  credit: c.credit,
  page: c.page,
}));

export function creditFor(url: string): PhotoCredit | undefined {
  return PHOTO_CREDITS.find((c) => c.url === url);
}
