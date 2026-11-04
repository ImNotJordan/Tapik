"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { onSyncError } from "@/lib/services/data";
import { isFirebaseMode } from "@/lib/services/session";
import { useToast } from "@/components/ui/toast";

/**
 * Studio and portal: a toast when a save is rejected (the change is rolled
 * back), and an offline bar while there's no connection. Edits made offline
 * are kept and saved when the connection returns.
 */
export function SyncStatus() {
  const toast = useToast();
  const [offline, setOffline] = useState(false);

  useEffect(() => onSyncError((message) => toast.error("Change not saved", { description: message })), [toast]);

  useEffect(() => {
    if (!isFirebaseMode) return;
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div role="status" className="sticky top-0 z-[60] flex items-center justify-center gap-2 bg-studio-ink px-4 py-2.5 text-center text-sm font-medium text-studio-bg print:hidden">
      <WifiOff aria-hidden className="size-4 shrink-0" />
      You’re offline. Your edits are kept and save when you reconnect.
    </div>
  );
}
