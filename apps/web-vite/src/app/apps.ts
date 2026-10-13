/**
 * The apps of the launcher (design "KL Hostels Admin"). An app groups the screens of one area; each screen is an
 * operation in the app's sidebar. What a person sees is cut down to the screens their role may open (screens.ts),
 * so a Floor Warden and a Chief Warden get the same frame with different apps and operations.
 */
import {
  Activity, BedDouble, GitPullRequestArrow, LayoutDashboard, BedSingle, Building2, CalendarCheck, CalendarRange, ChartColumn, ClipboardCheck, ClipboardList, Database, DoorClosed, DoorOpen, Eye, FileText,
  Fingerprint, Footprints, Gauge, GraduationCap, House, IdCard, Inbox, KeyRound, Layers, ListChecks, Lock, Map as MapIcon, Network, Presentation, QrCode,
  RadioTower, Receipt, ReceiptText, ScanLine, ScrollText, Search, Settings, ShieldCheck, Siren, Stethoscope, Upload, UserCog, Users, Utensils, Wrench, Zap, type LucideIcon, CalendarSync, ShieldAlert } from 'lucide-react';
import { roleDef } from './screens';
import { DATA_KINDS } from '@/admin/registry';

export type Mod = 'indigo' | 'teal' | 'violet' | 'sky' | 'amber' | 'em' | 'orange' | 'rose';
/** Module colours: soft tint, ink on the tint, gradient, glow, ink on the gradient (from the design). */
export const MODC: Record<Mod, { bg: string; fg: string; grad: string; glow: string; on: string }> = {
  indigo: { bg: '#EBEFFF', fg: '#364FC7', grad: 'linear-gradient(135deg,#4263EB,#364FC7)', glow: 'rgba(66,99,235,.7)', on: '#FFFFFF' },
  teal: { bg: '#E3F4F2', fg: '#0B7A71', grad: 'linear-gradient(135deg,#0B7A71,#0A5F6E)', glow: 'rgba(11,122,113,.7)', on: '#FFFFFF' },
  violet: { bg: '#F1ECFF', fg: '#5F3DC4', grad: 'linear-gradient(135deg,#7048E8,#5932D1)', glow: 'rgba(112,72,232,.7)', on: '#FFFFFF' },
  sky: { bg: '#E6F1FB', fg: '#1971C2', grad: 'linear-gradient(135deg,#1971C2,#1557A0)', glow: 'rgba(25,113,194,.7)', on: '#FFFFFF' },
  amber: { bg: '#FFF5D6', fg: '#A35A00', grad: 'linear-gradient(135deg,#FFD166,#FF7A45)', glow: 'rgba(255,122,69,.7)', on: '#2B1405' },
  em: { bg: '#E5F4E8', fg: '#237A37', grad: 'linear-gradient(135deg,#237A37,#1B5E2B)', glow: 'rgba(35,122,55,.7)', on: '#FFFFFF' },
  orange: { bg: '#FFF0E6', fg: '#C2410C', grad: 'linear-gradient(135deg,#C2410C,#9A3412)', glow: 'rgba(194,65,12,.7)', on: '#FFFFFF' },
  rose: { bg: '#FFE8EF', fg: '#C2255C', grad: 'linear-gradient(135deg,#C2255C,#A61E4D)', glow: 'rgba(194,37,92,.7)', on: '#FFFFFF' },
};

export type Op = { label: string; route: string; icon: LucideIcon; code?: string; roles?: string[]; /** the screen draws the design's own head */ own?: boolean };
export type App = { k: string; name: string; mod: Mod; icon: LucideIcon; ops: Op[]; stat?: (s: Summary) => string };
export type Summary = {
  hero: { beds: number; occupied: number; on_pass: number; staff_present: number; staff_total: number };
  stats: { open_beds: number; blocked_rooms: number; overdue: number; residents: number; alerts: number; faulty_meters: number; open_tickets: number };
  needs: { key: string; count: number; title: string; sub: string; route: string }[];
  badges: Record<string, number>;
  systems: { erp_sync: string | null; collected_today: number; failed_today: number; registrations_today: number; gateway_live: boolean };
};

const ADMIN_DATA = (group: string, icon: LucideIcon): Op[] => DATA_KINDS.filter((d) => d.group === group).map((d) => ({ label: d.title, route: `/admin/data/${d.kind}`, icon, roles: ['admin'] }));

