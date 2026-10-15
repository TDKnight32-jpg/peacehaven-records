import { namesList, type ListChange } from "./record-approval";

// Text for the records officer's confirmation panel after deciding a
// submission (components/officials-queue.tsx). Nothing here is sent
// anywhere — the officer copies the message and sends it themselves.

/** "Tommy Knight" → "Tommy", for the greeting. */
function firstName(athleteName: string): string {
  return athleteName.trim().split(/\s+/)[0] || athleteName;
}

/** "#2", or "joint #2". */
function placeText(c: ListChange): string {
  return `${c.jointWith.length > 0 ? "joint " : ""}#${c.position}`;
}

/** "Now #1 in Men's 10K" (or "Now joint #1 in … with …"), one per list it
 * entered; or why nothing changed. */
export function describeChanges(changes: ListChange[]): string[] {
  if (changes.length === 0) return ["Outside the top 3, so the live records are unchanged."];
  return changes.map(
    (c) => `Now ${placeText(c)} in ${c.list}${c.jointWith.length > 0 ? ` with ${namesList(c.jointWith)}` : ""}`,
  );
}

export function approvalMessage({
  athleteName,
  distanceName,
  performance,
  changes,
  newRecordList,
  hasCard = false,
}: {
  athleteName: string;
  distanceName: string;
  performance: string;
  changes: ListChange[];
  /** The list it set a new #1 in, if it did (see getNewRecord). */
  newRecordList: string | null;
  /** Whether it has a share card (any top-3 place) for the officer to attach. */
  hasCard?: boolean;
}): string {
  const hi = `Hi ${firstName(athleteName)},`;
  // An equalled record: the change for that list says who it's shared with.
  const shared = newRecordList ? changes.find((c) => c.list === newRecordList && c.jointWith.length > 0) : undefined;
  if (newRecordList && shared) {
    return (
      `${hi} your ${newRecordList} time of ${performance} has been approved. It equals the club record, ` +
      `so you now share it with ${namesList(shared.jointWith)} on the Peacehaven Run Club records page. ` +
      `Congratulations! I've attached your record card to share.`
    );
  }
  if (newRecordList) {
    return (
      `${hi} your ${newRecordList} time of ${performance} has been approved and is now on the ` +
      `Peacehaven Run Club records page as the new club record. Congratulations! ` +
      `I've attached your record card to share.`
    );
  }
  // Lead with the best place it took (lists come age group first, then overall).
  const best = [...changes].sort((a, b) => a.position - b.position)[0];
  if (best) {
    return (
      `${hi} your ${best.list} time of ${performance} has been approved and is now on the ` +
      `Peacehaven Run Club records page at ${placeText(best)}. Congratulations!` +
      (hasCard ? ` I've attached a card to share.` : "")
    );
  }
  return (
    `${hi} your ${distanceName} time of ${performance} has been approved. It isn't quite in the ` +
    `top 3 on the Peacehaven Run Club records page this time, but thank you for sending it in — well run!`
  );
}

export function declineMessage({
  athleteName,
  distanceName,
  performance,
  reason,
}: {
  athleteName: string;
  distanceName: string;
  performance: string;
  reason: string;
}): string {
  // The officer's note as its own sentence: capitalised, ending in a full stop.
  const note = reason.trim().replace(/\s+/g, " ");
  const sentence = note.charAt(0).toUpperCase() + note.slice(1) + (/[.!?]$/.test(note) ? "" : ".");
  return (
    `Hi ${firstName(athleteName)}, thank you for sending in your ${distanceName} time of ${performance}. ` +
    `Unfortunately we can't add it to the Peacehaven Run Club records this time. ${sentence} ` +
    `If you think we've got this wrong, just reply and let me know.`
  );
}
