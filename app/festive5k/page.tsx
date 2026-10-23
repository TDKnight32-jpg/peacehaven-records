import { FestiveBoard } from "@/components/festive5k-board";
import { getFestiveData } from "@/lib/festive5k";
import { FESTIVE_5K_NEXT_RACE } from "@/lib/festive5k-config";

// Re-read the results sheet at most once a minute, so race-day results
// appear on the board shortly after they're typed into the sheet.
export const revalidate = 60;

export default async function FestivePage() {
  const data = await getFestiveData();
  return <FestiveBoard {...data} nextRace={FESTIVE_5K_NEXT_RACE} />;
}
