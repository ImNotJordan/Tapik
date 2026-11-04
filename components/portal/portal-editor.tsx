"use client";

import { useEffect } from "react";
import { touchClientActive } from "@/lib/services/clients";
import { useCardBundle } from "@/lib/services/data";
import type { Client } from "@/lib/types";
import { Editor } from "@/components/admin/editor/editor";
import { EditorSkeleton } from "@/components/admin/editor/editor-loader";
import { ClientGate, PortalNotice } from "./gates";
import { LinkButton } from "@/components/ui/button";

/** /portal/edit: the studio's editor, with role = client, on the client's own card only. */
export function PortalEditor() {
  return <ClientGate>{(client) => <ClientCardEditor client={client} />}</ClientGate>;
}

function ClientCardEditor({ client }: { client: Client }) {
  const { bundle, hydrated } = useCardBundle(client.cardId);
  useEffect(() => {
    touchClientActive(client.id);
  }, [client.id]);
  if (!hydrated) return <EditorSkeleton />;
  if (!bundle) {
    return (
      <PortalNotice title="Your card isn’t ready yet" actions={<LinkButton href="/portal" size="lg">Back</LinkButton>}>
        Your card couldn’t be found. Ask the people who made it to check it.
      </PortalNotice>
    );
  }
  return <Editor bundle={bundle} role="client" client={client} />;
}
