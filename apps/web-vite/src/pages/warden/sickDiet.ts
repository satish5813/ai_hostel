/** The food a student on sick leave gets in the room. The kitchen reads the menu line; the Floor Manager chooses. */
export type Diet = 'Light' | 'Liquid' | 'Normal';
export const DIET: Record<Diet, { label: string; menu: string; tone: string }> = {
  Light: { label: 'Light food', menu: 'Khichdi, idli, curd rice, plain dal, vegetable soup, banana', tone: 'warn' },
  Liquid: { label: 'Liquid only', menu: 'Soups, dal water, fruit juice, buttermilk, ORS', tone: 'bad' },
  Normal: { label: 'Normal meal', menu: 'The regular rasoi meal, sent to the room', tone: 'good' },
};
/** Who a sick-leave step belongs to, as people say it. */
export const STEP_ROLE: Record<string, string> = { Floor_Warden: 'Floor Manager', Warden: 'Building in-charge', Hostel_Incharge: 'Building in-charge', Chief_Warden: 'Chief Manager' };
