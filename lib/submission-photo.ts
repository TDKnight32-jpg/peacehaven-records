// No server-only imports here: the /submit form uses these too, for its
// instant size check.

/** Kept under Vercel Functions' 4.5MB request body cap, since the photo is
 * sent through the submit server action along with the rest of the form
 * (see serverActions.bodySizeLimit in next.config.ts). */
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export const PHOTO_ACCEPT = "image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif";

// Brands an iPhone (or other HEIF writer) puts in the `ftyp` box.
const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);

/** Identifies a JPEG, PNG or HEIC/HEIF from its first bytes rather than
 * trusting the browser-reported type, which is often blank for HEIC. */
export function detectPhotoType(bytes: Uint8Array): { ext: string; contentType: string } | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: "jpg", contentType: "image/jpeg" };
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) {
    return { ext: "png", contentType: "image/png" };
  }
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(4, 8) === "ftyp" && HEIF_BRANDS.has(ascii(8, 12))) return { ext: "heic", contentType: "image/heic" };
  return null;
}
