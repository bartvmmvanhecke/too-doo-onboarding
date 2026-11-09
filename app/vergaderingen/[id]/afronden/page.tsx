import { Suspense } from "react";
import { Hydrated } from "@/components/hydrated";
import { WrapUpPage } from "@/components/meeting/wrap-up-page";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Hydrated>
        <WrapUpPage />
      </Hydrated>
    </Suspense>
  );
}
