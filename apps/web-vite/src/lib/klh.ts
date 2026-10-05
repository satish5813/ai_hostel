/**
 * Typed access to the KLH design system (docs/design-system-klh.md).
 * Components come from the published bundle; this file only attaches the prop types from index.d.ts.
 */
import type { ReactElement, ReactNode, Ref, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import type * as T from '@/vendor/klh-types';
import { KLH as raw } from '@/vendor/klh-bundle';

type FC<P> = (props: P & { key?: string | number }) => ReactElement | null;
const c = <P,>(name: string) => (raw as Record<string, unknown>)[name] as FC<P>;

export type { T };
export const Button = c<T.ButtonProps>('Button');
export const StatusChip = c<T.StatusChipProps>('StatusChip');
export const Icon = c<T.IconProps>('Icon');
export const IconTile = c<T.IconTileProps>('IconTile');
export const Card = c<T.CardProps>('Card');
/** The compact tile from the app kit replaces the bundle's gradient StatCard everywhere. */
export { Stat as StatCard, Welcome as HeroHeader } from '@/ui/kit';
export const QuickAction = c<T.QuickActionProps>('QuickAction');
export const ModuleLauncher = c<T.ModuleLauncherProps>('ModuleLauncher');
export const Field = c<T.FieldProps>('Field');
export const Input = c<InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }>('Input');
export const Select = c<SelectHTMLAttributes<HTMLSelectElement> & { options: (string | { value: string; label: ReactNode })[] }>('Select');
export const Textarea = c<TextareaHTMLAttributes<HTMLTextAreaElement>>('Textarea');
export const Checkbox = c<T.CheckboxProps>('Checkbox');
export const RadioGroup = c<T.RadioGroupProps>('RadioGroup');
export const Switch = c<T.SwitchProps>('Switch');
export const SegmentedControl = c<T.SegmentedControlProps>('SegmentedControl');
export const Tabs = c<T.TabsProps>('Tabs');
export const Slider = c<T.SliderProps>('Slider');
export const DatePicker = c<T.DatePickerProps>('DatePicker');
export const FileUpload = c<T.FileUploadProps>('FileUpload');
export const OtpInput = c<T.OtpInputProps>('OtpInput');
export const FilterChip = c<T.FilterChipProps>('FilterChip');
export const Rating = c<T.RatingProps>('Rating');
export const Avatar = c<T.AvatarProps>('Avatar');
export const AvatarGroup = c<T.AvatarGroupProps>('AvatarGroup');
export const Person = c<T.PersonProps>('Person');
export const Tooltip = c<T.TooltipProps>('Tooltip');
export const Menu = c<T.MenuProps>('Menu');
export const Accordion = c<T.AccordionProps>('Accordion');
export const Notice = c<T.NoticeProps>('Notice');
export const DataTable = c<T.DataTableProps>('DataTable');
export const Skeleton = c<T.SkeletonProps>('Skeleton');
export const EmptyState = c<T.EmptyStateProps>('EmptyState');
export const Drawer = c<T.DrawerProps>('Drawer');
export const ConfirmDialog = c<T.ConfirmDialogProps>('ConfirmDialog');
export const Toast = c<T.ToastProps>('Toast');
export const Stepper = c<T.StepperProps>('Stepper');
export const ApprovalTrail = c<T.ApprovalTrailProps>('ApprovalTrail');
export const Timeline = c<T.TimelineProps>('Timeline');
export const NotificationItem = c<T.NotificationItemProps>('NotificationItem');
export const Money = c<T.MoneyProps>('Money');
export const Countdown = c<T.CountdownProps>('Countdown');
export const UsageMeter = c<T.UsageMeterProps>('UsageMeter');
export const ProgressRing = c<T.ProgressRingProps>('ProgressRing');
export const Sparkline = c<T.SparklineProps>('Sparkline');
export const BarChart = c<T.BarChartProps>('BarChart');
export const AreaChart = c<T.AreaChartProps>('AreaChart');
export const DonutChart = c<T.DonutChartProps>('DonutChart');
export const PassCard = c<T.PassCardProps>('PassCard');
export const BedMap = c<T.BedMapProps>('BedMap');
export const AppShell = c<T.AppShellProps>('AppShell');
export const BottomNav = c<T.BottomNavProps>('BottomNav');
export const KioskPanel = c<T.KioskPanelProps>('KioskPanel');

const fns = raw as unknown as { toneOf: (s: string) => T.Tone; formatINR: (n: number, o?: { paise?: boolean }) => string; formatDate: (d: string | number | Date) => string; formatDateTime: (d: string | number | Date) => string; statusLabel: (s: string) => string };
export const toneOf = fns.toneOf;
export const formatINR = (n: number | string, paise = false) => fns.formatINR(Number(n ?? 0), { paise });
/** Dates never break inside a narrow table cell: "02 Oct 2026" stays on one line (a date-time may break after its comma). */
const keep = (s: string) => s.split(', ').map((p) => p.replace(/ /g, ' ')).join(', ');
export const formatDate = (d?: string | number | Date | null) => (d ? keep(fns.formatDate(d)) : '—');
export const formatDateTime = (d?: string | number | Date | null) => (d ? keep(fns.formatDateTime(d)) : '—');
export const statusLabel = fns.statusLabel;
