import type { StandingMovement } from "@/lib/gp";

export function MovementIndicator({ movement }: { movement: StandingMovement | undefined }) {
  if (!movement || movement.direction === null) return null;

  const isUp = movement.direction === "up";
  return (
    <span
      className={`ml-1 inline-flex items-baseline gap-0.5 text-xs font-semibold ${
        isUp ? "text-gp-points-strong" : "text-gp-points-weak"
      }`}
      title={`Moved ${isUp ? "up" : "down"} ${movement.places} place${movement.places === 1 ? "" : "s"} on the overall standings`}
    >
      {isUp ? "▲" : "▼"}
      {movement.places}
    </span>
  );
}
