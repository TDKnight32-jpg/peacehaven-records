import { Runner } from "@/components/c25k-icons";

interface Testimonial {
  quote: string;
  attribution: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Having signed up for the C25K in January, I have to say it's the best thing I've done in a very long time! Everyone at the club was super supportive and encouraging throughout the journey, and I couldn't have done it without them. I'm a slow older runner and know I won't be breaking any land speed records but everyone's abilities and levels are welcomed. Not only helping with my fitness and mental health, I have also met some amazing people along the way. Thank you PRC, for me, it's honestly been life changing.",
    attribution: "Rach, C25K graduate, 2025",
  },
  {
    quote:
      "I have just graduated their Couch to 5K plan, which I honestly could not have done without them. I found everyone in the club really friendly and supportive, and since graduating, I have now joined the club. If you are looking for a friendly bunch of people to run with, or a supportive group to start your running journey, then look no further.",
    attribution: "Aaron, C25K graduate, 2025",
  },
  {
    quote:
      "I started the couch to 5K in January, we did a nine week course building up to graduation running a 5K at a park run. I had no running experience at all but with the help from the Peacehaven run club I was able to complete the 5K and I am now happy to be part of the Peacehaven run club I highly recommend jumping on board.",
    attribution: "Adam, C25K graduate, 2025",
  },
];

// Stacked rather than a side-by-side grid — these are full, real quotes
// (not trimmed), and a single wide column reads far better for a
// paragraph of text than three narrow columns would.
export function Testimonials() {
  return (
    <div className="flex flex-col gap-5">
      {TESTIMONIALS.map((t) => (
        <div key={t.attribution} className="flex flex-col gap-3 rounded-2xl bg-surface p-6 sm:flex-row sm:gap-5">
          {/* A real photo would replace this circle entirely — see
           * hero-banner.tsx for the same pattern (a `photoSrc`-style prop)
           * if this needs to become a real <Image> later. */}
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-100">
            <Runner className="h-6 w-6 text-primary" />
          </span>
          <div className="min-w-0">
            <p className="text-base italic leading-relaxed text-foreground/85">&ldquo;{t.quote}&rdquo;</p>
            <p className="mt-3 text-sm font-bold text-foreground">— {t.attribution}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
