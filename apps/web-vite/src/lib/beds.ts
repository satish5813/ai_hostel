/**
 * Bed letter (decision D8): beds are lettered A, B, C ... within a room. Older data may still say "Bed-2"; both read the same.
 * The printed label is hostel-room-bed, for example BH3-1207-B.
 */
export const bedLetter = (code?: string | null) => {
  if (!code) return '?';
  if (/^[A-H]$/.test(code)) return code;
  const n = Number(code.replace(/\D/g, ''));
  return 'ABCDEFGH'[n - 1] ?? code;
};
export const bedLabel = (hostelCode: string | null | undefined, roomCode: string, bedCode: string) => `${hostelCode ? `${hostelCode}-` : ''}${roomCode}-${bedLetter(bedCode)}`;
