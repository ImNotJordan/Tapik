/**
 * Live data for admin and portal screens.
 * TODO(backend, phase 4): Firestore onSnapshot hooks with the same return shapes.
 */
export { useDB, useCardBundle, readDB, resetDemoData } from "@/lib/store/db";
/** Firebase mode: a save was rejected and rolled back (message is user-facing). */
export { onSyncError, flushDB } from "@/lib/store/db";
