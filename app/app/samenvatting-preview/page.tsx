import { Hydrated } from "@/components/hydrated";
import { DigestPreview } from "@/components/meeting/digest-preview";
export default function Page() {
  return (
    <Hydrated>
      <DigestPreview />
    </Hydrated>
  );
}
