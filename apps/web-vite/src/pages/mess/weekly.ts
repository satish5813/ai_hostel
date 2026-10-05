/** Shared by MES-08 Weekly menu, MES-09 Choose my meals and RPT-11 Weekly meal choices. */
export type Course = { course_code: string; course_name: string; meals: string[]; can_skip: boolean; default_on_close: 'Match' | 'Skip'; min_options: number; max_options: number | null; hint: string | null };
export type Fixed = { meal: string; cuisine: 'South' | 'North'; items: string };
export type Option = { option_id: number; day_no: number; meal: string; course_code: string; dish: string; cuisine: 'South' | 'North' | 'Both'; diet: 'Veg' | 'Non_Veg'; chosen?: number; defaulted?: number; plates?: number };
export type Week = { week_id: number; mess_id: number; mess_name: string; week_start: string; status: 'Draft' | 'Published' | 'Closed'; choices_close_at: string; is_open: boolean; notes: string | null;
  prepared_by_name: string | null; published_by_name: string | null; published_at: string | null; closed_at: string | null };

export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const CHOICE_MEALS = ['Breakfast', 'Lunch', 'Evening_Snacks', 'Dinner'] as const;
export const mealLabel = (m: string) => (m === 'Evening_Snacks' ? 'Evening snacks' : m);
export const STYLE: Record<string, string> = { South: 'South Indian', North: 'North Indian', Both: 'North & South' };
export const dietLabel = (d: string) => (d === 'Veg' ? 'Veg' : 'Non-veg');

/** The date of day `n` (1 = Monday) of a week, e.g. "Mon 12 Oct". */
export const dayDate = (weekStart: string, n: number) => {
  const d = new Date(`${weekStart}T00:00:00`);
  d.setDate(d.getDate() + n - 1);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
};
export const weekLabel = (weekStart: string) => `${dayDate(weekStart, 1)} – ${dayDate(weekStart, 7)}`;
/** "12–18 Oct" (or "28 Sep – 4 Oct") for tight places. */
export const weekShort = (weekStart: string) => {
  const a = new Date(`${weekStart}T00:00:00`), b = new Date(a); b.setDate(a.getDate() + 6);
  const m = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short' });
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${m(b)}` : `${a.getDate()} ${m(a)} – ${b.getDate()} ${m(b)}`;
};
/** Choices close at midnight; people read the last minute before it: "Thu 08 Oct, 11:59 pm". */
export const dueLabel = (closeAt: string) =>
  new Date(Date.parse(closeAt) - 60_000).toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

/** Slots of a week that a student answers: each day, meal and course that has dishes. */
export const slotsOf = (options: Option[]) => {
  const seen = new Set<string>();
  options.forEach((o) => seen.add(`${o.day_no}|${o.meal}|${o.course_code}`));
  return seen;
};
