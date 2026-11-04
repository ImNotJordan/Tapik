"use client";

/**
 * Analytics for admin and portal screens only: never on public cards, never
 * against the emulators. Its own module so nothing loads the Analytics SDK
 * unless it's actually going to run.
 */
import { firebaseApp } from "./client";

let started = false;

export async function startAnalytics(): Promise<void> {
  if (started || typeof window === "undefined") return;
  started = true;
  const { getAnalytics, isSupported } = await import("firebase/analytics");
  if (await isSupported()) getAnalytics(firebaseApp());
}