export const APPS: App[] = [
  { k: 'charge', name: 'My hostels', mod: 'violet', icon: LayoutDashboard, stat: () => 'Overview and decisions', ops: [
    { label: 'Overview', route: '/overview', icon: LayoutDashboard, code: 'CWP-01', own: true },
    { label: 'Exceptions', route: '/exceptions', icon: GitPullRequestArrow, code: 'REG-13', own: true },
    { label: 'Yearly renewals', route: '/renewals', icon: CalendarSync, code: 'REG-14', own: true },
  ] },
  { k: 'rooms', name: 'Rooms and allotment', mod: 'indigo', icon: BedDouble, stat: (s) => `${s.stats.open_beds} beds open · ${s.stats.blocked_rooms} rooms blocked`, ops: [
    { label: 'Hostel allotment', route: '/allotment-view', icon: BedDouble, code: 'REG-12', own: true },
    { label: 'Yearly renewals', route: '/renewals', icon: CalendarSync, code: 'REG-14', own: true },
    { label: 'Exceptions', route: '/exceptions', icon: GitPullRequestArrow, code: 'REG-13', own: true },
    { label: 'Room blocking', route: '/room-blocking', icon: Lock, code: 'REG-10', own: true },
    { label: 'Allotment approvals', route: '/allotment-approvals', icon: ClipboardCheck, code: 'REG-11', own: true },
    { label: 'Allotment desk', route: '/allotment', icon: BedSingle, code: 'REG-05' },
    { label: 'Check-in and handover', route: '/check-in', icon: KeyRound, code: 'REG-06' },
    { label: 'Occupancy board', route: '/occupancy', icon: Layers, code: 'REG-08' },
    { label: 'Dues and collections', route: '/dues', icon: Receipt, code: 'REG-07' },
    { label: 'Rooms and beds', route: '/rooms', icon: DoorClosed, code: 'MAP-01' },
    { label: 'Staff rooms', route: '/staff-rooms', icon: BedSingle, code: 'MAP-05' },
    { label: 'QR labels', route: '/qr-labels', icon: QrCode, code: 'MAP-03' },
  ] },
  { k: 'people', name: 'People and attendance', mod: 'teal', icon: Users, stat: (s) => `${s.hero.staff_present} of ${s.hero.staff_total} staff present today`, ops: [
    { label: 'My floor today', route: '/floor', icon: House, roles: ['Floor_Warden'] },
    { label: 'Roll call', route: '/roll-call', icon: ListChecks, code: 'TRK-08' },
    { label: 'Staff attendance', route: '/duty-roster', icon: CalendarCheck, code: 'MAP-06', own: true },
    { label: 'Room mapping', route: '/room-mapping', icon: Network, code: 'MAP-08', own: true },
    { label: 'Mapping centre', route: '/mapping', icon: Network, code: 'MAP-07' },
    { label: 'Staff assignments', route: '/staff-mapping', icon: UserCog, code: 'MAP-02' },
    { label: 'Attendance register', route: '/attendance', icon: CalendarRange, code: 'TRK-07' },
  ] },
  { k: 'outing', name: 'Outing and leave', mod: 'violet', icon: DoorOpen, stat: (s) => `${s.hero.on_pass} outside on pass`, ops: [
    { label: 'Outpasses', route: '/outing-approvals', icon: DoorOpen, code: 'OUT-03' },
    { label: 'Sick leaves', route: '/sick-leave-approvals', icon: Stethoscope, code: 'SCK-02' },
    { label: 'Sick meals list', route: '/mess-sick-list', icon: Utensils, code: 'SCK-03' },
  ] },
  { k: 'tracking', name: 'Tracking and gate', mod: 'sky', icon: ScanLine, stat: (s) => `${s.stats.overdue} overdue returns · ${s.stats.alerts} open alerts`, ops: [
    { label: 'Alerts', route: '/alerts', icon: Siren, code: 'TRK-03' },
    { label: 'Access control', route: '/access', icon: Fingerprint, code: 'TRK-09' },
    { label: 'Status board', route: '/status-board', icon: Activity, code: 'TRK-01' },
    { label: 'Student look-up', route: '/look-up', icon: Search, code: 'TRK-02' },
    { label: 'Gate scan', route: '/gate', icon: ScanLine, code: 'TRK-04' },
    { label: 'Capture points', route: '/capture-points', icon: RadioTower, code: 'TRK-05' },
    { label: 'Look-up log', route: '/look-up-log', icon: Footprints, code: 'TRK-06' },
  ] },
  { k: 'electricity', name: 'Electricity', mod: 'amber', icon: Zap, stat: (s) => `${s.stats.faulty_meters} faulty meter${s.stats.faulty_meters === 1 ? '' : 's'}`, ops: [
    { label: 'Meters', route: '/meters', icon: Gauge, code: 'ELE-02' },
    { label: 'Room electricity bills', route: '/electricity-bills', icon: Zap, code: 'ELE-04' },
    { label: 'Tariffs', route: '/tariff', icon: ReceiptText, code: 'ELE-03' },
  ] },
  { k: 'residents', name: 'Residents', mod: 'rose', icon: GraduationCap, stat: (s) => `${s.stats.residents.toLocaleString('en-IN')} checked in`, ops: [
    { label: 'Student performance', route: '/academics', icon: GraduationCap, code: 'ACA-01' },
    { label: 'Career tracker', route: '/career-tracker', icon: Presentation, code: 'CAR-01' },
    { label: 'Health records', route: '/health', icon: Activity, code: 'HLT-01' },
    { label: 'Room changes', route: '/room-changes', icon: BedDouble, code: 'RCH-01' },
    { label: 'Caution deposits', route: '/caution-deposits', icon: ShieldCheck, code: 'CDP-01' },
    { label: 'Grievances', route: '/grievances', icon: ShieldAlert, code: 'TKT-06' },
    { label: 'Checklists', route: '/checklists', icon: ClipboardCheck, code: 'TKT-05' },
  ] },
  { k: 'maintenance', name: 'Maintenance', mod: 'orange', icon: Wrench, stat: (s) => `${s.stats.open_tickets} open ticket${s.stats.open_tickets === 1 ? '' : 's'}`, ops: [
    { label: 'Repair desk', route: '/repair-desk', icon: Wrench, code: 'TKT-03' },
    { label: 'Floor rounds and repairs', route: '/maintenance', icon: ClipboardList, code: 'TKT-04' },
  ] },
  { k: 'reports', name: 'Reports', mod: 'em', icon: ChartColumn, stat: () => 'Occupancy, fees, meal choices', ops: [
    { label: 'Occupancy, fees and dues', route: '/reports/occupancy-fees-dues', icon: ChartColumn, code: 'RPT-07' },
    { label: 'Weekly meal choices', route: '/reports/meal-choices', icon: ChartColumn, code: 'RPT-11' },
    { label: 'Mess sentiment', route: '/reports/mess-sentiment', icon: Activity, code: 'RPT-12' },
    { label: 'Executive dashboard', route: '/exec', icon: Gauge, code: 'EXE-01' },
  ] },
  // the Data Administrator's apps
  { k: 'setup', name: 'Hostel set-up', mod: 'teal', icon: Building2, stat: () => 'Hostels, room types, rooms, fees', ops: [
    { label: 'Set-up board', route: '/admin/board', icon: House, roles: ['admin'] },
    { label: 'Academic years and registration window', route: '/admin/masters?tab=years', icon: CalendarRange, roles: ['admin'] },
    { label: 'Room builder', route: '/admin/room-builder', icon: Building2, roles: ['admin'] },
    { label: 'Hostel allotment', route: '/allotment-view', icon: BedDouble, roles: ['admin'], own: true },
    ...ADMIN_DATA('Hostel set-up', Building2),
    { label: 'Room map', route: '/rooms', icon: MapIcon, roles: ['admin'] },
    ...ADMIN_DATA('Room inventory', Database),
  ] },
  { k: 'peopledata', name: 'People data', mod: 'violet', icon: IdCard, stat: () => 'Students, staff, duties, beds', ops: [
    ...ADMIN_DATA('People', IdCard),
    { label: 'Mapping centre', route: '/mapping', icon: Network, roles: ['admin'] },
    { label: 'File uploads', route: '/admin/masters?tab=upload', icon: Upload, roles: ['admin'] },
  ] },
  { k: 'access', name: 'Users and rules', mod: 'rose', icon: ShieldCheck, stat: () => 'Roles, approvals, audit', ops: [
    { label: 'Logins: create and invite', route: '/admin/accounts', icon: KeyRound, roles: ['admin'] },
    { label: 'Logins and hostels', route: '/admin/logins', icon: ShieldCheck, roles: ['admin'] },
    { label: 'Users and roles', route: '/admin/users', icon: UserCog, code: 'ADM-01' },
    { label: 'Approval rules and settings', route: '/admin/settings', icon: Settings, code: 'ADM-02' },
    { label: 'Audit log', route: '/admin/audit-log', icon: Eye, code: 'ADM-03' },
    { label: 'Screen map', route: '/screens', icon: FileText, roles: ['admin'] },
  ] },
  { k: 'database', name: 'Database', mod: 'teal', icon: Database, stat: () => 'Every table of the data model', ops: [
    { label: 'All tables', route: '/admin/db', icon: Database, roles: ['admin'] },
  ] },
  // mess: weekly menu with students' choices, and the routine menu; the rest of Workflow G follows. Convention centre is not in this release.
  { k: 'affairs', name: 'Student affairs', mod: 'orange', icon: ShieldAlert, stat: () => 'Absence, discipline, weekly reports, careers', ops: [
    { label: 'Overview', route: '/dean', icon: LayoutDashboard, code: 'DSA-01', own: true },
    { label: 'Absence report', route: '/absence-report', icon: CalendarCheck, code: 'RPT-09', own: true },
    { label: 'Discipline register', route: '/discipline', icon: ShieldAlert, code: 'DIS-07', own: true },
    { label: 'Weekly floor reports', route: '/weekly-reports', icon: FileText, code: 'RPT-10', own: true },
    { label: 'Career guidance', route: '/career-guidance', icon: GraduationCap, code: 'ACA-03', own: true },
  ] },
  { k: 'mess', name: 'Mess', mod: 'em', icon: Utensils, stat: () => 'Weekly menu, students\' choices, routine menus', ops: [
    { label: 'Mess sentiment', route: '/reports/mess-sentiment', icon: Activity, code: 'RPT-12' },
    { label: 'Mess repair tickets', route: '/repair-desk', icon: Wrench, code: 'TKT-03' },
    { label: 'Weekly menu', route: '/weekly-menu', icon: CalendarSync, code: 'MES-08' },
    { label: 'Meal scan', route: '/meal-scan', icon: ScanLine, code: 'MES-04' },
    { label: 'Mess store', route: '/mess-store', icon: ClipboardList, code: 'MES-05' },
    { label: 'Mess daily record', route: '/mess-daily', icon: CalendarCheck, code: 'MES-06' },
    { label: 'Mess complaints', route: '/mess-grievances', icon: ShieldAlert, code: 'MES-03' },
    { label: 'Mess monthly report', route: '/mess-monthly', icon: ChartColumn, code: 'MES-07' },
    { label: 'Checklists', route: '/checklists', icon: ClipboardCheck, code: 'TKT-05' },
    { label: 'Enter choices for students', route: '/meal-entry', icon: ClipboardList, code: 'MES-10' },
    { label: 'Weekly meal choices', route: '/reports/meal-choices', icon: ChartColumn, code: 'RPT-11' },
    { label: 'Routine menu', route: '/mess-menu', icon: Utensils, code: 'MES-01', own: true },
    { label: 'Routine menu', route: '/mess-menu', icon: Utensils, roles: ['admin'], own: true },
  ] },
  { k: 'convention', name: 'Convention centre', mod: 'violet', icon: Presentation, ops: [] },
];
/** Screens every staff member has that sit outside the apps. */
export const GENERAL: Op[] = [
  { label: 'My approvals', route: '/approvals', icon: Inbox, code: 'GEN-03' },
  { label: 'Notifications', route: '/notifications', icon: ScrollText },
  { label: 'My profile', route: '/profile', icon: UserCog },
];
const SOON: Record<string, string[]> = { mess: ['MES-01', 'MES-03'], convention: ['CON-02', 'CON-04'] };

