import type { Metadata } from "next";
import { LogbookFooter, LogbookHeader } from "@/components/logbook-chrome";
import { LogbookCards, type LogbookCard } from "@/components/logbook-cards";

export const metadata: Metadata = {
  title: "Warm ups and cool downs | Peacehaven Run Club",
  description: "How to get ready to run, and how to finish.",
};

const CARDS: LogbookCard[] = [
  {
    name: "Warm up",
    rows: [
      { label: "When", content: "Before every run, and especially before a hard session or race." },
      {
        label: "How",
        content:
          "10 to 15 minutes of easy running, then dynamic stretches. Before a hard session or race, finish with 4 x 20 second strides, building up to a fast but relaxed pace.",
      },
      {
        label: "Why",
        content:
          "Raises your heart rate and body temperature gradually, so your muscles are ready to work and the first rep doesn't come as a shock.",
      },
    ],
  },
  {
    name: "Dynamic stretching",
    rows: [
      { label: "When", content: "Before running, after your easy warm up jog." },
      {
        label: "How",
        content: (
          <>
            Controlled movements that take your joints through their full range. Do each for about 10 to 15
            metres or 10 repeats per side:
            <ul>
              <li>Leg swings, forwards and sideways</li>
              <li>Walking lunges</li>
              <li>High knees</li>
              <li>Heel flicks</li>
              <li>Hip circles</li>
              <li>A-skips</li>
              <li>Ankle bounces</li>
            </ul>
          </>
        ),
      },
      {
        label: "Why",
        content:
          "Wakes up the muscles you run with and improves your range of movement without switching them off.",
      },
    ],
  },
  {
    name: "Cool down",
    rows: [
      { label: "When", content: "Straight after every hard session or race." },
      { label: "How", content: "5 to 10 minutes of very easy jogging, slowing to a walk." },
      { label: "Why", content: "Brings your heart rate and breathing down gradually and starts your recovery." },
    ],
  },
  {
    name: "Static stretching",
    rows: [
      { label: "When", content: "After running, once you've cooled down. Not before a run." },
      {
        label: "How",
        content: (
          <>
            Hold each stretch for 20 to 30 seconds without bouncing. It should feel like a gentle pull, never
            pain. Cover both sides:
            <ul>
              <li>Calves</li>
              <li>Hamstrings</li>
              <li>Quads</li>
              <li>Hip flexors</li>
              <li>Glutes</li>
            </ul>
          </>
        ),
      },
      { label: "Why", content: "Helps your muscles relax and maintains flexibility over time." },
    ],
  },
];

export default function LogbookWarmUpPage() {
  return (
    <>
      <LogbookHeader
        current="warm-up"
        title="Warm ups and cool downs"
        intro="How to get ready to run, and how to finish."
      />

      <main className="wrap">
        <LogbookCards cards={CARDS} />
        <p className="note">
          This is general guidance. If something hurts, stop, and speak to a physio or your GP about any injury.
        </p>
        <LogbookFooter />
      </main>
    </>
  );
}
