import { Hydrated } from "@/components/hydrated";
import { MeetingScreen } from "@/app/app/overleg/[id]/meeting-screen";
export default function Page() {
  return (
    <Hydrated>
      <MeetingScreen />
    </Hydrated>
  );
}
