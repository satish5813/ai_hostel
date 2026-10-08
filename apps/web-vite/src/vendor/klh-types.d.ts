import type { ReactNode } from 'react';

/** Tone used by chips, notices, toasts and stat cards. */
export type Tone = 'success' | 'progress' | 'info' | 'warning' | 'critical' | 'neutral';
type DateLike = string | number | Date;

export interface ButtonProps { variant?: 'primary' | 'accent' | 'violet' | 'secondary' | 'soft' | 'ghost' | 'danger'; pill?: boolean; iconOnly?: boolean; iconRight?: IconName; size?: 'sm' | 'md' | 'lg'; icon?: IconName; loading?: boolean; disabled?: boolean; /** Disables the button and shows why under it. */ blockedReason?: string; block?: boolean; type?: 'button' | 'submit'; onClick?: () => void; children?: ReactNode; }
/** Pass the exact data-model Enum value. */
export interface StatusChipProps { status: string; tone?: Tone; label?: string; }
export type IconName = 'calendar' | 'upload' | 'file' | 'more' | 'settings' | 'logout' | 'login' | 'shield' | 'pin' | 'utensils' | 'heart' | 'qr' | 'trend-up' | 'trend-down' | 'arrow-right' | 'eye' | 'edit' | 'trash' | 'users' | 'building' | 'bed' | 'key' | 'receipt' | 'phone' | 'mail' | 'gauge' | 'sparkle' | 'search' | 'bell' | 'download' | 'check' | 'x' | 'alert' | 'info' | 'lock' | 'chevron-right' | 'chevron-down' | 'chevron-left' | 'sort' | 'home' | 'filter' | 'clock' | 'user' | 'wallet' | 'bolt' | 'door' | 'plus' | 'inbox';
export interface IconProps { name: IconName; size?: number; label?: string; }
export type TileColor = 'brand' | 'indigo' | 'orange' | 'amber' | 'violet' | 'rose' | 'sky' | 'cyan' | 'green' | 'red' | 'accent';
export interface IconTileProps { icon: IconName; color?: TileColor; size?: 'md' | 'lg'; solid?: boolean; }
export interface CardProps { icon?: IconName; color?: TileColor; subtitle?: ReactNode; interactive?: boolean; onClick?: () => void; title?: ReactNode; action?: ReactNode; padding?: number; children?: ReactNode; }
export interface StatCardProps { variant?: 'plain' | 'vivid';  icon?: IconName; color?: TileColor; trend?: { dir: 'up' | 'down'; value: string; good?: boolean }; spark?: number[]; sparkColor?: 'violet' | 'coral' | 'sky' | 'red' | 'green'; label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: 'critical' | 'warning' | 'success'; onClick?: () => void; }
export interface FieldProps { label: ReactNode; required?: boolean; hint?: ReactNode; error?: ReactNode; /** Render value read-only with an Auto tag. */ derived?: boolean; derivedLabel?: string; value?: ReactNode; /** false hides a "Required if" field. */ visible?: boolean; id?: string; children?: ReactNode; }
export interface OtpInputProps { length?: number; value?: string; onChange?: (v: string) => void; error?: ReactNode; resendIn?: number; onResend?: () => void; }
export interface NoticeProps { tone?: Tone; title?: ReactNode; icon?: IconName; action?: ReactNode; children?: ReactNode; }
export interface Column<R> { key: keyof R & string; label: ReactNode; align?: 'left' | 'right'; sortable?: boolean; render?: (value: any, row: R) => ReactNode; }
export interface DataTableProps<R = any> { columns: Column<R>[]; rows: R[]; rowKey?: keyof R & string; pageSize?: number; searchable?: boolean; searchPlaceholder?: string; filters?: ReactNode; actions?: ReactNode; onExport?: () => void; onRowClick?: (row: R) => void; selectedKey?: any; loading?: boolean; empty?: ReactNode; caption?: string; defaultSort?: { key: string; dir: 'asc' | 'desc' }; }
export interface SkeletonProps { lines?: number; height?: number; variant?: 'lines' | 'table'; rows?: number; cols?: number; }
export interface EmptyStateProps { title: ReactNode; body?: ReactNode; icon?: IconName; action?: ReactNode; }
export interface DrawerProps { open: boolean; onClose: () => void; title: string; subtitle?: ReactNode; footer?: ReactNode; children?: ReactNode; }
export interface ConfirmDialogProps { open: boolean; title: string; body?: ReactNode; tone?: 'danger' | 'primary'; confirmLabel?: string; cancelLabel?: string; requireRemarks?: boolean; remarksLabel?: string; onConfirm: (remarks: string) => void; onCancel: () => void; }
export interface ToastProps { tone?: 'success' | 'info' | 'warning' | 'critical'; title: ReactNode; action?: ReactNode; duration?: number; onClose?: () => void; children?: ReactNode; }
export interface Step { label: ReactNode; state?: 'done' | 'current' | 'upcoming' | 'rejected' | 'skipped'; meta?: ReactNode; }
export interface StepperProps { steps: Step[]; orientation?: 'horizontal' | 'vertical'; }
export interface ApprovalEntry { level?: number | string; role: string; person?: string; decision: string; at?: DateLike; remarks?: string; }
export interface ApprovalTrailProps { entries: ApprovalEntry[]; }
export interface MoneyProps { amount: number; dueDate?: DateLike; status?: string; paise?: boolean; }
export interface CountdownProps { until: DateLike; label?: string; expiredLabel?: string; }
export interface UsageMeterProps { used: number; included: number; unit?: string; label?: string; footnote?: ReactNode; }
export interface Bed { id: string; status?: 'Vacant' | 'Held' | 'Occupied' | 'Under Maintenance'; occupant?: string; }
export interface Room { no: string; type?: string; reserved?: 'None' | 'Staff' | 'Guest' | 'Medical'; maintenance?: boolean; blockedReason?: string; beds: Bed[]; }
export interface BedMapProps { rooms: Room[]; selectable?: boolean; selected?: string; onSelect?: (bedId: string, room: Room) => void; legend?: boolean; }
export interface NavItem { label: string; icon?: IconName; active?: boolean; badge?: number; onClick?: () => void; }
export interface AppShellProps { nav: { heading?: string; items: NavItem[] }[]; user: { name: string; role: string }; hostels?: string[]; hostel?: string; years?: string[]; year?: string; notifications?: number; breadcrumb?: ReactNode[]; title?: ReactNode; primaryAction?: ReactNode; productName?: string; searchPlaceholder?: string; children?: ReactNode; }
export interface BottomNavProps { items: NavItem[]; }
export interface KioskPanelProps { result: 'idle' | 'valid' | 'invalid'; title?: string; reason?: string; student?: { name: string; id?: string; photo?: string }; pass?: { no: string; from?: DateLike; to?: DateLike }; lateBy?: number; actionLabel?: string; onAction?: () => void; secondary?: ReactNode; height?: number; }

