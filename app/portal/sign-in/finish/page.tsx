import type { Metadata } from "next";
import { SignInFinish } from "@/components/portal/sign-in-finish";

export const metadata: Metadata = { title: "Signing in", robots: { index: false } };

export default function SignInFinishPage() {
  return <SignInFinish />;
}
