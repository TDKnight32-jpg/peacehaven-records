import { LogbookCalculator } from "@/components/logbook-calculator";
import { LogbookFooter, LogbookHeader } from "@/components/logbook-chrome";

export default function LogbookPage() {
  return (
    <>
      <LogbookHeader
        current="calculator"
        title="Training logbook"
        intro="Pick a race, set a goal time, and get the paces to train at."
      />

      <main className="wrap">
        <LogbookCalculator />
        <LogbookFooter />
      </main>
    </>
  );
}
