# KLH design system (KL University Hostels)

Copied from the design-system artifact by apps/web-vite/scripts/sync-klh.mjs. The bundle lives in apps/web-vite/src/vendor.

The interface system for the KL University hostel management web app: one product for students, parents, wardens, office, accounts, security, maintenance and mess staff. Vivid, colourful and pro-grade ERP. Campus teal is the brand, sunset coral marks the one thing to do next, and eight bright module colours make every part of the hostel instantly recognisable. White cards on a cool-grey ground keep the colour readable; gradients live only on KPI cards, solid module tiles, the hero and primary buttons.

## Principles

- **Colour first, then calm.** Dashboards open with a teal-gradient `HeroHeader` and a row of vivid gradient `StatCard`s; below that, white cards with colourful icon tiles and multi-colour charts.
- **One thing to do next.** Each screen has one coral `accent` (students, parents) or teal `primary` (staff) call-to-action.
- **Colour names the module.** Every module keeps one colour everywhere: sidebar tile, `ModuleLauncher`, `QuickAction`, card header and KPI card.

| Module | Colour | Tile class |
| --- | --- | --- |
| General, dashboards, staff mapping, vacating | Teal (brand) | `brand` |
| A Registration, rooms, allotment, inventory | Indigo | `indigo` |
| Fees, receipts, tickets | Orange | `orange` |
| C Electricity | Amber | `amber` |
| E Outing, approvals, convention centre | Violet | `violet` |
| F Sick leave, discipline | Rose | `rose` |
| D Tracking, gate | Sky | `sky` |
| G Mess, facilities | Cyan (solid tiles in emerald) | `cyan` |
- **Status is always visible.** Every record that has an Enum status shows it as a `StatusChip` with a fixed tone. A person should know where a request stands without opening it.
- **Explain every "no".** When an action is blocked, show the reason next to it: "Room offer is available only after the registration fee is paid." Never a silent disabled button.
- **The trail is the truth.** Every approval shows the full `ApprovalTrail`: level, role, person, decision, time, remarks.
- **Role decides the menu.** A user never sees a menu item they cannot use. Hide, don't disable, at the navigation level.

## Content fundamentals

- Sentence case everywhere: "Apply for outpass", "Record cash receipt". Title case only for proper names (Chief Warden, Dean, Students Affairs, hostel names).
- Speak to students and parents as "you"; staff screens use plain imperative labels ("Approve", "Mark out").
- Button labels start with a verb and name the object when ambiguous: "Accept room", "Send reminder", "Escalate to Chief Warden".
- No emoji. No exclamation marks except on the payment success page.
- Indian formats: currency `₹45,000.00` with en-IN grouping (`₹4,82,500`), dates `05 Oct 2026`, times `6:00 pm`, date-times `05 Oct 2026, 6:00 pm`, academic year `2026-27`, mobile numbers as `98480 12345`.
- Identifiers (Registration No, Receipt No, Outpass No, Meter No) are set in the `code` style: `HR-2026-00412`, `RC-2026-08831`, `OP-2026-1187`.
- Room labels are `Block-Room`, beds add a letter: `A-204`, `A-204-B`.
- Status values are the data model's exact Enum values. The chip renders underscores as spaces (`Part_Paid` shows "Part Paid"); never rename, translate or merge a value.

## Colour

