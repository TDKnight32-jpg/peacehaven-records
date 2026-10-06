import type { Metadata } from "next";
import { AgeGradeCalculator } from "@/components/age-grade-calculator";
import { LogbookFooter, LogbookHeader } from "@/components/logbook-chrome";

export const metadata: Metadata = {
  title: "Age grading | Peacehaven Run Club",
  description:
    "Age grading compares your time with the best in the world for your age and gender, so runners of any age can be compared fairly.",
};

export default function LogbookAgeGradingPage() {
  return (
    <>
      <LogbookHeader
        current="age-grading"
        title="Age grading"
        intro="Age grading compares your time with the best in the world for your age and gender, so runners of any age can be compared fairly."
      />

      <main className="wrap">
        <AgeGradeCalculator />

        <p className="note">
          Uses the 2025 road age-grading tables by Alan Jones. Other sites may use different versions, so percentages
          can differ slightly.
        </p>
        <p className="credit">
          Age-grading factors: 2025 road running tables by Alan Jones, with single-age bests by Tom Bernhard, approved
          by the USATF Masters Long Distance Running Council. From{" "}
          <a href="https://github.com/AlanLyttonJones/Age-Grade-Tables">github.com/AlanLyttonJones/Age-Grade-Tables</a>,
          released under{" "}
          <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0</a>.
        </p>

        <LogbookFooter paceFormulas={false} />
      </main>
    </>
  );
}