/** The apps and operations a session role may open, in launcher order. Apps with nothing to open are left out. */
export function appsFor(role: string): (App & { soon?: boolean })[] {
  const def = roleDef(role);
  const ok = (o: Op) => (o.roles ? o.roles.includes(role) : !!(o.code && def?.access[o.code]));
  const only = role === 'admin' ? ['setup', 'peopledata', 'access', 'database', 'mess'] : null;
  return APPS.filter((a) => !only || only.includes(a.k)).map((a) => {
    const ops = a.ops.filter(ok).filter((o, i, all) => all.findIndex((x) => x.route === o.route) === i);
    if (ops.length) return { ...a, ops };
    if (SOON[a.k] && SOON[a.k].some((c) => def?.access[c])) return { ...a, ops: [], soon: true };
    return null;
  }).filter(Boolean) as (App & { soon?: boolean })[];
}

/** Which app and operation the current address belongs to (query string counts for /admin/masters?tab=...). */
export function locate(apps: App[], path: string, search: string) {
  const full = `${path}${search}`;
  for (const a of apps) for (const o of a.ops) if (o.route.includes('?') ? full === o.route : path === o.route) return { app: a, op: o };
  for (const a of apps) for (const o of a.ops) if (o.route !== '/home' && (path.startsWith(`${o.route}/`) || (o.route.includes('?') && path === o.route.split('?')[0]))) return { app: a, op: o };
  if (path.startsWith('/admin/data/')) { const a = apps.find((x) => x.ops.some((o) => o.route === path)); if (a) return { app: a, op: a.ops.find((o) => o.route === path)! }; }
  if (path.startsWith('/mapping/data/')) { const a = apps.find((x) => x.ops.some((o) => o.route === '/mapping')); if (a) return { app: a, op: a.ops.find((o) => o.route === '/mapping')! }; }
  return null;
}