- Page ground is `surface-0`; cards, tables and drawers are `surface-1`; table headers, hover rows and read-only fields are `surface-2`.
- Body text is `ink`; secondary text is `ink-muted`; placeholders `ink-subtle` (on `surface-1` only).
- `primary` (campus teal) is the brand: primary buttons (teal to deep-cyan gradient, `primary` to `primary-2`), links, selected states, active tabs, the active sidebar pill, chart series 1. Text on it is `on-primary`.
- `accent` (sunset coral) is the highlight: the single hero call-to-action (yellow-to-coral gradient), the current stepper step, today in the calendar, the highlighted bar. Text on it is `on-accent` (dark). `accent-subtle` / `accent-ink` for coral tiles and the Auto tag.
- Vivid module colours, each a gradient pair for KPI cards and solid tiles (white text, 4.5:1 on both stops, same in both themes): `brand-vivid`/`brand-vivid-2`, `violet`/`violet-2`, `orange`/`orange-2`, `rose`/`rose-2`, `sky`/`sky-2`, `indigo`/`indigo-2`, `emerald`/`emerald-2`.
- Tinted tiles pair a `-bg` ground with its `-fg` icon colour: `violet`, `orange`, `rose`, `sky`, `indigo`, `amber`, `cyan`, plus `primary-subtle` / `primary-ink` for brand.
- `hero` to `hero-2` is the teal gradient of the `HeroHeader`, pass card header and idle kiosk, decorated with coral, violet, sky and `hero-accent` yellow shapes. Text `hero-ink`, `hero-muted`; hero numbers `hero-accent`.
- Charts: series in order `primary` teal, `violet`, `accent` coral, `sky`, `rose`, then `chart-5` grey; bars run a sky-to-teal gradient, the highlighted bar yellow-to-coral, bars over a limit `critical-solid`; area charts fade each series to transparent. Gridlines and ring tracks `chart-grid`.
- Four semantic families, each a `-solid` (icons, marks), `-bg` (ground) and `-fg` (text on that ground): **success** green, **warning** amber, **critical** red, **info** blue. Plus `neutral-bg` / `neutral-fg` for closed or inactive states and `primary-subtle` / `primary-ink` for "in progress".
- Semantic colour never carries meaning alone: chips always show their word, alerts show an icon and a severity word.
- The gate kiosk uses `gate-valid` and `gate-invalid` as full-screen grounds with `gate-ink` text. These two do not change between themes.
- Dark theme is supported on every screen; light is the default.

### Status chip palette

Every Enum status maps to one tone. The same word always gets the same tone, whichever table it appears in.

| Tone | Tokens | Values |
| --- | --- | --- |
| success | `success-bg` / `success-fg` | Active, Confirmed, Checked_In, Accepted, Paid, Credited, Approved, Vacant, In_Room, In_Hostel, Returned, Delivered, Good, Verified, Success |
| progress | `primary-subtle` / `primary-ink` | Fee_Paid, Allotted, Parent_Recommended, L1_Approved, L2_Approved, Recommended, Occupied, Day_Or_More |
| info | `info-bg` / `info-fg` | Applied, Out, On_Campus, Outside_On_Pass, Transferred, Acknowledged, Auto, Handover, Info, Same_Day, Scan, Camera |
| warning | `warning-bg` / `warning-fg` | Pending, Waitlisted, Held, Part_Paid, On_Sick_Leave, Not_Seen, Open, Fair, Warning |
| critical | `critical-bg` / `critical-fg` | Overdue, Rejected, Failed, Faulty, Suspended, Outside_No_Pass, Missed, Damaged, Missing, Expired, Critical |
| neutral | `neutral-bg` / `neutral-fg` | Cancelled, Vacated, Declined, Waived, Closed, Ended, Replaced, Alumni, Refunded, Not_Required, Manual, Under Maintenance, In |

A value not in this table renders neutral. Adding a new Enum value means adding it here first.

## Typography

- One family: Plus Jakarta Sans (Google Fonts, weights 400 to 800), falling back to the system UI stack. Headings run heavy (700 to 800) with slight negative tracking; body stays 400. Identifiers use the `mono` family. Sidebar group headings and hero eyebrows use `overline`.
- Staff screens set body in `body` (14px). Student, parent and delivery screens set body in `body-lg` (16px): wrap them in `.klh-comfortable`.
- One `page-title` per page. Cards use `section-title`. Form labels and table headers use `label`.
- All numbers in tables, money and stat cards use tabular numerals (`font-variant-numeric: tabular-nums`) and align right.
- The gate kiosk uses `kiosk-title` for the verdict and `kiosk-body` for details, nothing smaller than 20px.

## Spacing and layout

- 4px base. Card padding `space-6` on desktop, `space-4` on phones. Gap between form fields `space-5`, between page sections `space-8`.
- **Staff:** fixed left sidebar (`sidebar-width`) grouped by workflow (Dashboards, Masters, A Registration, B Mapping, C Electricity, D Tracking, E Outing, F Sick leave, Shared). Top bar (`topbar-height`) carries the hostel selector, academic year selector, global search, notification bell and profile menu. Content area: breadcrumb, `page-title`, primary action on the right, max `content-max`.
- **Student and parent:** mobile-first. `BottomNav` on phones (`bottomnav-height`, at most five items), top navigation on desktop. Home is a stack of cards.
- **Security gate:** full-screen kiosk, one action per screen, `KioskPanel` only.
- Breakpoints: `bp-phone` 360, `bp-tablet` 768, `bp-desktop` 1024, `bp-wide` 1440. Side gutter 16px at 360. No horizontal page scroll; wide tables scroll inside their card.

