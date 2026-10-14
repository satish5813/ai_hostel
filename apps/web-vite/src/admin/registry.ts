import type { T } from '@/lib/klh';

/** How each master looks in the data workspace: its table columns, and which form fields are fixed once a record exists. */
export type ColFormat = 'text' | 'num' | 'money' | 'pct' | 'date' | 'yesno' | 'status' | 'code' | 'strong';
export type GridCol = { key: string; label: string; format?: ColFormat; width?: number; sub?: string };
export type DataKind = {
  kind: string; title: string; one: string; icon: T.IconName; color: T.TileColor; group: string; about: string;
  columns: GridCol[]; locked: string[]; editable: boolean; hidden?: string[]; options?: Record<string, string[]>;
  /** records are added (and ended) but never edited in place */ addable?: boolean;
};

const YESNO = ['Yes', 'No'];
export const OPTIONS: Record<string, string[]> = {
  gender: ['Male', 'Female', 'Other'], is_ac: YESNO, attached_bath: YESNO, accessible: YESNO, show_on_qr: YESNO,
  reserved_for: ['None', 'Staff', 'Guest', 'Medical'], meter_type: ['Manual', 'Smart_Prepaid'], shift: ['General', 'Morning', 'Evening', 'Night'],
  condition: ['Good', 'Fair', 'Poor', 'Scrap'], student_type: ['UG', 'PG', 'PhD', 'Certificate', 'PG_Diploma', 'Other'],
  admission_type: ['Regular', 'Distance', 'Lateral_Entry'], offering_mode: ['Regular', 'Regular_PBL', 'Part_Time', 'Full_Time', 'Online', 'Distance'],
  blood_group: ['A+ve', 'A-ve', 'B+ve', 'B-ve', 'AB+ve', 'AB-ve', 'O+ve', 'O-ve', 'NA'], caste_category: ['OC', 'BC', 'Other_BC', 'General', 'SC', 'ST', 'EWS', 'NA'],
  staff_type: ['Warden', 'Admin', 'Security', 'Mess', 'Maintenance', 'Housekeeping', 'Faculty', 'Medical', 'Counsellor', 'Other'], salutation: ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.'],
  hostel_role: ['Chief_Warden', 'Warden', 'Assistant_Warden', 'Floor_Warden', 'Office_Staff', 'Room_Allotment', 'Accounts_Section', 'Security_Officer', 'Security_Guard', 'Mess_Incharge', 'Mess_Supervisor', 'Housekeeping_Supervisor', 'Sweeper', 'Scavenger', 'Cleaner', 'Maintenance_Supervisor', 'Electrician', 'Facility_Incharge', 'Counsellor'],
};

