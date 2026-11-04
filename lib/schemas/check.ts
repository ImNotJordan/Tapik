/**
 * Compile-time guard: the zod schemas and lib/types.ts must describe the same
 * shapes. If a type changes and its schema doesn't (or the other way round),
 * `npx tsc` fails here.
 */
import type { z } from "zod";
import type { AlbumPhoto, Card, Client, ClientNotification, OrgChart, OrgMember, SocialLink, TemplateRequest } from "@/lib/types";
import type * as S from "./index";

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;

export type Checks = [
  Assert<Same<z.infer<typeof S.card>, Card>>,
  Assert<Same<z.infer<typeof S.socialLink>, SocialLink>>,
  Assert<Same<z.infer<typeof S.albumPhoto>, AlbumPhoto>>,
  Assert<Same<z.infer<typeof S.orgChart>, OrgChart>>,
  Assert<Same<z.infer<typeof S.orgMember>, OrgMember>>,
  Assert<Same<z.infer<typeof S.client>, Client>>,
  Assert<Same<z.infer<typeof S.templateRequest>, TemplateRequest>>,
  Assert<Same<z.infer<typeof S.notification>, ClientNotification>>,
];