export declare const STATUS_TONES: Record<string, Tone>;
export declare function toneOf(status: string): Tone;
export declare function formatINR(n: number, opts?: { paise?: boolean }): string;
export declare function formatDate(d: DateLike): string;
export declare function formatDateTime(d: DateLike): string;

export interface HeroHeaderProps { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; chips?: ReactNode; actions?: ReactNode; stats?: { value: ReactNode; label: ReactNode; gold?: boolean }[]; }
export interface QuickActionProps { icon: IconName; color?: TileColor; title: ReactNode; sub?: ReactNode; badge?: number; vertical?: boolean; onClick?: () => void; }
export interface CheckboxProps { label: ReactNode; description?: ReactNode; checked?: boolean; defaultChecked?: boolean; disabled?: boolean; onChange?: (checked: boolean) => void; }
export interface RadioOption { value: string; label: ReactNode; description?: ReactNode; extra?: ReactNode; disabled?: boolean; }
export interface RadioGroupProps { label?: string; name?: string; options: RadioOption[]; value?: string; defaultValue?: string; onChange?: (v: string) => void; variant?: 'list' | 'cards'; }
export interface SwitchProps { label?: ReactNode; description?: ReactNode; checked?: boolean; defaultChecked?: boolean; disabled?: boolean; onChange?: (on: boolean) => void; }
export interface SegmentedControlProps { label?: string; options: { value: string; label: ReactNode; icon?: IconName }[]; value?: string; defaultValue?: string; onChange?: (v: string) => void; }
export interface TabsProps { label?: string; tabs: { id: string; label: ReactNode; icon?: IconName; count?: number }[]; value?: string; defaultValue?: string; onChange?: (id: string) => void; }
export interface SliderProps { label: string; min?: number; max?: number; step?: number; value?: number; defaultValue?: number; onChange?: (v: number) => void; format?: (v: number) => ReactNode; caption?: ReactNode | ((v: number) => ReactNode); presets?: number[]; }
export interface DatePickerProps { value?: Date | null; defaultValue?: Date; onChange?: (d: Date) => void; min?: DateLike; today?: DateLike; placeholder?: string; inline?: boolean; defaultOpen?: boolean; }
export interface UploadFile { name: string; size: number; progress: number; error?: string; }
export interface FileUploadProps { label?: string; hint?: ReactNode; accept?: string; multiple?: boolean; files?: UploadFile[]; onChange?: (files: UploadFile[]) => void; }
export interface FilterChipProps { label: ReactNode; count?: number; selected?: boolean; icon?: IconName; onClick?: () => void; }
export interface RatingProps { label?: string; max?: number; value?: number; defaultValue?: number; onChange?: (v: number) => void; labels?: string[]; readOnly?: boolean; }
export interface AvatarProps { name: string; src?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; color?: TileColor; status?: 'online' | 'away' | 'busy' | 'offline'; }
export interface AvatarGroupProps { names: string[]; max?: number; size?: 'sm' | 'md'; }
export interface PersonProps { name: string; sub?: ReactNode; src?: string; }
export interface TooltipProps { content: ReactNode; open?: boolean; children: ReactNode; }
export interface MenuItem { label: ReactNode; icon?: IconName; danger?: boolean; kbd?: string; onClick?: () => void; }
export interface MenuProps { items: (MenuItem | 'sep')[]; trigger?: ReactNode; header?: ReactNode; label?: string; defaultOpen?: boolean; static?: boolean; }
export interface AccordionProps { items: { title: ReactNode; content: ReactNode; icon?: IconName; color?: TileColor }[]; defaultOpen?: number; }
export interface TimelineProps { items: { time: ReactNode; title: ReactNode; sub?: ReactNode; icon?: IconName; tone?: 'success' | 'info' | 'warning' | 'critical' | 'progress' | 'accent' }[]; }
export interface NotificationItemProps { title: ReactNode; body?: ReactNode; time?: ReactNode; icon?: IconName; color?: TileColor; avatar?: string; unread?: boolean; action?: ReactNode; onClick?: () => void; }
export interface ProgressRingProps { value: number; max?: number; size?: number; stroke?: number; color?: 'violet' | 'coral' | 'sky' | 'rose' | 'green' | 'red'; label?: ReactNode; sublabel?: ReactNode; ariaLabel?: string; }
export interface SparklineProps { data: number[]; width?: number; height?: number; color?: 'violet' | 'coral' | 'sky' | 'red' | 'green'; }
export interface BarChartProps { data: { label: string; value: number; highlight?: boolean }[]; limit?: number; limitLabel?: string; unit?: string; width?: number; height?: number; showValues?: boolean; label?: string; }
export interface DonutChartProps { data: { label: string; value: number; color?: 'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'c6' }[]; size?: number; thickness?: number; centerValue?: ReactNode; centerLabel?: ReactNode; legend?: boolean; label?: string; }
export interface PassCardProps { student: { name: string; id?: string; room?: string; photo?: string }; pass: { no: string; from?: DateLike; to?: DateLike; destination?: string }; tag?: string; }
export interface ModuleLauncherProps { modules: { code?: string; icon: IconName; color?: TileColor; title: ReactNode; sub?: ReactNode; badge?: number; onClick?: () => void }[]; }
export interface AreaChartProps { labels: string[]; series: { name: string; data: number[]; color?: 'c1' | 'c2' | 'c3' | 'c4' | 'c5' }[]; yFormat?: (v: number) => string; width?: number; height?: number; legend?: boolean; label?: string; }
