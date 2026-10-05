// Share card sizes, in a module of their own so client components can use
// them without pulling in the server-only renderer (lib/record-card-image.tsx).
// The design is laid out at the full 1080px and scaled for the smaller
// version the Latest records strip shows; the full size is only fetched for
// sharing and downloading.
export const RECORD_CARD_SIZE = 1080;
export const RECORD_CARD_THUMB_SIZE = 480;