## Shape, borders and elevation

- Radii: `radius-sm` (6) bed cells and checkboxes, `radius-md` (10) controls and icon tiles, `radius-lg` (16) cards, dialogs and toasts, `radius-xl` (24) hero headers, kiosk panels and the pass card, `radius-pill` chips, switches, segmented controls and hero buttons.
- Soft layered depth. Cards are `surface-1` with a 1px `border` and `shadow-card`; interactive cards, quick actions and module tiles lift on hover to `shadow-raised`. Vivid KPI cards and solid tiles use `shadow-vivid`; primary and accent buttons glow with `shadow-primary` / `shadow-accent`. Floating layers (drawer, dialog, menu, date picker, toast) use `shadow-overlay` over a blurred `overlay`.
- Gradients only where the components draw them: hero, vivid KPI cards, solid icon tiles, primary and accent buttons, the active sidebar pill, chart bars and areas, meter fills, the brand mark and the thin rainbow edge under the top bar. Never on text or page backgrounds.
- Control borders use `border-control` so inputs meet 3:1.

## States and interaction

- Focus: a solid 2px `focus` ring with 2px offset on every interactive element, both themes. Never remove outlines without this replacement.
- Hover on rows and ghost buttons: `surface-2`. Pressed primary: `primary-hover`.
- Loading: `Skeleton` in the shape of the content, never a full-page spinner. Buttons show a spinner in place and keep their width.
- Empty: `EmptyState` with one sentence and one clear action.
- Error: inline under the field (`critical-fg`, with the field border in `critical-solid`), or a critical `Notice` at the top of the form for server errors.
- Success: a `Toast` for quick confirmations; a full result page for payments.
- Destructive or final actions (reject, cancel registration, close alert, mark missed) go through `ConfirmDialog`.
- Append-only records (movement events, location lookups) show no edit or delete controls at all.
- "Auto" and "Derived" fields render as read-only text with an Auto tag (`Field` with `derived`), never as inputs. "Required if" fields appear only when the condition is met.
- Motion: 120 to 200ms ease-out. Cards lift, drawers slide in, dialogs and menus pop, toasts rise, switches spring. Respect `prefers-reduced-motion`.

## Iconography

- Lucide icons, outline, 1.5px stroke, 16px in tables and buttons, 20px in navigation, 24px on student cards. Icons sit beside a label; icon-only buttons need an `aria-label` and a tooltip.
- The bundle's `Icon` component carries about 50 outline icons for the hostel domain (bed, wallet, bolt, door, heart, utensils, pin, shield, qr, key, receipt and more). Use Lucide for anything missing. Put module icons in an `IconTile`.
- No emoji, no illustrations in working screens. Empty states use a single 24px icon.

## Logo

No university logo has been supplied. Set "KL University Hostels" in Plus Jakarta Sans 800 beside the multi-colour KL monogram tile in the sidebar header and on the login screen until the official mark is provided; do not redraw or approximate the university's emblem.

## Building screens

- **Staff page:** `AppShell` (light sidebar, one colour tile per module, teal pill for the current page) > `HeroHeader` (dashboards only) > row of vivid `StatCard`s, one colour each > `ModuleLauncher` on the staff home > `Card`s with `DataTable`, `AreaChart`, `BarChart`, `DonutChart`, `Timeline`. Row click opens a `Drawer` with `ApprovalTrail` and decision buttons.
- **Student and parent home (phone):** `HeroHeader` with greeting, status chips, one coral action and stat tiles > `Stepper` stage tracker > 2-by-2 `QuickAction` grid (solid gradient tiles, one module colour each) > `Card`s (room, dues with `Money` and `Countdown`, electricity with `UsageMeter` or `ProgressRing`) > `BottomNav`.
- **Forms:** `Field` with `Input`, `Select`, `DatePicker`, `FileUpload`; choices with `RadioGroup` (cards for big decisions), `Checkbox`, `Switch`, `SegmentedControl`, `Slider`.
- **Gate:** `KioskPanel` only. **Outpass on phone:** `PassCard` full screen.

## Accessibility

- WCAG AA: every text token pair above meets 4.5:1 in both themes; control borders, focus ring and status icons meet 3:1.
- Full keyboard navigation; drawers and dialogs trap focus and return it on close; `Esc` closes.
- Every input has a visible label. Errors are linked with `aria-describedby`.
- Countdowns and live feeds announce politely (`aria-live="polite"`); the gate verdict announces assertively.
