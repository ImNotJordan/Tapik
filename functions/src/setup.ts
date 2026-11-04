/**
 * Runs before any function is defined: every function file imports this first.
 * (ES imports are evaluated before the importing file's own code, so calling
 * setGlobalOptions in index.ts would be too late for functions in other files.)
 */
import { getApps, initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions/v2";

if (!getApps().length) initializeApp();

export const REGION = "asia-southeast1";
setGlobalOptions({ region: REGION, maxInstances: 10 });
