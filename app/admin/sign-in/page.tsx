import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminSignIn } from "@/components/admin/admin-sign-in";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminSignInPage() {
  // useSearchParams (the ?next= path) needs a boundary under Cache Components.
  return (
    <Suspense>
      <AdminSignIn />
    </Suspense>
  );
}
