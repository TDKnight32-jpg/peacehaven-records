import { getScoringTypeBoards } from "@/lib/gp";
import { GpBreakdown } from "@/components/gp-breakdown";

// Updated by re-running the import script against the production DB, same
// as the rest of the GP section — never cached.
export const revalidate = 0;

export default async function Page() {
  const boards = await getScoringTypeBoards();
  return <GpBreakdown boards={boards} />;
}
