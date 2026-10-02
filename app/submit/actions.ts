"use server";

import { del, put } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { getSubmitDistanceOptions, isHttpUrl, parsePerformanceTime } from "@/lib/submissions";
import { MAX_PHOTO_BYTES, detectPhotoType } from "@/lib/submission-photo";

export type SubmitField =
  | "distance"
  | "gender"
  | "ageCategory"
  | "performance"
  | "athleteName"
  | "event"
  | "date"
  | "email"
  | "resultsUrl"
  | "photo"
  | "proof"
  | "member";

export type SubmitState =
  | { status: "idle" }
  | { status: "error"; errors: Partial<Record<SubmitField, string>> }
  | { status: "success"; athleteName: string; distanceName: string };

const MAX_TEXT = 200;
const MAX_URL = 2000;

function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

// Public, no login: the form's own checks are a convenience, this is the
// real validation. Nothing written here reaches the live records pages —
// rows land as PENDING for an approver to review.
export async function submitRecord(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const errors: Partial<Record<SubmitField, string>> = {};

  const distances = await getSubmitDistanceOptions();
  const distance = distances.find((d) => d.slug === text(formData, "distance"));
  if (!distance) errors.distance = "Choose a distance.";

  const gender = text(formData, "gender");
  if (gender !== "M" && gender !== "F") errors.gender = "Choose a gender.";

  const ageCategory = text(formData, "ageCategory");
  if (distance && !distance.ageCategories.includes(ageCategory)) errors.ageCategory = "Choose an age category.";

  let time: string | null = null;
  let laps: number | null = null;
  const performance = text(formData, "performance");
  if (distance?.unit === "laps") {
    laps = /^\d{1,4}$/.test(performance) ? Number(performance) : null;
    if (!laps) errors.performance = "Enter the number of laps completed.";
  } else if (distance) {
    time = parsePerformanceTime(performance);
    if (!time) errors.performance = "Enter a time as mm:ss, or h:mm:ss if over an hour.";
  }

  const athleteName = text(formData, "athleteName");
  if (!athleteName) errors.athleteName = "Enter the athlete's name.";
  else if (athleteName.length > MAX_TEXT) errors.athleteName = "That name is too long.";

  const event = text(formData, "event");
  if (!event) errors.event = "Enter the race or event name.";
  else if (event.length > MAX_TEXT) errors.event = "That event name is too long.";

  const dateRaw = text(formData, "date");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? new Date(`${dateRaw}T00:00:00Z`) : null;
  if (!date || Number.isNaN(date.getTime())) errors.date = "Enter the date of the race.";
  else if (date.getTime() > Date.now()) errors.date = "The race date can't be in the future.";

  const email = text(formData, "email");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > MAX_TEXT) {
    errors.email = "Enter a valid email address.";
  }

  // Proof: a results link, a photo of the result, or both — but at least one.
  const resultsUrl = text(formData, "resultsUrl");
  if (resultsUrl && (!isHttpUrl(resultsUrl) || resultsUrl.length > MAX_URL)) {
    errors.resultsUrl = "Enter a full link to the official results, starting https://";
  }

  const photoField = formData.get("photo");
  const photoFile = photoField instanceof File && photoField.size > 0 ? photoField : null;
  let photo: { bytes: Uint8Array; ext: string; contentType: string } | null = null;
  if (photoFile) {
    if (photoFile.size > MAX_PHOTO_BYTES) {
      errors.photo = "That photo is over 4MB. Try a screenshot or a smaller photo.";
    } else {
      const bytes = new Uint8Array(await photoFile.arrayBuffer());
      const type = detectPhotoType(bytes);
      if (type) photo = { bytes, ...type };
      else errors.photo = "The photo must be a JPG, PNG or HEIC image.";
    }
  }

  if (!resultsUrl && !photoFile) {
    errors.proof = "Add a link to the official results, or upload a photo of your result.";
  }

  if (formData.get("member") !== "on") errors.member = "Please confirm the athlete is a club member.";

  if (Object.keys(errors).length > 0 || !distance || !date) return { status: "error", errors };

  // Uploaded only once everything else has passed, so a rejected form
  // doesn't leave an orphaned photo in the store.
  let photoUrl: string | null = null;
  if (photo) {
    try {
      const blob = await put(`record-submissions/result.${photo.ext}`, Buffer.from(photo.bytes), {
        access: "private",
        addRandomSuffix: true,
        contentType: photo.contentType,
      });
      photoUrl = blob.url;
    } catch (err) {
      console.error("Record submission photo upload failed", err);
      return {
        status: "error",
        errors: { photo: "Sorry, the photo couldn't be uploaded. Please try again, or use a results link instead." },
      };
    }
  }

  try {
    await prisma.recordSubmission.create({
      data: {
        distance: { connect: { slug: distance.slug } },
        gender,
        ageCategory,
        time,
        laps,
        athleteName,
        event,
        date,
        email,
        resultsUrl: resultsUrl || null,
        photoUrl,
      },
    });
  } catch (err) {
    if (photoUrl) await del(photoUrl).catch(() => {});
    throw err;
  }

  return { status: "success", athleteName, distanceName: distance.name };
}