export const DATA_KINDS: DataKind[] = [
  { kind: 'hostels', title: 'Hostels', one: 'hostel', icon: 'building', color: 'indigo', group: 'Hostel set-up', about: 'Buildings, who they are for, floors and gate time',
    columns: [{ key: 'hostel_code', label: 'Code', format: 'code', width: 90 }, { key: 'hostel_name', label: 'Hostel', format: 'strong' }, { key: 'gender', label: 'For' }, { key: 'floors', label: 'Floors', format: 'num' }, { key: 'rooms', label: 'Rooms', format: 'num' }, { key: 'beds', label: 'Beds', format: 'num' }, { key: 'occupied', label: 'Occupied', format: 'num' }, { key: 'gate_close_time', label: 'Gate closes' }, { key: 'status', label: 'Status', format: 'status' }],
    locked: ['hostel_code', 'gender'], editable: true },
  { kind: 'room_types', title: 'Room types', one: 'room type', icon: 'key', color: 'indigo', group: 'Hostel set-up', about: 'Sharing, air conditioning and bathroom',
    columns: [{ key: 'type_name', label: 'Room type', format: 'strong' }, { key: 'sharing_count', label: 'Beds per room', format: 'num' }, { key: 'is_ac', label: 'AC', format: 'yesno' }, { key: 'attached_bath', label: 'Attached bath', format: 'yesno' }, { key: 'rooms', label: 'Rooms', format: 'num' }, { key: 'status', label: 'Status', format: 'status' }],
    locked: ['type_name', 'sharing_count'], editable: true },
  { kind: 'rooms', title: 'Rooms and beds', one: 'room', icon: 'bed', color: 'indigo', group: 'Hostel set-up', about: 'Every room and common area, with its beds',
    columns: [{ key: 'space_id', label: 'Room', format: 'code', width: 110 }, { key: 'hostel_code', label: 'Hostel' }, { key: 'floor_no', label: 'Floor', format: 'num' }, { key: 'room_type', label: 'Room type' }, { key: 'category', label: 'Kind' }, { key: 'beds', label: 'Beds', format: 'num' }, { key: 'occupied', label: 'Occupied', format: 'num' }, { key: 'reserved_for', label: 'Reserved for' }, { key: 'accessible', label: 'Accessible', format: 'yesno' }, { key: 'status', label: 'Status', format: 'status' }],
    locked: ['hostel_code', 'floor_no', 'room_no', 'category', 'room_type'], editable: true, options: { category: ['Hostel_Room', 'Toilet_Block', 'Common_Area', 'Store', 'Mess_Hall', 'Office'] } },
  { kind: 'fees', title: 'Fees', one: 'fee', icon: 'wallet', color: 'orange', group: 'Hostel set-up', about: 'Registration and hostel fee per hostel, room type and year',
    columns: [{ key: 'hostel_code', label: 'Hostel', format: 'code' }, { key: 'room_type', label: 'Room type', format: 'strong' }, { key: 'academic_year', label: 'Year' }, { key: 'registration_fee', label: 'Registration', format: 'money' }, { key: 'hostel_fee', label: 'Hostel fee a year', format: 'money' }, { key: 'instalment_1_pct', label: 'First instalment', format: 'pct' }, { key: 'instalment_2_due_date', label: 'Second due', format: 'date' }],
    locked: ['hostel_code', 'room_type', 'academic_year'], editable: true },
  { kind: 'assets', title: 'Room assets', one: 'asset', icon: 'receipt', color: 'orange', group: 'Room inventory', about: 'Tagged items in each room: the check-in and check-out list',
    columns: [{ key: 'asset_id', label: 'Tag', format: 'code', width: 130 }, { key: 'asset_name', label: 'Item', format: 'strong' }, { key: 'hostel_code', label: 'Hostel' }, { key: 'room_no', label: 'Room' }, { key: 'category', label: 'Category' }, { key: 'make_model', label: 'Make' }, { key: 'condition', label: 'Condition', format: 'status' }, { key: 'cost', label: 'Cost', format: 'money' }, { key: 'warranty_expiry', label: 'Warranty until', format: 'date' }, { key: 'status', label: 'Status', format: 'status' }],
    locked: ['asset_id'], editable: true, options: { category: ['Furniture', 'Electrical', 'IT', 'Plumbing', 'Civil', 'Meter', 'Other'] } },
  { kind: 'meters', title: 'Room meters', one: 'meter', icon: 'bolt', color: 'amber', group: 'Room inventory', about: 'One electricity meter per room',
    columns: [{ key: 'meter_no', label: 'Meter', format: 'code', width: 140 }, { key: 'hostel_code', label: 'Hostel' }, { key: 'room_no', label: 'Room', format: 'strong' }, { key: 'meter_type', label: 'Type' }, { key: 'device_ref', label: 'Device' }, { key: 'installed_on', label: 'Installed', format: 'date' }, { key: 'last_reading', label: 'Last reading, kWh', format: 'num' }, { key: 'status', label: 'Status', format: 'status' }],
    locked: ['meter_no', 'hostel_code', 'room_no'], editable: true },
  { kind: 'students', title: 'Students', one: 'student', icon: 'user', color: 'sky', group: 'People', about: 'The student register, with parent contacts',
    columns: [{ key: 'student_id', label: 'University ID', format: 'code', width: 120 }, { key: 'full_name', label: 'Name', format: 'strong' }, { key: 'gender', label: 'Gender' }, { key: 'programme', label: 'Programme' }, { key: 'student_type', label: 'Level' }, { key: 'dept_code', label: 'Dept' }, { key: 'room', label: 'Room' }, { key: 'contacts', label: 'Contacts', format: 'num' }, { key: 'status', label: 'Status', format: 'status' }],
    locked: ['student_id'], editable: true, hidden: ['contact_no', 'address', 'economic_status', 'family_income_band', 'kleee_application_id', 'seat_status'] },
  { kind: 'staff', title: 'Staff and managers', one: 'staff member', icon: 'users', color: 'sky', group: 'People', about: 'Wardens, office, accounts, security, mess and maintenance staff',
    columns: [{ key: 'staff_id', label: 'Employee ID', format: 'code', width: 110 }, { key: 'full_name', label: 'Name', format: 'strong' }, { key: 'designation', label: 'Designation' }, { key: 'dept_code', label: 'Dept' }, { key: 'staff_type', label: 'Type' }, { key: 'mobile_no', label: 'Mobile' }, { key: 'roles', label: 'Roles' }, { key: 'duties', label: 'Duties', format: 'num' }, { key: 'status', label: 'Status', format: 'status' }],
    locked: ['staff_id'], editable: true },
  { kind: 'duties', title: 'Staff duties', one: 'duty', icon: 'shield', color: 'violet', group: 'People', about: 'Wardens, sweepers, scavengers and guards: who covers which hostel, floor or washroom',
    columns: [{ key: 'full_name', label: 'Person', format: 'strong', sub: 'staff_id' }, { key: 'hostel_role', label: 'Duty' }, { key: 'hostel_code', label: 'Hostel', format: 'code' }, { key: 'floor_no', label: 'Floor', format: 'num' }, { key: 'area', label: 'Area' }, { key: 'shift', label: 'Shift' }, { key: 'show_on_qr', label: 'On door labels', format: 'yesno' }, { key: 'from_date', label: 'Since', format: 'date' }, { key: 'status', label: 'Status', format: 'status' }],
    locked: [], editable: false, addable: true },
  { kind: 'bed_map', title: 'Students in beds', one: 'student in a bed', icon: 'bed', color: 'brand', group: 'People', about: 'Who lives in which bed; a file maps hostel students in one go',
    columns: [{ key: 'full_name', label: 'Student', format: 'strong', sub: 'student_id' }, { key: 'gender', label: 'Gender' }, { key: 'programme', label: 'Programme' }, { key: 'hostel_code', label: 'Hostel', format: 'code' }, { key: 'floor_no', label: 'Floor', format: 'num' }, { key: 'room_no', label: 'Room', format: 'code' }, { key: 'bed_no', label: 'Bed', format: 'num' }, { key: 'key_no', label: 'Key' }, { key: 'check_in_date', label: 'Since', format: 'date' }],
    locked: [], editable: false, addable: true },
];
export const dataKind = (k?: string) => DATA_KINDS.find((d) => d.kind === k);
