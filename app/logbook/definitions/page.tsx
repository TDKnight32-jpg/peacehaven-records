import type { Metadata } from "next";
import { LogbookFooter, LogbookHeader } from "@/components/logbook-chrome";
import { LogbookCards, type LogbookCard } from "@/components/logbook-cards";

export const metadata: Metadata = {
  title: "Training definitions | Peacehaven Run Club",
  description: "What each training pace is, how it should feel, and what it's for.",
};

// In the same order, and with the same lane colours (l1 to l5), as the
// training paces on the main logbook page. Fast reps (l6) has no pace there.
const DEFINITIONS = [
  {
    name: "Easy pace / general aerobic",
    what: "Relaxed running that makes up most of your weekly miles, including warm-ups, cool-downs, recovery runs and long runs.",
    feel: "Comfortable. You can hold a full conversation.",
    purpose: "Builds your aerobic base and endurance while letting your body recover between harder sessions.",
  },
  {
    name: "Marathon pace",
    what: "The pace you could hold for a full marathon. Steady, and a notch quicker than easy.",
    feel: "Controlled. You can talk in short sentences.",
    purpose: "Gets you used to race rhythm and builds endurance, usually as part of a long run.",
  },
  {
    name: "Threshold pace",
    what: "Roughly the pace you could hold for about an hour in a race. Run as a continuous 20 minute effort or as longer reps with short recoveries.",
    feel: "Comfortably hard. Only a few words at a time.",
    purpose: "Trains your body to hold a faster pace for longer before fatigue builds up.",
  },
  {
    name: "Interval pace",
    what: "Hard running in reps of about 3 to 5 minutes, with a jog recovery of similar length or slightly shorter.",
    feel: "Hard. You're breathing heavily and can't chat.",
    purpose: "Raises your top-end aerobic fitness, the engine behind your 5K and 10K times.",
  },
  {
    name: "Rep pace",
    what: "Fast, short reps of 200m to 400m, close to your one mile race pace, with a full recovery between each.",
    feel: "Quick but smooth and relaxed. Never a sprint.",
    purpose: "Improves your speed and running form so quicker paces feel easier.",
  },
  {
    name: "Fast reps",
    what: "Very fast, very short reps of 100m to 300m, around your 800m race pace, with a long recovery.",
    feel: "Close to flat out, but still in control.",
    purpose: "Develops raw speed. Mostly for track and shorter-distance racing.",
  },
];

const CARDS: LogbookCard[] = DEFINITIONS.map((d) => ({
  name: d.name,
  rows: [
    { label: "What it is", content: d.what },
    { label: "How it feels", content: d.feel },
    { label: "What it's for", content: d.purpose },
  ],
}));

export default function LogbookDefinitionsPage() {
  return (
    <>
      <LogbookHeader
        current="definitions"
        title="Training definitions"
        intro="What each training pace is, how it should feel, and what it's for."
      />

      <main className="wrap">
        <LogbookCards cards={CARDS} />

        <LogbookFooter />
      </main>
    </>
  );
}
