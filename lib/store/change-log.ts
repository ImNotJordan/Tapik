"use client";

import type { MockDB } from "@/lib/mock";
import { ADMIN_NAME } from "@/lib/mock/workspace";
import type { Card, ChangeLog, Role } from "@/lib/types";
import { getSession } from "@/lib/session";
import { nowISO, uid } from "@/lib/utils";
import { FIELD_LABELS } from "@/lib/change-log-fields";

export function fieldLabels(patch: Partial<Card>): string[] {
  return [...new Set(Object.keys(patch).map((k) => FIELD_LABELS[k as keyof Card]).filter((v): v is string => !!v))];
}

export function currentActor(db: MockDB): { actor: Role; actorName: string } {
  const s = getSession();
  if (s.role === "client") return { actor: "client", actorName: db.clients.find((c) => c.id === s.clientId)?.name ?? "Client" };
  return { actor: "admin", actorName: ADMIN_NAME };
}

const COALESCE_MS = 10 * 60_000;
const MAX_ENTRIES = 400;

/**
 * Adds "who edited what" entries. Repeated edits of the same field by the same
 * person within ten minutes update one entry instead of adding many.
 * TODO(backend): a `change_log` table written by a trigger on card updates.
 */
export function logChanges(db: MockDB, cardId: string, fields: string[], who = currentActor(db)): MockDB {
  if (fields.length === 0) return db;
  const at = nowISO();
  let log = db.changeLog;
  for (const field of fields) {
    const i = log.findIndex((e) => e.cardId === cardId && e.field === field && e.actor === who.actor && e.actorName === who.actorName && Date.parse(at) - Date.parse(e.at) < COALESCE_MS);
    if (i >= 0) log = log.map((e, j) => (j === i ? { ...e, at } : e));
    else log = [...log, { id: uid("lg"), cardId, field, at, ...who } satisfies ChangeLog];
  }
  return { ...db, changeLog: log.slice(-MAX_ENTRIES) };
}
