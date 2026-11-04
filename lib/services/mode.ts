/** Which backend is live, readable from server and client code alike (no "use client"). */
import { dataSource, useEmulators } from "@/lib/firebase/config";

export const isFirebaseMode = dataSource === "firebase";
export const isEmulatorMode = useEmulators;

/** Invite emails are "coming soon" until an email provider is set up (Trigger Email extension). Links work now. */
export const isEmailEnabled = process.env.NEXT_PUBLIC_EMAIL_ENABLED === "true";
