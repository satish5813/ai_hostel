# KL University Hostel ERP — Data Dictionary

Generated from the live PostgreSQL 18 catalog after applying `db/migrations/*.sql` (so it matches the DDL exactly).
Regenerate with `db/apply.ps1 -Dictionary` after any schema change.

| Schema | Purpose | Tables |
|---|---|---|
| ref | ERP mirrors: departments, courses, sections, students, staff (read-only, refreshed by import) | 16 |
| infra | Infrastructure, allocation and maintenance model: campus → facility → zone → space → sub-space, assets, tickets, work orders | 23 |
| portal | Stock & Purchase Portal + Inventory / Procurement / Accounts: materials, stores, stock ledger, indents, PR, RFQ, PO, GRN, invoices, journals | 98 |
| shared | Approvals (SH1/SH2), notifications (SH4), report visibility (SH3), policy settings, documents, hash-chained audit log, import batches | 9 |
| hostel | Hostel masters MS2–MS8, Workflows A–F in full, stubs for G/I/M/N tables that A–F depend on | 40 |
| **Total** | 186 tables · 2,008 columns · 11 views · 186 enum types · 532 foreign keys · 145 triggers | |

Column descriptions and the enum value lists are in the migration files themselves (`-- comment` beside each column); this page lists the structure.

### ref.batch
Lab batches that split a section

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| batch_id | varchar(30) | no | PK |  |
| section_id | varchar(30) | no | FK ? ref.section |  |
| batch_name | varchar(30) | no |  |  |
| size | integer | yes |  |  |

### ref.course
Programme / degree master (ERP column Degree)

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| course_id | varchar(30) | no | PK |  |
| dept_code | varchar(20) | no | FK ? ref.department |  |
| course_name | varchar(120) | no |  |  |
| duration_years | numeric(3,1) | yes |  |  |
| status | active_status | no |  | 'Active'::shared.active_status |

### ref.department
Departments of the university; code ALL stands for the whole university (portal convention)

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| dept_code | varchar(20) | no | PK |  |
| dept_name | varchar(120) | no |  |  |
| hod_staff_id | varchar(20) | yes | FK ? ref.staff_master |  |
| status | active_status | no |  | 'Active'::shared.active_status |
| synced_at | timestamptz | no |  | now() |

### ref.section


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| section_id | varchar(30) | no | PK |  |
| course_id | varchar(30) | no | FK ? ref.course |  |
| year | smallint | no |  |  |
| section_name | varchar(30) | no |  |  |
| strength | integer | yes |  |  |
| class_advisor_id | varchar(20) | yes | FK ? ref.staff_master |  |

### ref.sport


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| sport_id | varchar(30) | no | PK |  |
| sport_name | varchar(80) | no |  |  |
| indoor_outdoor | indoor_outdoor | no |  |  |
| default_space_id | varchar(30) | yes | FK ? infra.space |  |

### ref.staff_address


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| staff_id | varchar(20) | no | PK FK ? ref.staff_master |  |
| address_type | address_type | no | PK |  |
| door_no | varchar(60) | yes |  |  |
| street | varchar(120) | yes |  |  |
| landmark | varchar(120) | yes |  |  |
| city | varchar(80) | yes |  |  |
| district | varchar(80) | yes |  |  |
| state | varchar(80) | yes |  |  |
| country | varchar(60) | yes |  | 'India'::character varying |
| pincode | varchar(10) | yes |  |  |

### ref.staff_contact


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| contact_id | bigint | no | PK |  |
| staff_id | varchar(20) | no | FK ? ref.staff_master |  |
| contact_type | varchar(30) | no |  |  |
| contact_person | varchar(120) | yes |  |  |
| phone_number | varchar(15) | no |  |  |
| status | active_status | no |  | 'Active'::shared.active_status |

### ref.staff_dependent


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| dependent_id | bigint | no | PK |  |
| staff_id | varchar(20) | no | FK ? ref.staff_master |  |
| relation | relation | no |  |  |
| full_name | varchar(160) | no |  |  |
| date_of_birth | date | yes |  |  |
| gender | gender | yes |  |  |
| is_nominee | boolean | no |  | false |
| status | active_status | no |  | 'Active'::shared.active_status |

### ref.staff_employment_history


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| employment_id | bigint | no | PK |  |
| staff_id | varchar(20) | no | FK ? ref.staff_master |  |
| employer_name | varchar(160) | no |  |  |
| job_type | varchar(40) | yes |  |  |
| designation | varchar(80) | yes |  |  |
| joining_date | date | yes |  |  |
| leaving_date | date | yes |  |  |
| salary | numeric(12,2) | yes |  |  |
| employer_address | text | yes |  |  |
| city | varchar(80) | yes |  |  |
| state | varchar(80) | yes |  |  |
| country | varchar(60) | yes |  |  |

### ref.staff_master
MS3 Staff_Master — one row per employee, ERP employee profile, read-only here. Aadhaar, PAN and bank rows stay in the ERP.

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| staff_id | varchar(20) | no | PK |  |
| salutation | varchar(10) | yes |  |  |
| first_name | varchar(80) | no |  |  |
| middle_name | varchar(80) | yes |  |  |
| last_name | varchar(80) | yes |  |  |
| full_name | varchar(200) | yes |  |  |
| gender | gender | no |  |  |
| date_of_birth | date | yes |  |  |
| blood_group | blood_group | yes |  |  |
| caste_category | caste_category | yes |  |  |
| disability | varchar(60) | yes |  |  |
| marital_status | marital_status | yes |  |  |
| nationality | varchar(40) | yes |  |  |
| religion | varchar(40) | yes |  |  |
| mother_tongue | varchar(40) | yes |  |  |
| birth_place | varchar(80) | yes |  |  |
| father_name | varchar(120) | yes |  |  |
| mother_name | varchar(120) | yes |  |  |
| height_cm | numeric(5,1) | yes |  |  |
| weight_kg | numeric(5,1) | yes |  |  |
| pf_number | varchar(30) | yes |  |  |
| joining_date | date | yes |  |  |
| dept_code | varchar(20) | no | FK ? ref.department |  |
| designation | varchar(80) | no |  |  |
| staff_type | staff_type | no |  | 'Other'::ref.staff_type |
| recruitment_type | recruitment_type | yes |  |  |
| recruit_agency | varchar(80) | yes |  |  |
| campus_code | varchar(20) | yes | FK ? infra.campus |  |
| personal_email | varchar(120) | yes |  |  |
| official_email | varchar(120) | yes |  |  |
| mobile_no | varchar(15) | no |  |  |
| communication_no | varchar(15) | yes |  |  |
| photo_object_key | varchar(200) | yes |  |  |
| resume_link | varchar(300) | yes |  |  |
| status | active_status | no |  | 'Active'::shared.active_status |
| synced_at | timestamptz | no |  | now() |
| import_batch_id | bigint | yes | FK ? shared.import_batch |  |

### ref.staff_membership


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| membership_id | bigint | no | PK |  |
| staff_id | varchar(20) | no | FK ? ref.staff_master |  |
| body_name | varchar(160) | no |  |  |
| membership_no | varchar(60) | yes |  |  |
| subscription | varchar(40) | yes |  |  |
| from_date | date | yes |  |  |
| end_date | date | yes |  |  |

### ref.staff_qualification


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| qualification_id | bigint | no | PK |  |
| staff_id | varchar(20) | no | FK ? ref.staff_master |  |
| degree | varchar(60) | yes |  |  |
| specialization | varchar(120) | yes |  |  |
| university | varchar(160) | yes |  |  |
| college | varchar(160) | yes |  |  |
| cgpa_or_pct | numeric(6,2) | yes |  |  |
| year_of_passing | smallint | yes |  |  |

### ref.staff_responsibility
ERP "Employee Other Responsibilities"; hostel duty assignments live in hostel.staff_space_assignment instead

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| responsibility_id | bigint | no | PK |  |
| staff_id | varchar(20) | no | FK ? ref.staff_master |  |
| designation | varchar(120) | no |  |  |
| start_date | date | yes |  |  |
| end_date | date | yes |  |  |

### ref.student_address
Parsed from the ERP "Address" column: Hno:..|| Street:..|| Landmark:..|| District:..|| State:..|| City:..|| Country:..|| Pincode:..

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| student_id | varchar(20) | no | PK FK ? ref.student_master |  |
| address_type | address_type | no | PK | 'Permanent'::ref.address_type |
| seq_no | smallint | no | PK | 1 |
| hno | varchar(80) | yes |  |  |
| street | varchar(120) | yes |  |  |
| landmark | varchar(160) | yes |  |  |
| district | varchar(80) | yes |  |  |
| state | varchar(80) | yes |  |  |
| city | varchar(80) | yes |  |  |
| country | varchar(60) | yes |  | 'India'::character varying |
| pincode | varchar(10) | yes |  |  |

### ref.student_master
MS1 Student_Master (EXTENDED) — ERP student profile. Identity Number (Aadhaar) is deliberately not copied.

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| student_id | varchar(20) | no | PK |  |
| full_name | varchar(160) | no |  |  |
| admission_type | admission_type | no |  | 'Regular'::ref.admission_type |
| father_name | varchar(120) | yes |  |  |
| mother_name | varchar(120) | yes |  |  |
| regulation | varchar(10) | yes |  |  |
| student_type | student_type | no |  |  |
| course_id | varchar(30) | yes | FK ? ref.course |  |
| programme | varchar(80) | no |  |  |
| offering_mode | offering_mode | yes |  |  |
| section_id | varchar(30) | yes | FK ? ref.section |  |
| year_semester | varchar(20) | yes |  |  |
| gender | gender | no |  |  |
| date_of_birth | date | no |  |  |
| caste_category | caste_category | yes |  |  |
| economic_status | varchar(20) | yes |  |  |
| family_income_band | varchar(20) | yes |  |  |
| nationality | varchar(40) | no |  | 'indian'::character varying |
| religion | varchar(40) | yes |  |  |
| blood_group | blood_group | yes |  |  |
| disability | varchar(60) | yes |  |  |
| personal_email | varchar(120) | no |  |  |
| admission_date | date | yes |  |  |
| kleee_application_id | varchar(40) | yes |  |  |
| seat_status | varchar(20) | yes |  |  |
| dept_code | varchar(20) | yes | FK ? ref.department |  |
| counsellor_id | varchar(20) | yes | FK ? ref.staff_master |  |
| photo_object_key | varchar(200) | yes |  |  |
| is_hosteller | boolean | no |  | false |
| status | student_status | no |  | 'Active'::ref.student_status |
| synced_at | timestamptz | no |  | now() |
| import_batch_id | bigint | yes | FK ? shared.import_batch |  |

### ref.subject


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| subject_id | varchar(30) | no | PK |  |
| course_id | varchar(30) | no | FK ? ref.course |  |
| subject_name | varchar(120) | no |  |  |
| subject_type | subject_type | no |  |  |
| credits | numeric(3,1) | yes |  |  |

### infra.activity_booking


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| booking_id | bigint | no | PK |  |
| space_id | varchar(30) | no | FK ? infra.space |  |
| activity_type | activity_type | no |  |  |
| activity_name | varchar(160) | no |  |  |
| requested_by | varchar(40) | no |  |  |
| requester_type | requester_type | no |  |  |
| booking_date | date | no |  |  |
| start_time | time without time zone | no |  |  |
| end_time | time without time zone | no |  |  |
| expected_participants | integer | yes |  |  |
| approved_by | varchar(20) | yes | FK ? ref.staff_master |  |
| booking_charges | numeric(12,2) | yes |  |  |
| status | booking_status | no |  | 'Requested'::infra.booking_status |

### infra.amc_contract


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| amc_id | varchar(30) | no | PK |  |
| vendor_id | varchar(20) | no | FK ? portal.vendor |  |
| asset_category | asset_category | yes |  |  |
| asset_id | varchar(40) | yes | FK ? infra.asset_master |  |
| start_date | date | no |  |  |
| end_date | date | no |  |  |
| annual_cost | numeric(12,2) | yes |  |  |
| visits_per_year | smallint | yes |  |  |
| status | amc_status | no |  | 'Active'::infra.amc_status |

### infra.asset_master


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| asset_id | varchar(40) | no | PK |  |
| space_id | varchar(30) | yes | FK ? infra.space |  |
| asset_name | varchar(120) | no |  |  |
| asset_category | asset_category | no |  |  |
| make_model | varchar(120) | yes |  |  |
| serial_no | varchar(80) | yes |  |  |
| purchase_date | date | yes |  |  |
| cost | numeric(14,2) | yes |  |  |
| warranty_expiry | date | yes |  |  |
| vendor_id | varchar(20) | yes | FK ? portal.vendor |  |
| condition | asset_condition | no |  | 'Good'::infra.asset_condition |
| last_service_date | date | yes |  |  |
| sku | varchar(30) | yes | FK ? portal.material |  |
| status | active_status | no |  | 'Active'::shared.active_status |

### infra.campus


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| campus_id | varchar(20) | no | PK |  |
| campus_name | varchar(100) | no |  |  |
| address | text | yes |  |  |
| total_area | numeric(12,2) | yes |  |  |
| status | active_status | no |  | 'Active'::shared.active_status |

### infra.class_allocation


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| class_alloc_id | bigint | no | PK |  |
| academic_year | varchar(9) | no |  |  |
| semester | varchar(10) | no |  |  |
| section_id | varchar(30) | no | FK ? ref.section |  |
| subject_id | varchar(30) | no | FK ? ref.subject |  |
| faculty_id | varchar(20) | no | FK ? ref.staff_master |  |
| space_id | varchar(30) | no | FK ? infra.space |  |
| slot_id | varchar(20) | no | FK ? infra.timetable_slot |  |
| effective_from | date | no |  |  |
| effective_to | date | yes |  |  |
| status | alloc_status | no |  | 'Active'::infra.alloc_status |

### infra.facility
2.2 Facility Master; hostel buildings get a one-to-one hostel.hostel_profile row

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| facility_id | varchar(30) | no | PK |  |
| campus_id | varchar(20) | no | FK ? infra.campus |  |
| facility_name | varchar(120) | no |  |  |
| facility_type | facility_type | no |  |  |
| area_sqm | numeric(12,2) | yes |  |  |
| no_of_floors | smallint | no |  | 0 |
| year_built | smallint | yes |  |  |
| incharge_id | varchar(20) | yes | FK ? ref.staff_master |  |
| status | facility_status | no |  | 'Active'::infra.facility_status |

### infra.inspection_log


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| inspection_id | bigint | no | PK |  |
| facility_id | varchar(30) | no | FK ? infra.facility |  |
| space_id | varchar(30) | yes | FK ? infra.space |  |
| inspection_type | inspection_type | no |  |  |
| inspector_id | varchar(40) | no |  |  |
| inspection_date | date | no |  |  |
| findings | text | yes |  |  |
| score | numeric(5,2) | yes |  |  |
| action_required | boolean | no |  | false |
| ticket_id | bigint | yes | FK ? infra.maintenance_ticket |  |
| next_inspection_date | date | yes |  |  |

### infra.lab_allocation


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| lab_alloc_id | bigint | no | PK |  |
| space_id | varchar(30) | no | FK ? infra.space |  |
| subject_id | varchar(30) | no | FK ? ref.subject |  |
| batch_id | varchar(30) | no | FK ? ref.batch |  |
| faculty_id | varchar(20) | no | FK ? ref.staff_master |  |
| lab_assistant_id | varchar(20) | yes | FK ? ref.staff_master |  |
| slot_id | varchar(20) | no | FK ? infra.timetable_slot |  |
| academic_year | varchar(9) | no |  |  |
| max_students | integer | yes |  |  |
| status | alloc_status | no |  | 'Active'::infra.alloc_status |

### infra.lab_workstation_map


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| ws_map_id | bigint | no | PK |  |
| lab_alloc_id | bigint | no | FK ? infra.lab_allocation |  |
| subspace_id | varchar(30) | no | FK ? infra.subspace |  |
| student_id | varchar(20) | no | FK ? ref.student_master |  |
| assigned_date | date | no |  | CURRENT_DATE |

### infra.maintenance_category


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| category_id | varchar(20) | no | PK |  |
| category_name | varchar(80) | no |  |  |
| default_sla_hours | integer | yes |  |  |
| default_team_id | varchar(20) | yes | FK ? infra.maintenance_team |  |

### infra.maintenance_team


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| team_id | varchar(20) | no | PK |  |
| team_name | varchar(80) | no |  |  |
| category_id | varchar(20) | yes | FK ? infra.maintenance_category |  |
| supervisor_id | varchar(20) | yes | FK ? ref.staff_master |  |
| contact | varchar(60) | yes |  |  |

### infra.maintenance_ticket
5.2 Maintenance Request / Complaint Ticket (EXTENDED by hostel H1; H2 Ticket_Event, H3–H7 await the missing spec pages)

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| ticket_id | bigint | no | PK |  |
| raised_by | varchar(40) | no |  |  |
| raiser_type | raiser_type | no |  |  |
| facility_id | varchar(30) | no | FK ? infra.facility |  |
| space_id | varchar(30) | yes | FK ? infra.space |  |
| asset_id | varchar(40) | yes | FK ? infra.asset_master |  |
| category_id | varchar(20) | no | FK ? infra.maintenance_category |  |
| description | text | no |  |  |
| priority | priority | no |  | 'Medium'::infra.priority |
| raised_date | timestamptz | no |  | now() |
| assigned_to | varchar(20) | yes | FK ? infra.technician |  |
| assigned_date | timestamptz | yes |  |  |
| resolved_date | timestamptz | yes |  |  |
| resolution_notes | text | yes |  |  |
| cost_incurred | numeric(12,2) | yes |  |  |
| feedback_rating | smallint | yes |  |  |
| status | ticket_status | no |  | 'Open'::infra.ticket_status |
| verified_by | varchar(20) | yes | FK ? ref.staff_master |  |
| verified_at | timestamptz | yes |  |  |
| deadline_at | timestamptz | yes |  |  |
| closure_report | text | yes |  |  |
| auto_closed | boolean | no |  | false |
| follow_up_of | bigint | yes | FK ? infra.maintenance_ticket |  |

### infra.pm_schedule


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| pm_schedule_id | bigint | no | PK |  |
| asset_id | varchar(40) | yes | FK ? infra.asset_master |  |
| space_id | varchar(30) | yes | FK ? infra.space |  |
| category_id | varchar(20) | no | FK ? infra.maintenance_category |  |
| frequency | pm_frequency | no |  |  |
| task_checklist | text | yes |  |  |
| last_done_date | date | yes |  |  |
| next_due_date | date | yes |  |  |
| assigned_team_id | varchar(20) | yes | FK ? infra.maintenance_team |  |
| status | pm_status | no |  | 'Active'::infra.pm_status |

### infra.space
2.4 Space Master; hostel rooms get a one-to-one hostel.room_profile row

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| space_id | varchar(30) | no | PK |  |
| zone_id | varchar(30) | no | FK ? infra.zone |  |
| space_code | varchar(30) | no |  |  |
| space_name | varchar(120) | no |  |  |
| space_category | space_category | no |  |  |
| capacity | integer | yes |  |  |
| area_sqm | numeric(10,2) | yes |  |  |
| has_ac | boolean | no |  | false |
| has_projector | boolean | no |  | false |
| is_bookable | boolean | no |  | false |
| booking_rate | numeric(12,2) | yes |  |  |
| status | space_status | no |  | 'Available'::infra.space_status |

### infra.space_availability_log
4.8 prevents double booking; exclusion constraint enforces no time overlap per space per day

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| avail_id | bigint | no | PK |  |
| space_id | varchar(30) | no | FK ? infra.space |  |
| date | date | no |  |  |
| start_time | time without time zone | no |  |  |
| end_time | time without time zone | no |  |  |
| source_type | avail_source | no |  |  |
| source_id | bigint | no |  |  |

### infra.sports_membership


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| sport_member_id | bigint | no | PK |  |
| student_id | varchar(20) | no | FK ? ref.student_master |  |
| sport_id | varchar(30) | no | FK ? ref.sport |  |
| coach_id | varchar(20) | yes | FK ? ref.staff_master |  |
| team_name | varchar(80) | yes |  |  |
| membership_start | date | no |  |  |
| membership_end | date | yes |  |  |
| status | membership_status | no |  | 'Active'::infra.membership_status |

### infra.subspace


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| subspace_id | varchar(30) | no | PK |  |
| space_id | varchar(30) | no | FK ? infra.space |  |
| subspace_code | varchar(30) | no |  |  |
| subspace_type | subspace_type | no |  |  |
| status | subspace_status | no |  | 'Vacant'::infra.subspace_status |

### infra.technician


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| technician_id | varchar(20) | no | PK |  |
| staff_id | varchar(20) | yes | FK ? ref.staff_master |  |
| team_id | varchar(20) | yes | FK ? infra.maintenance_team |  |
| skill_set | varchar(160) | yes |  |  |
| shift | varchar(20) | yes |  |  |

### infra.timetable_slot


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| slot_id | varchar(20) | no | PK |  |
| day_of_week | day_of_week | no |  |  |
| start_time | time without time zone | no |  |  |
| end_time | time without time zone | no |  |  |
| slot_type | slot_type | no |  |  |

### infra.utility_consumption
5.9 building-level utility bills; per-room student meters are hostel.room_meter (Workflow C)

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| utility_id | bigint | no | PK |  |
| facility_id | varchar(30) | no | FK ? infra.facility |  |
| utility_type | utility_type | no |  |  |
| meter_no | varchar(40) | yes |  |  |
| reading_date | date | no |  |  |
| units_consumed | numeric(14,3) | yes |  |  |
| cost | numeric(12,2) | yes |  |  |

### infra.work_order


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| work_order_id | bigint | no | PK |  |
| ticket_id | bigint | yes | FK ? infra.maintenance_ticket |  |
| pm_schedule_id | bigint | yes | FK ? infra.pm_schedule |  |
| technician_id | varchar(20) | yes | FK ? infra.technician |  |
| vendor_id | varchar(20) | yes | FK ? portal.vendor |  |
| scheduled_date | date | yes |  |  |
| actual_start | timestamptz | yes |  |  |
| actual_end | timestamptz | yes |  |  |
| labour_hours | numeric(8,2) | yes |  |  |
| total_cost | numeric(12,2) | yes |  |  |
| downtime_hours | numeric(8,2) | yes |  |  |
| status | wo_status | no |  | 'Planned'::infra.wo_status |

### infra.work_order_part


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| wo_part_id | bigint | no | PK |  |
| work_order_id | bigint | no | FK ? infra.work_order |  |
| sku | varchar(30) | no | FK ? portal.material |  |
| quantity_used | numeric(14,3) | no |  |  |
| unit_cost | numeric(12,2) | yes |  |  |

### infra.zone


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| zone_id | varchar(30) | no | PK |  |
| facility_id | varchar(30) | no | FK ? infra.facility |  |
| zone_name | varchar(80) | no |  |  |
| zone_type | zone_type | no |  |  |
| sequence_no | smallint | yes |  |  |

### portal.advance_payment


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| advance_id | bigint | no | PK |  |
| po_id | integer | no | FK ? portal.purchase_order |  |
| vendor_id | varchar(20) | no | FK ? portal.vendor |  |
| advance_amount | numeric(16,2) | no |  |  |
| advance_date | date | no |  |  |
| payment_id | bigint | yes | FK ? portal.po_payment |  |
| adjusted_amount | numeric(16,2) | no |  | 0 |
| balance_amount | numeric(16,2) | yes |  |  |
| bank_guarantee_ref | varchar(60) | yes |  |  |
| status | advance_status | no |  | 'Paid'::portal.advance_status |

### portal.amc_renewal


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| renewal_id | varchar(20) | no | PK |  |
| sku | varchar(30) | no | FK ? portal.material |  |
| location_code | varchar(10) | no | FK ? portal.location |  |
| amc_id | varchar(30) | yes | FK ? infra.amc_contract |  |
| requested_by | integer | yes | FK ? portal.app_user |  |
| old_expiry | date | yes |  |  |
| new_expiry | date | yes |  |  |
| cost | numeric(12,2) | yes |  |  |
| status | amc_renewal_status | no |  | 'Proposed'::portal.amc_renewal_status |

### portal.amc_renewal_decision


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| renewal_id | varchar(20) | no | PK FK ? portal.amc_renewal |  |
| decision_no | smallint | no | PK |  |
| actor_id | integer | yes | FK ? portal.app_user |  |
| role_code | varchar(30) | yes | FK ? portal.role |  |
| action | varchar(120) | no |  |  |
| occurred_at | timestamptz | no |  | now() |

### portal.app_user


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| user_id | integer | no | PK |  |
| staff_id | varchar(20) | yes | FK ? ref.staff_master |  |
| full_name | varchar(160) | no |  |  |
| email | varchar(120) | yes |  |  |
| title | varchar(80) | yes |  |  |
| home_dept | varchar(20) | yes | FK ? ref.department |  |
| idp_subject | varchar(120) | yes |  |  |
| active | boolean | no |  | true |

### portal.approval_authority_matrix


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| matrix_id | bigint | no | PK |  |
| document_type | matrix_doc_type | no |  |  |
| value_from | numeric(16,2) | no |  |  |
| value_to | numeric(16,2) | yes |  |  |
| level_1_role | varchar(30) | yes | FK ? portal.role |  |
| level_2_role | varchar(30) | yes | FK ? portal.role |  |
| level_3_role | varchar(30) | yes | FK ? portal.role |  |
| requires_committee | boolean | no |  | false |

### portal.approval_log


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| approval_id | bigint | no | PK |  |
| document_type | matrix_doc_type | no |  |  |
| document_id | varchar(40) | no |  |  |
| level | smallint | no |  |  |
| approver_role | varchar(30) | yes | FK ? portal.role |  |
| approver_id | varchar(20) | yes | FK ? ref.staff_master |  |
| action | approval_action | no |  |  |
| action_date | timestamptz | no |  | now() |
| comments | text | yes |  |  |

### portal.asset


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| asset_tag | varchar(40) | no | PK |  |
| sku | varchar(30) | no | FK ? portal.material |  |
| serial_no | varchar(80) | yes |  |  |
| dept_code | varchar(20) | yes | FK ? ref.department |  |
| deployment_id | varchar(20) | yes | FK ? portal.deployment |  |
| grn_id | varchar(20) | yes | FK ? portal.grn |  |
| receipt_id | varchar(20) | yes | FK ? portal.receipt |  |
| asset_id | varchar(40) | yes | FK ? infra.asset_master |  |
| status | asset_tag_status | no |  | 'In_Store'::portal.asset_tag_status |
| space_id | varchar(30) | yes | FK ? infra.space |  |

### portal.asset_capitalisation


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| capitalisation_id | bigint | no | PK |  |
| asset_id | varchar(40) | no | FK ? infra.asset_master |  |
| asset_tag | varchar(40) | yes | FK ? portal.asset |  |
| deployment_id | varchar(20) | yes | FK ? portal.deployment |  |
| grn_id | varchar(20) | yes | FK ? portal.grn |  |
| po_id | integer | yes | FK ? portal.purchase_order |  |
| sku | varchar(30) | no | FK ? portal.material |  |
| serial_no | varchar(80) | yes |  |  |
| space_id | varchar(30) | yes | FK ? infra.space |  |
| capitalisation_date | date | no |  |  |
| purchase_cost | numeric(14,2) | no |  |  |
| freight_cost | numeric(12,2) | no |  | 0 |
| installation_cost | numeric(12,2) | no |  | 0 |
| capitalised_value | numeric(16,2) | yes |  |  |
| depreciation_method | depreciation_method | yes |  |  |
| useful_life_years | smallint | yes |  |  |
| salvage_value | numeric(14,2) | yes |  |  |
| asset_gl_account_id | varchar(20) | yes | FK ? portal.gl_account |  |
| custodian_id | varchar(20) | yes | FK ? ref.staff_master |  |
| status | capitalisation_status | no |  | 'Capitalised'::portal.capitalisation_sta |

### portal.asset_transfer


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| asset_transfer_id | bigint | no | PK |  |
| asset_id | varchar(40) | no | FK ? infra.asset_master |  |
| from_space_id | varchar(30) | yes | FK ? infra.space |  |
| to_space_id | varchar(30) | yes | FK ? infra.space |  |
| from_dept | varchar(20) | yes | FK ? ref.department |  |
| to_dept | varchar(20) | yes | FK ? ref.department |  |
| transfer_date | date | no |  | CURRENT_DATE |
| reason | text | yes |  |  |
| approved_by | varchar(20) | yes | FK ? ref.staff_master |  |

### portal.batch


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| batch_id | bigint | no | PK |  |
| sku | varchar(30) | no | FK ? portal.material |  |
| batch_no | varchar(40) | no |  |  |
| mfg_date | date | yes |  |  |
| expiry_date | date | yes |  |  |

### portal.bin


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| bin_code | varchar(20) | no | PK |  |
| location_code | varchar(10) | no | FK ? portal.location |  |
| rack_no | varchar(10) | yes |  |  |
| shelf_no | varchar(10) | yes |  |  |
| capacity | numeric(12,2) | yes |  |  |
| storage_condition | storage_condition | no |  | 'Normal'::portal.storage_condition |
| status | bin_status | no |  | 'Active'::portal.bin_status |

### portal.bom_component


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| parent_sku | varchar(30) | no | PK FK ? portal.material |  |
| component_sku | varchar(30) | no | PK FK ? portal.material |  |
| qty | numeric(14,3) | no |  |  |

### portal.budget_head


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| budget_code | varchar(30) | no | PK |  |
| dept_code | varchar(20) | no | FK ? ref.department |  |
| fy | varchar(9) | no |  |  |
| budget_category | budget_category | yes |  |  |
| head_name | varchar(120) | yes |  |  |
| gl_account_id | varchar(20) | yes | FK ? portal.gl_account |  |
| allocated | numeric(16,2) | no |  |  |
| committed_amount | numeric(16,2) | no |  | 0 |
| utilised_amount | numeric(16,2) | no |  | 0 |
| balance_amount | numeric(16,2) | yes |  |  |
| status | budget_status | no |  | 'Active'::portal.budget_status |

### portal.budget_txn


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| budget_txn_id | bigint | no | PK |  |
| budget_code | varchar(30) | no | FK ? portal.budget_head |  |
| txn_type | budget_txn_type | no |  |  |
| reference_type | budget_ref_type | no |  |  |
| reference_id | varchar(40) | no |  |  |
| amount | numeric(16,2) | no |  |  |
| txn_date | date | no |  | CURRENT_DATE |
| posted_by | varchar(20) | yes | FK ? ref.staff_master |  |

### portal.category


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| category_code | varchar(10) | no | PK |  |
| name | varchar(80) | no |  |  |
| parent_category_code | varchar(10) | yes | FK ? portal.category |  |
| item_nature | item_nature | yes |  |  |
| is_capitalised | boolean | no |  | false |
| default_gl_account_id | varchar(20) | yes | FK ? portal.gl_account |  |

### portal.commissioning_handover


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| commission_id | bigint | no | PK |  |
| deployment_id | varchar(20) | no | FK ? portal.deployment |  |
| commissioning_date | date | yes |  |  |
| tested_by | varchar(20) | yes | FK ? ref.staff_master |  |
| test_result | test_result | yes |  |  |
| test_report_doc_id | uuid | yes | FK ? shared.document |  |
| handed_over_to | varchar(20) | yes | FK ? ref.staff_master |  |
| handover_date | date | yes |  |  |
| training_provided | boolean | no |  | false |
| user_manual_received | boolean | no |  | false |
| warranty_card_ref | varchar(80) | yes |  |  |
| amc_id | varchar(30) | yes | FK ? infra.amc_contract |  |
| remarks | text | yes |  |  |

### portal.debit_note


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| note_id | bigint | no | PK |  |
| note_type | note_type | no |  |  |
| note_no | varchar(30) | no |  |  |
| note_date | date | no |  | CURRENT_DATE |
| vendor_id | varchar(20) | no | FK ? portal.vendor |  |
| invoice_id | bigint | yes | FK ? portal.vendor_invoice |  |
| rtv_id | bigint | yes | FK ? portal.return_to_vendor |  |
| reason | note_reason | no |  |  |
| basic_amount | numeric(16,2) | no |  |  |
| tax_amount | numeric(16,2) | no |  | 0 |
| total_amount | numeric(16,2) | yes |  |  |
| status | note_status | no |  | 'Raised'::portal.note_status |

### portal.deployment
Stock sent out for installation = Installation Work Order (7.1); items with requires_installation cannot be Installed without a space_id

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| deployment_id | varchar(20) | no | PK |  |
| dept_code | varchar(20) | no | FK ? ref.department |  |
| po_id | integer | yes | FK ? portal.purchase_order |  |
| grn_id | varchar(20) | yes | FK ? portal.grn |  |
| sku | varchar(30) | no | FK ? portal.material |  |
| from_bin | varchar(20) | yes | FK ? portal.bin |  |
| qty | numeric(14,3) | no |  | 1 |
| serial_no | varchar(80) | yes |  |  |
| custodian | varchar(120) | yes |  |  |
| custodian_staff_id | varchar(20) | yes | FK ? ref.staff_master |  |
| facility_id | varchar(30) | yes | FK ? infra.facility |  |
| space_id | varchar(30) | yes | FK ? infra.space |  |
| subspace_id | varchar(30) | yes | FK ? infra.subspace |  |
| installed_by_type | installed_by_type | yes |  |  |
| vendor_id | varchar(20) | yes | FK ? portal.vendor |  |
| technician_id | varchar(20) | yes | FK ? infra.technician |  |
| scheduled_date | date | yes |  |  |
| site_readiness_checked | boolean | no |  | false |
| pre_install_checklist | text | yes |  |  |
| actual_start | timestamptz | yes |  |  |
| actual_end | timestamptz | yes |  |  |
| installation_cost | numeric(12,2) | yes |  |  |
| status | deployment_status | no |  | 'Requested'::portal.deployment_status |
| ticket_id | bigint | yes | FK ? infra.maintenance_ticket |  |

### portal.deployment_event


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| deployment_id | varchar(20) | no | PK FK ? portal.deployment |  |
| event_no | smallint | no | PK |  |
| actor_id | integer | yes | FK ? portal.app_user |  |
| action | varchar(120) | no |  |  |
| occurred_at | timestamptz | no |  | now() |

### portal.dept_consumption


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| consumption_id | bigint | no | PK |  |
| dept_code | varchar(20) | no | FK ? ref.department |  |
| space_id | varchar(30) | yes | FK ? infra.space |  |
| sku | varchar(30) | no | FK ? portal.material |  |
| issue_id | varchar(20) | yes | FK ? portal.material_issue |  |
| qty_received | numeric(14,3) | no |  | 0 |
| qty_consumed | numeric(14,3) | no |  | 0 |
| qty_returned | numeric(14,3) | no |  | 0 |
| qty_in_hand | numeric(14,3) | yes |  |  |
| custodian_id | varchar(20) | yes | FK ? ref.staff_master |  |
| period | varchar(20) | yes |  |  |

### portal.equipment_cover


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| sku | varchar(30) | no | PK FK ? portal.material |  |
| location_code | varchar(10) | no | PK FK ? portal.location |  |
| amc_expiry | date | yes |  |  |
| warranty_expiry | date | yes |  |  |

### portal.gate_entry


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| gate_entry_id | varchar(20) | no | PK |  |
| shipment_id | bigint | yes | FK ? portal.shipment |  |
| entry_datetime | timestamptz | no |  | now() |
| vehicle_no | varchar(20) | yes |  |  |
| invoice_challan_no | varchar(60) | yes |  |  |
| no_of_packages | integer | yes |  |  |
| security_staff_id | varchar(20) | yes | FK ? ref.staff_master |  |
| status | gate_status | no |  | 'Entered'::portal.gate_status |

### portal.gl_account


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| gl_account_id | varchar(20) | no | PK |  |
| account_code | varchar(20) | no |  |  |
| account_name | varchar(120) | no |  |  |
| account_type | gl_account_type | no |  |  |
| parent_account_id | varchar(20) | yes | FK ? portal.gl_account |  |
| status | active_status | no |  | 'Active'::shared.active_status |

### portal.grn


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| grn_id | varchar(20) | no | PK |  |
| po_id | integer | no | FK ? portal.po_line |  |
| line_no | smallint | no | FK ? portal.po_line |  |
| shipment_id | bigint | yes | FK ? portal.shipment |  |
| gate_entry_id | varchar(20) | yes | FK ? portal.gate_entry |  |
| vendor_invoice_no | varchar(60) | yes |  |  |
| vendor_invoice_date | date | yes |  |  |
| received_on | date | no |  | CURRENT_DATE |
| receiving_location | varchar(10) | yes | FK ? portal.location |  |
| received_by | integer | yes | FK ? portal.app_user |  |
| bin_code | varchar(20) | yes | FK ? portal.bin |  |
| batch_id | bigint | yes | FK ? portal.batch |  |
| serial_nos | text | yes |  |  |
| qty_delivered | numeric(14,3) | yes |  |  |
| qty_received | numeric(14,3) | no |  |  |
| accepted_qty | numeric(14,3) | no |  | 0 |
| qty_rejected | numeric(14,3) | no |  | 0 |
| qty_short | numeric(14,3) | yes |  |  |
| unit_price | numeric(14,2) | yes |  |  |
| accepted_value | numeric(16,2) | yes |  |  |
| inspection_required | boolean | no |  | false |
| warranty_start | date | yes |  |  |
| warranty_end | date | yes |  |  |
| status | grn_status | no |  | 'Draft'::portal.grn_status |

### portal.hsn_sac


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| hsn_sac_code | varchar(10) | no | PK |  |
| description | varchar(160) | yes |  |  |
| taxability | taxability | no |  | 'Taxable'::portal.taxability |
| gst_rate | numeric(5,2) | no |  |  |

### portal.indent


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| indent_id | varchar(20) | no | PK |  |
| dept_code | varchar(20) | no | FK ? ref.department |  |
| raised_by | integer | no | FK ? portal.app_user |  |
| raised_on | date | no |  | CURRENT_DATE |
| need_by | date | yes |  |  |
| purpose | text | yes |  |  |
| priority | indent_priority | no |  | 'Normal'::portal.indent_priority |
| budget_code | varchar(30) | yes | FK ? portal.budget_head |  |
| workflow_step | smallint | no | FK ? portal.indent_step | 0 |
| target_space_id | varchar(30) | yes | FK ? infra.space |  |
| work_order_id | bigint | yes | FK ? infra.work_order |  |
| preferred_location | varchar(10) | yes | FK ? portal.location |  |
| hod_approval_by | varchar(20) | yes | FK ? ref.staff_master |  |
| hod_approval_date | date | yes |  |  |
| status | indent_status | no |  | 'Draft'::portal.indent_status |
| facility_id | varchar(30) | yes | FK ? infra.facility |  |
| ticket_id | bigint | yes | FK ? infra.maintenance_ticket |  |

### portal.indent_event


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| indent_id | varchar(20) | no | PK FK ? portal.indent |  |
| event_no | smallint | no | PK |  |
| actor_id | integer | yes | FK ? portal.app_user |  |
| role_code | varchar(30) | yes | FK ? portal.role |  |
| action | varchar(120) | no |  |  |
| note | text | yes |  |  |
| occurred_at | timestamptz | no |  | now() |

### portal.indent_line


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| indent_id | varchar(20) | no | PK FK ? portal.indent |  |
| sku | varchar(30) | yes | FK ? portal.material |  |
| item_description | varchar(200) | yes |  |  |
| specification | text | yes |  |  |
| uom | varchar(10) | yes | FK ? portal.unit_of_measure |  |
| qty | numeric(14,3) | no |  |  |
| qty_approved | numeric(14,3) | yes |  |  |
| unit_price_at_indent | numeric(14,2) | yes |  |  |
| qty_available_substore | numeric(14,3) | yes |  |  |
| qty_available_central | numeric(14,3) | yes |  |  |
| fulfilment_source | fulfilment_source | yes |  |  |
| qty_issued | numeric(14,3) | no |  | 0 |
| qty_to_purchase | numeric(14,3) | no |  | 0 |
| pr_line_id | bigint | yes | FK ? portal.pr_line |  |
| line_status | indent_line_status | no |  | 'Pending'::portal.indent_line_status |
| line_no | smallint | no | PK | 1 |

### portal.indent_step


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| step | smallint | no | PK |  |
| name | varchar(80) | no |  |  |

### portal.journal_entry


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| journal_id | bigint | no | PK |  |
| journal_date | date | no |  | CURRENT_DATE |
| source_type | journal_source | no |  |  |
| source_id | varchar(40) | no |  |  |
| narration | text | yes |  |  |
| posted_by | varchar(20) | yes | FK ? ref.staff_master |  |
| status | journal_status | no |  | 'Draft'::portal.journal_status |

### portal.journal_line


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| journal_line_id | bigint | no | PK |  |
| journal_id | bigint | no | FK ? portal.journal_entry |  |
| gl_account_id | varchar(20) | no | FK ? portal.gl_account |  |
| dept_code | varchar(20) | yes | FK ? ref.department |  |
| budget_code | varchar(30) | yes | FK ? portal.budget_head |  |
| debit_amount | numeric(16,2) | no |  | 0 |
| credit_amount | numeric(16,2) | no |  | 0 |

### portal.ledger


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| ledger_code | varchar(20) | no | PK |  |
| name | varchar(80) | no |  |  |
| ledger_group | ledger_group | no |  |  |
| gl_account_id | varchar(20) | yes | FK ? portal.gl_account |  |

### portal.location
Stores and sub-stores (portal location + Store Master + Tally godown); hostel.hostel_profile.sub_store_code points here

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| location_code | varchar(10) | no | PK |  |
| name | varchar(120) | no |  |  |
| campus_id | varchar(20) | yes | FK ? infra.campus |  |
| store_type | store_type | no |  | 'Central'::portal.store_type |
| parent_location_code | varchar(10) | yes | FK ? portal.location |  |
| dept_code | varchar(20) | yes | FK ? ref.department |  |
| facility_id | varchar(30) | yes | FK ? infra.facility |  |
| space_id | varchar(30) | yes | FK ? infra.space |  |
| store_keeper_id | varchar(20) | yes | FK ? ref.staff_master |  |
| can_purchase_directly | boolean | no |  | false |
| max_stock_value | numeric(14,2) | yes |  |  |
| distance_km | numeric(8,2) | yes |  |  |
| status | store_status | no |  | 'Active'::portal.store_status |

### portal.material
Product master; every stock, indent, order and asset line points here

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| sku | varchar(30) | no | PK |  |
| erp_material_code | varchar(20) | yes |  |  |
| name | varchar(160) | no |  |  |
| part_no | varchar(60) | yes |  |  |
| description | text | yes |  |  |
| notes | text | yes |  |  |
| category_code | varchar(10) | yes | FK ? portal.category |  |
| sub_category_id | integer | yes | FK ? portal.sub_category |  |
| stock_group_code | varchar(10) | yes | FK ? portal.stock_group |  |
| base_unit | varchar(10) | no | FK ? portal.unit_of_measure |  |
| alt_unit | varchar(10) | yes | FK ? portal.unit_of_measure |  |
| conversion_factor | numeric(12,4) | yes |  |  |
| hsn_sac_code | varchar(10) | yes | FK ? portal.hsn_sac |  |
| gst_applicable | boolean | no |  | true |
| item_nature | item_nature | no |  | 'Consumable'::portal.item_nature |
| purchase_ledger_code | varchar(20) | yes | FK ? portal.ledger |  |
| sales_ledger_code | varchar(20) | yes | FK ? portal.ledger |  |
| cost_tracking | boolean | no |  | false |
| costing_method | valuation_method | no |  | 'Weighted_Average'::portal.valuation_met |
| market_valuation_method | valuation_method | yes |  |  |
| maintain_batches | boolean | no |  | false |
| track_mfg_date | boolean | no |  | false |
| use_expiry | boolean | no |  | false |
| shelf_life_days | integer | yes |  |  |
| list_price | numeric(14,2) | yes |  |  |
| standard_cost | numeric(14,2) | yes |  |  |
| reorder_level | numeric(14,3) | yes |  |  |
| min_order_qty | numeric(14,3) | yes |  |  |
| reorder_qty | numeric(14,3) | yes |  |  |
| consumption_period_days | integer | yes |  |  |
| reorder_criteria | varchar(10) | yes |  |  |
| lead_time_days | integer | yes |  |  |
| brand | varchar(80) | yes |  |  |
| model_no | varchar(80) | yes |  |  |
| barcode_qr | varchar(80) | yes |  |  |
| preferred_supplier_code | varchar(20) | yes | FK ? portal.vendor |  |
| custodian_dept_code | varchar(20) | yes | FK ? ref.department |  |
| warranty_months | integer | yes |  |  |
| requires_installation | boolean | no |  | false |
| requires_inspection | boolean | no |  | false |
| is_serialised | boolean | no |  | false |
| substitute_sku | varchar(30) | yes | FK ? portal.material |  |
| status | material_status | no |  | 'Active'::portal.material_status |

### portal.material_alias


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| sku | varchar(30) | no | PK FK ? portal.material |  |
| alias | varchar(80) | no | PK |  |

### portal.material_issue


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| issue_id | varchar(20) | no | PK |  |
| indent_id | varchar(20) | no | FK ? portal.indent |  |
| location_code | varchar(10) | yes | FK ? portal.location |  |
| dept_code | varchar(20) | yes | FK ? ref.department |  |
| issued_on | date | no |  | CURRENT_DATE |
| issued_by | integer | yes | FK ? portal.app_user |  |
| collected_by | integer | yes | FK ? portal.app_user |  |
| delivered_to_space_id | varchar(30) | yes | FK ? infra.space |  |
| method | issue_method | yes |  |  |
| acknowledged_by | varchar(20) | yes | FK ? ref.staff_master |  |
| acknowledged_on | date | yes |  |  |
| status | issue_status | no |  | 'Awaiting_Collection'::portal.issue_stat |
| hostel_alloc_id | bigint | yes | FK ? hostel.hostel_allocation |  |
| ticket_id | bigint | yes | FK ? infra.maintenance_ticket |  |

### portal.material_issue_line


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| issue_id | varchar(20) | no | PK FK ? portal.material_issue |  |
| sku | varchar(30) | no | PK FK ? portal.material |  |
| bin_code | varchar(20) | no | PK FK ? portal.bin |  |
| batch_id | bigint | yes | FK ? portal.batch |  |
| serial_no | varchar(80) | yes |  |  |
| qty | numeric(14,3) | no |  |  |
| unit_cost | numeric(14,2) | yes |  |  |
| total_cost | numeric(16,2) | yes |  |  |
| asset_id | varchar(40) | yes | FK ? infra.asset_master |  |

### portal.material_standard_rate


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| sku | varchar(30) | no | PK FK ? portal.material |  |
| applicable_from | date | no | PK |  |
| buying_rate | numeric(14,2) | yes |  |  |
| selling_rate | numeric(14,2) | yes |  |  |

### portal.new_request


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| request_id | varchar(20) | no | PK |  |
| dept_code | varchar(20) | no | FK ? ref.department |  |
| raised_by | integer | no | FK ? portal.app_user |  |
| raised_on | date | no |  | CURRENT_DATE |
| product | varchar(160) | no |  |  |
| brand | varchar(80) | yes |  |  |
| specification | text | yes |  |  |
| qty | numeric(14,3) | no |  |  |
| uom | varchar(10) | yes | FK ? portal.unit_of_measure |  |
| estimated_price | numeric(14,2) | yes |  |  |
| category_code | varchar(10) | yes | FK ? portal.category |  |
| indent_id | varchar(20) | yes | FK ? portal.indent |  |
| step | smallint | no |  | 1 |
| registered_sku | varchar(30) | yes | FK ? portal.material |  |
| status | new_request_status | no |  | 'Submitted'::portal.new_request_status |

### portal.new_request_event


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| request_id | varchar(20) | no | PK FK ? portal.new_request |  |
| event_no | smallint | no | PK |  |
| actor_id | integer | yes | FK ? portal.app_user |  |
| role_code | varchar(30) | yes | FK ? portal.role |  |
| action | varchar(120) | no |  |  |
| note | text | yes |  |  |
| occurred_at | timestamptz | no |  | now() |

### portal.opening_stock


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| batch_id | bigint | no | PK FK ? portal.batch |  |
| location_code | varchar(10) | no | PK FK ? portal.location |  |
| opening_qty | numeric(14,3) | no |  |  |
| opening_rate | numeric(14,2) | yes |  |  |

### portal.payment_allocation


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| allocation_id | bigint | no | PK |  |
| payment_id | bigint | no | FK ? portal.po_payment |  |
| invoice_id | bigint | no | FK ? portal.vendor_invoice |  |
| advance_id | bigint | yes | FK ? portal.advance_payment |  |
| amount_allocated | numeric(16,2) | no |  |  |

### portal.physical_count


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| count_id | bigint | no | PK |  |
| location_code | varchar(10) | no | FK ? portal.location |  |
| count_type | count_type | no |  |  |
| count_date | date | no |  |  |
| counted_by | varchar(20) | yes | FK ? ref.staff_master |  |
| verified_by | varchar(20) | yes | FK ? ref.staff_master |  |
| status | count_status | no |  | 'Planned'::portal.count_status |

### portal.physical_count_line


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| count_line_id | bigint | no | PK |  |
| count_id | bigint | no | FK ? portal.physical_count |  |
| sku | varchar(30) | no | FK ? portal.material |  |
| bin_code | varchar(20) | no | FK ? portal.bin |  |
| system_qty | numeric(14,3) | no |  |  |
| counted_qty | numeric(14,3) | no |  |  |
| variance_qty | numeric(14,3) | yes |  |  |
| variance_value | numeric(16,2) | yes |  |  |
| adjustment_id | bigint | yes | FK ? portal.stock_adjustment |  |

### portal.po_alert


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| alert_id | bigint | no | PK |  |
| po_id | integer | no | FK ? portal.purchase_order |  |
| condition_id | bigint | yes | FK ? portal.po_condition |  |
| alert_type | varchar(40) | no |  |  |
| severity | alert_severity | no |  | 'Warning'::portal.alert_severity |
| raised_at | timestamptz | no |  | now() |
| assigned_to | varchar(20) | yes | FK ? ref.staff_master |  |
| acknowledged_at | timestamptz | yes |  |  |
| status | alert_status | no |  | 'Open'::portal.alert_status |

### portal.po_amendment


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| amendment_id | bigint | no | PK |  |
| po_id | integer | no | FK ? portal.purchase_order |  |
| amendment_no | smallint | no |  |  |
| amendment_date | date | no |  | CURRENT_DATE |
| change_type | po_change_type | no |  |  |
| old_value | text | yes |  |  |
| new_value | text | yes |  |  |
| reason | text | yes |  |  |
| approved_by | varchar(20) | yes | FK ? ref.staff_master |  |

### portal.po_condition


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| condition_id | bigint | no | PK |  |
| po_id | integer | no | FK ? portal.purchase_order |  |
| condition_text | varchar(300) | no |  |  |
| due_date | date | yes |  |  |
| watched_by | varchar(20) | yes | FK ? ref.staff_master |  |
| status | condition_status | no |  | 'Open'::portal.condition_status |
| met_on | date | yes |  |  |

### portal.po_counter


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| fy | varchar(9) | no | PK |  |
| last_seq | integer | no |  | 0 |

### portal.po_event


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| po_id | integer | no | PK FK ? portal.purchase_order |  |
| event_no | smallint | no | PK |  |
| actor_id | integer | yes | FK ? portal.app_user |  |
| role_code | varchar(30) | yes | FK ? portal.role |  |
| action | varchar(120) | no |  |  |
| note | text | yes |  |  |
| occurred_at | timestamptz | no |  | now() |

### portal.po_line


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| po_id | integer | no | PK FK ? portal.purchase_order |  |
| line_no | smallint | no | PK |  |
| sku | varchar(30) | no | FK ? portal.material |  |
| description | varchar(200) | yes |  |  |
| brand_model | varchar(120) | yes |  |  |
| qty | numeric(14,3) | no |  |  |
| uom | varchar(10) | yes | FK ? portal.unit_of_measure |  |
| unit_price | numeric(14,2) | no |  |  |
| discount_pct | numeric(5,2) | no |  | 0 |
| cgst_pct | numeric(5,2) | no |  | 0 |
| sgst_pct | numeric(5,2) | no |  | 0 |
| igst_pct | numeric(5,2) | no |  | 0 |
| qty_received | numeric(14,3) | no |  | 0 |
| qty_rejected | numeric(14,3) | no |  | 0 |
| qty_pending | numeric(14,3) | yes |  |  |
| install_space_id | varchar(30) | yes | FK ? infra.space |  |
| line_status | po_line_status | no |  | 'Open'::portal.po_line_status |
| po_line_id | bigint | no |  |  |

### portal.po_payment


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| payment_id | bigint | no | PK |  |
| payment_no | varchar(30) | yes |  |  |
| po_id | integer | yes | FK ? portal.purchase_order |  |
| vendor_id | varchar(20) | no | FK ? portal.vendor |  |
| invoice_no | varchar(60) | yes |  |  |
| invoice_date | date | yes |  |  |
| invoice_amount | numeric(16,2) | yes |  |  |
| payment_date | date | yes |  |  |
| payment_type | payment_type | no |  | 'Against_Invoice'::portal.payment_type |
| mode | payment_mode | yes |  |  |
| bank_account_id | varchar(20) | yes |  |  |
| transaction_ref | varchar(60) | yes |  |  |
| gross_amount | numeric(16,2) | no |  |  |
| tds_deducted | numeric(16,2) | no |  | 0 |
| penalty_deducted | numeric(16,2) | no |  | 0 |
| net_paid | numeric(16,2) | yes |  |  |
| prepared_by | varchar(20) | yes | FK ? ref.staff_master |  |
| approved_by | varchar(20) | yes | FK ? ref.staff_master |  |
| status | payment_status | no |  | 'Draft'::portal.payment_status |

### portal.po_terms


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| po_id | integer | no | PK FK ? portal.purchase_order |  |
| taxes | varchar(60) | yes |  |  |
| delivery_schedule | varchar(120) | yes |  |  |
| warranty | varchar(120) | yes |  |  |
| warranty_months | smallint | yes |  |  |
| jurisdiction | varchar(60) | yes |  |  |
| payment_terms | varchar(160) | yes |  |  |
| penalty_clause | text | yes |  |  |
| terms_conditions | text | yes |  |  |

### portal.pr_line


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| pr_line_id | bigint | no | PK |  |
| pr_id | bigint | no | FK ? portal.purchase_requisition |  |
| indent_id | varchar(20) | yes | FK ? portal.indent_line |  |
| indent_line_no | smallint | yes | FK ? portal.indent_line |  |
| sku | varchar(30) | yes | FK ? portal.material |  |
| specification | text | yes |  |  |
| uom | varchar(10) | yes | FK ? portal.unit_of_measure |  |
| qty_required | numeric(14,3) | no |  |  |
| estimated_unit_price | numeric(14,2) | yes |  |  |
| estimated_total | numeric(16,2) | yes |  |  |
| delivery_location | varchar(10) | yes | FK ? portal.location |  |
| install_space_id | varchar(30) | yes | FK ? infra.space |  |
| po_line_id | bigint | yes | FK ? portal.po_line |  |
| line_status | pr_line_status | no |  | 'Open'::portal.pr_line_status |

### portal.purchase_order
Order header; the total is never stored — see portal.v_po_total

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| po_id | integer | no | PK |  |
| office_no | varchar(40) | no |  |  |
| po_date | date | no |  | CURRENT_DATE |
| fy | varchar(9) | no | FK ? portal.po_counter |  |
| vendor_id | varchar(20) | no | FK ? portal.vendor |  |
| indent_id | varchar(20) | yes | FK ? portal.indent |  |
| request_id | varchar(20) | yes | FK ? portal.new_request |  |
| rfq_id | varchar(20) | yes | FK ? portal.rfq |  |
| pr_id | bigint | yes | FK ? portal.purchase_requisition |  |
| po_type | po_type | no |  | 'Standard'::portal.po_type |
| delivery_location | varchar(10) | yes | FK ? portal.location |  |
| delivery_address | text | yes |  |  |
| expected_delivery_date | date | yes |  |  |
| advance_pct | numeric(5,2) | yes |  |  |
| prepared_by | integer | yes | FK ? portal.app_user |  |
| approved_by | varchar(20) | yes | FK ? ref.staff_master |  |
| approval_date | date | yes |  |  |
| vendor_acknowledged_date | date | yes |  |  |
| stage | po_stage | no |  | 'Draft'::portal.po_stage |
| deleted_by | integer | yes | FK ? portal.app_user |  |
| budget_code | varchar(30) | yes | FK ? portal.budget_head |  |
| facility_id | varchar(30) | yes | FK ? infra.facility |  |

### portal.purchase_requisition


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| pr_id | bigint | no | PK |  |
| pr_no | varchar(20) | no |  |  |
| pr_type | pr_type | no |  |  |
| raised_by_location | varchar(10) | yes | FK ? portal.location |  |
| dept_code | varchar(20) | no | FK ? ref.department |  |
| indent_id | varchar(20) | yes | FK ? portal.indent |  |
| budget_code | varchar(30) | yes | FK ? portal.budget_head |  |
| estimated_value | numeric(16,2) | yes |  |  |
| budget_available | numeric(16,2) | yes |  |  |
| justification | text | yes |  |  |
| raised_date | date | no |  | CURRENT_DATE |
| required_by_date | date | yes |  |  |
| stores_head_approval | varchar(20) | yes | FK ? ref.staff_master |  |
| finance_approval | varchar(20) | yes | FK ? ref.staff_master |  |
| principal_approval | varchar(20) | yes | FK ? ref.staff_master |  |
| status | pr_status | no |  | 'Draft'::portal.pr_status |

### portal.quality_inspection


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| inspection_id | bigint | no | PK |  |
| grn_id | varchar(20) | no | FK ? portal.grn |  |
| inspection_date | date | no |  | CURRENT_DATE |
| inspected_by | varchar(20) | yes | FK ? ref.staff_master |  |
| inspection_type | inspection_kind | no |  |  |
| checklist_ref | varchar(80) | yes |  |  |
| overall_result | inspection_result | yes |  |  |
| remarks | text | yes |  |  |
| report_doc_id | uuid | yes | FK ? shared.document |  |

### portal.quality_inspection_line


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| inspection_line_id | bigint | no | PK |  |
| inspection_id | bigint | no | FK ? portal.quality_inspection |  |
| parameter | varchar(120) | no |  |  |
| expected_value | varchar(120) | yes |  |  |
| observed_value | varchar(120) | yes |  |  |
| result | pass_fail | no |  |  |
| qty_accepted | numeric(14,3) | yes |  |  |
| qty_rejected | numeric(14,3) | yes |  |  |
| rejection_reason | varchar(160) | yes |  |  |

### portal.receipt


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| receipt_id | varchar(20) | no | PK |  |
| sku | varchar(30) | no | FK ? portal.material |  |
| qty | numeric(14,3) | no |  |  |
| unit_price | numeric(14,2) | yes |  |  |
| bin_code | varchar(20) | no | FK ? portal.bin |  |
| reference | varchar(160) | yes |  |  |
| owner_id | integer | yes | FK ? portal.app_user |  |
| verified_by | integer | yes | FK ? portal.app_user |  |
| received_on | date | no |  | CURRENT_DATE |
| status | receipt_status | no |  | 'Draft'::portal.receipt_status |

### portal.reorder_rule


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| reorder_rule_id | bigint | no | PK |  |
| location_code | varchar(10) | no | FK ? portal.location |  |
| sku | varchar(30) | no | FK ? portal.material |  |
| min_level | numeric(14,3) | no |  |  |
| max_level | numeric(14,3) | yes |  |  |
| reorder_qty | numeric(14,3) | no |  |  |
| replenish_from | replenish_from | no |  |  |
| auto_generate | boolean | no |  | false |
| status | active_status | no |  | 'Active'::shared.active_status |

### portal.return_to_vendor


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| rtv_id | bigint | no | PK |  |
| rtv_no | varchar(20) | no |  |  |
| grn_id | varchar(20) | no | FK ? portal.grn |  |
| vendor_id | varchar(20) | no | FK ? portal.vendor |  |
| sku | varchar(30) | no | FK ? portal.material |  |
| qty_returned | numeric(14,3) | no |  |  |
| return_reason | rtv_reason | no |  |  |
| return_action | rtv_action | no |  |  |
| return_date | date | yes |  |  |
| transporter_id | varchar(20) | yes | FK ? portal.transporter |  |
| debit_note_id | bigint | yes | FK ? portal.debit_note |  |
| replacement_grn_id | varchar(20) | yes | FK ? portal.grn |  |
| status | rtv_status | no |  | 'Raised'::portal.rtv_status |

### portal.rfq


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| rfq_id | varchar(20) | no | PK |  |
| pr_id | bigint | yes | FK ? portal.purchase_requisition |  |
| indent_id | varchar(20) | yes | FK ? portal.indent |  |
| sku | varchar(30) | no | FK ? portal.material |  |
| qty | numeric(14,3) | no |  |  |
| floated_on | date | no |  | CURRENT_DATE |
| due_date | date | yes |  |  |
| rfq_mode | rfq_mode | no |  | 'Limited_Tender'::portal.rfq_mode |
| min_quotes_required | smallint | no |  | 3 |
| criteria_set_id | varchar(20) | yes |  |  |
| issued_by | integer | yes | FK ? portal.app_user |  |
| status | rfq_status | no |  | 'Draft'::portal.rfq_status |

### portal.rfq_bid


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| rfq_id | varchar(20) | no | PK FK ? portal.rfq |  |
| vendor_id | varchar(20) | no | PK FK ? portal.vendor |  |
| quotation_no | varchar(40) | yes |  |  |
| quotation_date | date | yes |  |  |
| validity_date | date | yes |  |  |
| offered_brand_model | varchar(120) | yes |  |  |
| spec_compliance | spec_compliance | yes |  |  |
| quoted_qty | numeric(14,3) | yes |  |  |
| unit_price | numeric(14,2) | no |  |  |
| discount_pct | numeric(5,2) | no |  | 0 |
| tax_pct | numeric(5,2) | no |  | 0 |
| lead_days | smallint | yes |  |  |
| warranty_months | smallint | yes |  |  |
| payment_terms | varchar(120) | yes |  |  |
| freight_included | boolean | no |  | false |
| installation_included | boolean | no |  | false |
| attachment_doc_id | uuid | yes | FK ? shared.document |  |
| status | bid_status | no |  | 'Received'::portal.bid_status |

### portal.rfq_vendor


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| rfq_id | varchar(20) | no | PK FK ? portal.rfq |  |
| vendor_id | varchar(20) | no | PK FK ? portal.vendor |  |
| sent_date | date | yes |  |  |
| response_status | rfq_response | no |  | 'Invited'::portal.rfq_response |

### portal.role
The roles of the portal plus hostel roles (Chief Manager, Floor Manager, Security ...); hostel.staff_space_assignment.hostel_role references it

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| role_code | varchar(30) | no | PK |  |
| name | varchar(80) | no |  |  |
| module | varchar(20) | no |  | 'portal'::character varying |

### portal.scrap_return


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| srn_id | varchar(20) | no | PK |  |
| indent_id | varchar(20) | yes | FK ? portal.indent |  |
| sku | varchar(30) | yes | FK ? portal.material |  |
| old_serial | varchar(80) | yes |  |  |
| asset_id | varchar(40) | yes | FK ? infra.asset_master |  |
| received_by | integer | yes | FK ? portal.app_user |  |
| received_on | date | yes |  |  |
| status | scrap_status | no |  | 'Pending'::portal.scrap_status |

### portal.serialised_stock


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| serial_stock_id | bigint | no | PK |  |
| sku | varchar(30) | no | FK ? portal.material |  |
| serial_no | varchar(80) | no |  |  |
| location_code | varchar(10) | yes | FK ? portal.location |  |
| grn_id | varchar(20) | yes | FK ? portal.grn |  |
| asset_id | varchar(40) | yes | FK ? infra.asset_master |  |
| status | serial_status | no |  | 'In_Store'::portal.serial_status |

### portal.service_ticket


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| ticket_id | varchar(20) | no | PK |  |
| asset_tag | varchar(40) | no | FK ? portal.asset |  |
| issue | varchar(200) | no |  |  |
| priority | priority | no |  | 'Medium'::infra.priority |
| opened_by | integer | yes | FK ? portal.app_user |  |
| opened_at | timestamptz | no |  | now() |
| maintenance_ticket_id | bigint | yes | FK ? infra.maintenance_ticket |  |
| status | service_ticket_status | no |  | 'Open'::portal.service_ticket_status |

### portal.shipment


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| shipment_id | bigint | no | PK |  |
| po_id | integer | no | FK ? portal.purchase_order |  |
| vendor_id | varchar(20) | no | FK ? portal.vendor |  |
| transporter_id | varchar(20) | yes | FK ? portal.transporter |  |
| dispatch_date | date | yes |  |  |
| lr_docket_no | varchar(60) | yes |  |  |
| vehicle_no | varchar(20) | yes |  |  |
| driver_name_contact | varchar(120) | yes |  |  |
| e_way_bill_no | varchar(30) | yes |  |  |
| no_of_packages | integer | yes |  |  |
| gross_weight_kg | numeric(10,2) | yes |  |  |
| freight_charges | numeric(12,2) | yes |  |  |
| freight_paid_by | freight_paid_by | yes |  |  |
| insurance_ref | varchar(60) | yes |  |  |
| expected_arrival_date | date | yes |  |  |
| actual_arrival_date | date | yes |  |  |
| status | shipment_status | no |  | 'Dispatched'::portal.shipment_status |

### portal.shipment_tracking


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| tracking_id | bigint | no | PK |  |
| shipment_id | bigint | no | FK ? portal.shipment |  |
| event_time | timestamptz | no |  | now() |
| location | varchar(120) | yes |  |  |
| event_status | varchar(60) | yes |  |  |
| updated_by | tracking_source | no |  |  |

### portal.stock
Stock Balance; recomputed only from portal.stock_movement rows (rule 1 of the inventory model)

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| sku | varchar(30) | no | PK FK ? portal.material |  |
| bin_code | varchar(20) | no | PK FK ? portal.bin |  |
| batch_id | bigint | no | PK FK ? portal.batch |  |
| qty | numeric(14,3) | no |  | 0 |
| qty_reserved | numeric(14,3) | no |  | 0 |
| qty_available | numeric(14,3) | yes |  |  |
| qty_on_order | numeric(14,3) | no |  | 0 |
| avg_unit_cost | numeric(14,2) | yes |  |  |
| stock_value | numeric(16,2) | yes |  |  |
| last_receipt_date | date | yes |  |  |
| last_issue_date | date | yes |  |  |
| counted_on | date | yes |  |  |

### portal.stock_adjustment


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| adjustment_id | bigint | no | PK |  |
| location_code | varchar(10) | no | FK ? portal.location |  |
| sku | varchar(30) | no | FK ? portal.material |  |
| bin_code | varchar(20) | yes | FK ? portal.bin |  |
| adjustment_type | adjustment_type | no |  |  |
| qty_adjusted | numeric(14,3) | no |  |  |
| value_adjusted | numeric(16,2) | yes |  |  |
| reason | text | no |  |  |
| requested_by | varchar(20) | yes | FK ? ref.staff_master |  |
| approved_by | varchar(20) | yes | FK ? ref.staff_master |  |
| adjustment_date | date | no |  | CURRENT_DATE |
| status | approval_status | no |  | 'Pending'::portal.approval_status |

### portal.stock_check


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| indent_id | varchar(20) | no | PK FK ? portal.indent |  |
| checked_by | integer | yes | FK ? portal.app_user |  |
| checked_on | timestamptz | no |  | now() |
| note | text | yes |  |  |

### portal.stock_check_line


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| indent_id | varchar(20) | no | PK FK ? portal.stock_check |  |
| sku | varchar(30) | no | PK FK ? portal.material |  |
| on_hand_at_check | numeric(14,3) | no |  |  |
| available_at_check | numeric(14,3) | no |  |  |
| issue_qty | numeric(14,3) | no |  |  |
| remark | varchar(160) | yes |  |  |

### portal.stock_entry


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| entry_id | varchar(20) | no | PK |  |
| entry_on | date | no |  | CURRENT_DATE |
| sku | varchar(30) | no | FK ? portal.material |  |
| bin_code | varchar(20) | no | FK ? portal.bin |  |
| qty | numeric(14,3) | no |  |  |
| unit_price | numeric(14,2) | yes |  |  |
| actor_id | integer | yes | FK ? portal.app_user |  |
| matched_po_id | integer | yes | FK ? portal.purchase_order |  |
| matched_indent_id | varchar(20) | yes | FK ? portal.indent |  |
| audit_status | audit_status | no |  | 'Clear'::portal.audit_status |

### portal.stock_entry_finding


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| entry_id | varchar(20) | no | PK FK ? portal.stock_entry |  |
| finding_no | smallint | no | PK |  |
| finding | varchar(200) | no |  |  |

### portal.stock_group


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| group_code | varchar(10) | no | PK |  |
| name | varchar(80) | no |  |  |
| parent_group_code | varchar(10) | yes | FK ? portal.stock_group |  |

### portal.stock_movement
Stock Transaction Ledger: each row names the one paper that caused it; portal.stock is derived from it

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| movement_id | bigint | no | PK |  |
| moved_at | timestamptz | no |  | now() |
| sku | varchar(30) | no | FK ? portal.material |  |
| bin_code | varchar(20) | no | FK ? portal.bin |  |
| batch_id | bigint | yes | FK ? portal.batch |  |
| qty | numeric(14,3) | no |  |  |
| unit_cost | numeric(14,2) | yes |  |  |
| movement_type | movement_type | no |  |  |
| actor_id | integer | yes | FK ? portal.app_user |  |
| grn_id | varchar(20) | yes | FK ? portal.grn |  |
| issue_id | varchar(20) | yes | FK ? portal.material_issue |  |
| receipt_id | varchar(20) | yes | FK ? portal.receipt |  |
| stock_entry_id | varchar(20) | yes | FK ? portal.stock_entry |  |
| deployment_id | varchar(20) | yes | FK ? portal.deployment |  |
| srn_id | varchar(20) | yes | FK ? portal.scrap_return |  |
| transfer_id | bigint | yes | FK ? portal.stock_transfer |  |
| return_id | bigint | yes | FK ? portal.stock_return |  |
| adjustment_id | bigint | yes | FK ? portal.stock_adjustment |  |
| rtv_id | bigint | yes | FK ? portal.return_to_vendor |  |
| count_id | bigint | yes | FK ? portal.physical_count |  |
| balance_after | numeric(14,3) | yes |  |  |
| remarks | text | yes |  |  |

### portal.stock_reservation


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| indent_id | varchar(20) | no | PK FK ? portal.indent |  |
| sku | varchar(30) | no | PK FK ? portal.material |  |
| bin_code | varchar(20) | no | PK FK ? portal.bin |  |
| qty | numeric(14,3) | no |  |  |

### portal.stock_return


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| return_id | bigint | no | PK |  |
| return_no | varchar(20) | no |  |  |
| from_dept | varchar(20) | no | FK ? ref.department |  |
| from_space_id | varchar(30) | yes | FK ? infra.space |  |
| to_location | varchar(10) | no | FK ? portal.location |  |
| issue_id | varchar(20) | yes | FK ? portal.material_issue |  |
| return_reason | return_reason | no |  |  |
| returned_by | varchar(20) | yes | FK ? ref.staff_master |  |
| received_by | varchar(20) | yes | FK ? ref.staff_master |  |
| return_date | date | no |  | CURRENT_DATE |
| condition | return_condition | no |  |  |
| status | return_status | no |  | 'Raised'::portal.return_status |

### portal.stock_sheet


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| sheet_id | integer | no | PK |  |
| sheet_name | varchar(80) | no |  |  |
| source_file | varchar(120) | no |  |  |
| sheet_order | smallint | no |  |  |
| counted_on | date | yes |  |  |

### portal.stock_sheet_line


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| sheet_id | integer | no | PK FK ? portal.stock_sheet |  |
| line_no | integer | no | PK |  |
| sl_no | varchar(10) | yes |  |  |
| material_name | varchar(160) | no |  |  |
| make | varchar(80) | yes |  |  |
| unit | varchar(20) | yes |  |  |
| qty_text | varchar(40) | yes |  |  |
| qty_value | numeric(14,3) | yes |  |  |
| qty_basis | qty_basis | no |  | 'as_written'::portal.qty_basis |
| remarks | text | yes |  |  |
| sku | varchar(30) | yes | FK ? portal.material |  |

### portal.stock_transfer


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| transfer_id | bigint | no | PK |  |
| transfer_no | varchar(20) | no |  |  |
| from_location | varchar(10) | no | FK ? portal.location |  |
| to_location | varchar(10) | no | FK ? portal.location |  |
| transfer_type | transfer_type | no |  |  |
| indent_id | varchar(20) | yes | FK ? portal.indent |  |
| requested_by | varchar(20) | yes | FK ? ref.staff_master |  |
| approved_by | varchar(20) | yes | FK ? ref.staff_master |  |
| request_date | date | no |  | CURRENT_DATE |
| dispatch_date | date | yes |  |  |
| receipt_date | date | yes |  |  |
| status | transfer_status | no |  | 'Requested'::portal.transfer_status |

### portal.stock_transfer_line


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| transfer_line_id | bigint | no | PK |  |
| transfer_id | bigint | no | FK ? portal.stock_transfer |  |
| sku | varchar(30) | no | FK ? portal.material |  |
| batch_id | bigint | yes | FK ? portal.batch |  |
| qty_requested | numeric(14,3) | no |  |  |
| qty_dispatched | numeric(14,3) | yes |  |  |
| qty_received | numeric(14,3) | yes |  |  |
| discrepancy_qty | numeric(14,3) | yes |  |  |
| remarks | text | yes |  |  |

### portal.sub_category


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| sub_category_id | integer | no | PK |  |
| category_code | varchar(10) | no | FK ? portal.category |  |
| name | varchar(80) | no |  |  |

### portal.tax_master


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| tax_id | varchar(20) | no | PK |  |
| tax_name | varchar(60) | no |  |  |
| tax_type | tax_type | no |  |  |
| rate_pct | numeric(5,2) | no |  |  |
| cgst_pct | numeric(5,2) | yes |  |  |
| sgst_pct | numeric(5,2) | yes |  |  |
| igst_pct | numeric(5,2) | yes |  |  |
| effective_from | date | no |  |  |
| effective_to | date | yes |  |  |
| gl_account_id | varchar(20) | yes | FK ? portal.gl_account |  |

### portal.transporter


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| transporter_id | varchar(20) | no | PK |  |
| transporter_name | varchar(120) | no |  |  |
| vendor_id | varchar(20) | yes | FK ? portal.vendor |  |
| contact | varchar(120) | yes |  |  |
| transport_mode | transport_mode | yes |  |  |
| status | active_status | no |  | 'Active'::shared.active_status |

### portal.unit_of_measure


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| uom | varchar(10) | no | PK |  |
| formal_name | varchar(40) | no |  |  |
| uqc | varchar(20) | yes |  |  |
| decimal_places | smallint | no |  | 0 |
| conversion_to_base | numeric(12,4) | yes |  |  |
| base_uom | varchar(10) | yes | FK ? portal.unit_of_measure |  |

### portal.user_role


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| user_id | integer | no | PK FK ? portal.app_user |  |
| role_code | varchar(30) | no | PK FK ? portal.role |  |
| scope_dept | varchar(20) | no | PK FK ? ref.department |  |
| granted_on | date | no |  | CURRENT_DATE |

### portal.vendor


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| vendor_id | varchar(20) | no | PK |  |
| name | varchar(160) | no |  |  |
| vendor_type | vendor_type | yes |  |  |
| city | varchar(80) | yes |  |  |
| address | text | yes |  |  |
| contact_person | varchar(120) | yes |  |  |
| phone | varchar(20) | yes |  |  |
| email | varchar(120) | yes |  |  |
| gstin | varchar(15) | yes |  |  |
| pan_no | varchar(10) | yes |  |  |
| bank_account_no | varchar(30) | yes |  |  |
| ifsc_code | varchar(11) | yes |  |  |
| payment_terms_days | smallint | yes |  |  |
| msme_registered | boolean | no |  | false |
| blacklist_flag | boolean | no |  | false |
| on_time_pct | numeric(5,2) | yes |  |  |
| quality_score | numeric(3,1) | yes |  |  |
| lead_days | smallint | yes |  |  |
| overall_rating | numeric(3,2) | yes |  |  |
| service_type | varchar(80) | yes |  |  |
| status | vendor_status | no |  | 'Active'::portal.vendor_status |

### portal.vendor_category


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| vendor_id | varchar(20) | no | PK FK ? portal.vendor |  |
| category_code | varchar(10) | no | PK FK ? portal.category |  |

### portal.vendor_evaluation


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| evaluation_id | bigint | no | PK |  |
| rfq_id | varchar(20) | no | FK ? portal.rfq_bid |  |
| vendor_id | varchar(20) | no | FK ? portal.rfq_bid |  |
| criteria_set_id | varchar(20) | no | FK ? portal.vendor_evaluation_criteria |  |
| criteria_id | varchar(20) | no | FK ? portal.vendor_evaluation_criteria |  |
| raw_value | varchar(60) | yes |  |  |
| score | numeric(5,2) | yes |  |  |
| weighted_score | numeric(7,3) | yes |  |  |
| evaluated_by | varchar(20) | yes | FK ? ref.staff_master |  |
| evaluation_date | date | yes |  |  |
| remarks | text | yes |  |  |

### portal.vendor_evaluation_criteria


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| criteria_set_id | varchar(20) | no | PK |  |
| criteria_id | varchar(20) | no | PK |  |
| criteria_name | varchar(60) | no |  |  |
| weightage_pct | numeric(5,2) | no |  |  |
| scoring_method | scoring_method | no |  |  |
| is_mandatory | boolean | no |  | false |

### portal.vendor_invoice


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| invoice_id | bigint | no | PK |  |
| invoice_no | varchar(60) | no |  |  |
| invoice_date | date | no |  |  |
| vendor_id | varchar(20) | no | FK ? portal.vendor |  |
| po_id | integer | yes | FK ? portal.purchase_order |  |
| grn_id | varchar(20) | yes | FK ? portal.grn |  |
| received_date | date | yes |  |  |
| basic_amount | numeric(16,2) | no |  |  |
| discount_amount | numeric(16,2) | no |  | 0 |
| cgst_amount | numeric(16,2) | no |  | 0 |
| sgst_amount | numeric(16,2) | no |  | 0 |
| igst_amount | numeric(16,2) | no |  | 0 |
| freight_amount | numeric(16,2) | no |  | 0 |
| other_charges | numeric(16,2) | no |  | 0 |
| invoice_total | numeric(16,2) | yes |  |  |
| tds_amount | numeric(16,2) | no |  | 0 |
| retention_amount | numeric(16,2) | no |  | 0 |
| advance_adjusted | numeric(16,2) | no |  | 0 |
| net_payable | numeric(16,2) | yes |  |  |
| due_date | date | yes |  |  |
| three_way_match_status | three_way_match | yes |  |  |
| verified_by | varchar(20) | yes | FK ? ref.staff_master |  |
| approved_by | varchar(20) | yes | FK ? ref.staff_master |  |
| doc_id | uuid | yes | FK ? shared.document |  |
| status | invoice_status | no |  | 'Received'::portal.invoice_status |

### portal.vendor_invoice_line


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| invoice_line_id | bigint | no | PK |  |
| invoice_id | bigint | no | FK ? portal.vendor_invoice |  |
| po_line_id | bigint | yes | FK ? portal.po_line |  |
| grn_id | varchar(20) | yes | FK ? portal.grn |  |
| sku | varchar(30) | no | FK ? portal.material |  |
| qty_invoiced | numeric(14,3) | no |  |  |
| qty_accepted | numeric(14,3) | yes |  |  |
| unit_price | numeric(14,2) | no |  |  |
| po_unit_price | numeric(14,2) | yes |  |  |
| price_variance | numeric(14,2) | yes |  |  |
| tax_pct | numeric(5,2) | no |  | 0 |
| line_total | numeric(16,2) | yes |  |  |
| gl_account_id | varchar(20) | yes | FK ? portal.gl_account |  |
| budget_code | varchar(30) | yes | FK ? portal.budget_head |  |

### portal.vendor_item


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| vendor_item_id | bigint | no | PK |  |
| vendor_id | varchar(20) | no | FK ? portal.vendor |  |
| sku | varchar(30) | no | FK ? portal.material |  |
| vendor_item_code | varchar(60) | yes |  |  |
| last_quoted_price | numeric(14,2) | yes |  |  |
| last_purchase_date | date | yes |  |  |
| min_order_qty | numeric(14,3) | yes |  |  |
| lead_time_days | integer | yes |  |  |
| is_preferred | boolean | no |  | false |

### portal.vendor_performance


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| perf_id | bigint | no | PK |  |
| vendor_id | varchar(20) | no | FK ? portal.vendor |  |
| po_id | integer | yes | FK ? portal.purchase_order |  |
| on_time_delivery | boolean | yes |  |  |
| delay_days | integer | yes |  |  |
| quality_score | numeric(3,1) | yes |  |  |
| rejection_pct | numeric(5,2) | yes |  |  |
| invoice_accuracy | boolean | yes |  |  |
| service_response_score | numeric(3,1) | yes |  |  |
| composite_score | numeric(4,2) | yes |  |  |
| recorded_by | varchar(20) | yes | FK ? ref.staff_master |  |
| recorded_date | date | no |  | CURRENT_DATE |

### portal.vendor_ranking


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| ranking_id | bigint | no | PK |  |
| rfq_id | varchar(20) | no | FK ? portal.rfq_bid |  |
| vendor_id | varchar(20) | no | FK ? portal.rfq_bid |  |
| total_weighted_score | numeric(8,3) | yes |  |  |
| rank | smallint | yes |  |  |
| technically_qualified | boolean | no |  | false |
| is_selected | boolean | no |  | false |
| selection_reason | text | yes |  |  |
| committee_approval_by | varchar(20) | yes | FK ? ref.staff_master |  |
| approval_date | date | yes |  |  |

### portal.vendor_tag


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| vendor_id | varchar(20) | no | PK FK ? portal.vendor |  |
| tag | varchar(40) | no | PK |  |

### shared.approval_rule
SH1 — which role must act at each level of each request type; approvers are found through hostel.staff_space_assignment, never stored on the student

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| rule_id | bigint | no | PK |  |
| request_type | request_type | no |  |  |
| level | smallint | no |  |  |
| approver_role | varchar(30) | no | FK ? portal.role |  |
| condition_key | varchar(40) | yes |  |  |
| condition_value | varchar(40) | yes |  |  |
| is_mandatory | boolean | no |  | true |
| sla_hours | integer | yes |  |  |
| status | active_status | no |  | 'Active'::shared.active_status |

### shared.approval_step


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| step_id | bigint | no | PK |  |
| request_type | request_type | no |  |  |
| request_id | bigint | no |  |  |
| level | smallint | no |  |  |
| rule_id | bigint | yes | FK ? shared.approval_rule |  |
| approver_role | varchar(30) | no | FK ? portal.role |  |
| acted_by | varchar(20) | yes | FK ? ref.staff_master |  |
| acted_by_contact | bigint | yes | FK ? hostel.student_contact |  |
| decision | decision | no |  | 'Pending'::shared.decision |
| decided_on | timestamptz | yes |  |  |
| remarks | text | yes |  |  |
| created_at | timestamptz | no |  | now() |

### shared.audit_log
Kept in monthly slices; rows can be added but never changed (hash chain)

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| audit_id | bigint | no | PK |  |
| occurred_at | timestamptz | no | PK | now() |
| kind | varchar(40) | no |  |  |
| outcome | varchar(60) | no |  |  |
| actor | varchar(40) | yes |  |  |
| role_code | varchar(30) | yes |  |  |
| table_name | varchar(80) | yes |  |  |
| row_key | varchar(80) | yes |  |  |
| detail | jsonb | yes |  |  |
| prev_hash | character | yes |  |  |
| hash | character | yes |  |  |


### shared.document


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| doc_id | uuid | no | PK | gen_random_uuid() |
| kind | document_kind | no |  |  |
| file_name | varchar(200) | no |  |  |
| object_key | varchar(300) | no |  |  |
| mime_type | varchar(80) | yes |  |  |
| size_bytes | bigint | yes |  |  |
| sha256 | character | yes |  |  |
| attached_to | varchar(40) | yes |  |  |
| attached_id | varchar(40) | yes |  |  |
| uploaded_by | varchar(20) | yes | FK ? ref.staff_master |  |
| uploaded_by_student | varchar(20) | yes | FK ? ref.student_master |  |
| uploaded_at | timestamptz | no |  | now() |

### shared.import_batch


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| batch_id | bigint | no | PK |  |
| source | import_source | no |  |  |
| file_name | varchar(200) | yes |  |  |
| received_at | timestamptz | no |  | now() |
| rows_total | integer | yes |  |  |
| rows_ok | integer | yes |  |  |
| rows_failed | integer | yes |  |  |
| status | import_status | no |  | 'Received'::shared.import_status |
| processed_by | varchar(20) | yes | FK ? ref.staff_master |  |
| error_report | text | yes |  |  |

### shared.notification


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| notification_id | bigint | no | PK |  |
| recipient_type | recipient_type | no |  |  |
| student_id | varchar(20) | yes | FK ? ref.student_master |  |
| contact_id | bigint | yes | FK ? hostel.student_contact |  |
| staff_id | varchar(20) | yes | FK ? ref.staff_master |  |
| channel | channel | no |  |  |
| template_code | varchar(40) | yes |  |  |
| subject | varchar(200) | yes |  |  |
| body | text | no |  |  |
| related_type | varchar(40) | yes |  |  |
| related_id | varchar(40) | yes |  |  |
| queued_at | timestamptz | no |  | now() |
| sent_at | timestamptz | yes |  |  |
| delivery_status | delivery_status | no |  | 'Queued'::shared.delivery_status |
| provider_ref | varchar(80) | yes |  |  |
| error_text | text | yes |  |  |

### shared.policy_setting
The portal's and the hostel's rules held as data, one value per cell

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| setting_key | varchar(60) | no | PK |  |
| module | varchar(20) | no |  | 'hostel'::character varying |
| amount | numeric(16,2) | yes |  |  |
| value_text | varchar(200) | yes |  |  |
| meaning | varchar(300) | no |  |  |
| updated_at | timestamptz | no |  | now() |
| updated_by | varchar(20) | yes | FK ? ref.staff_master |  |

### shared.report_visibility


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| report_code | varchar(40) | no | PK |  |
| role_code | varchar(30) | no | PK FK ? portal.role |  |
| scope | visibility_scope | no |  |  |
| status | active_status | no |  | 'Active'::shared.active_status |

### hostel.academic_year


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| academic_year | varchar(9) | no | PK |  |
| start_date | date | no |  |  |
| end_date | date | no |  |  |
| is_current | boolean | no |  | false |

### hostel.capture_point


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| point_id | bigint | no | PK |  |
| point_name | varchar(120) | no |  |  |
| point_type | point_type | no |  |  |
| facility_id | varchar(30) | no | FK ? infra.facility |  |
| zone_id | varchar(30) | yes | FK ? infra.zone |  |
| space_id | varchar(30) | yes | FK ? infra.space |  |
| device_type | device_type | no |  |  |
| device_ref | varchar(80) | yes |  |  |
| status | device_status | no |  | 'Active'::hostel.device_status |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.discipline_case
M1 STUB — complete from Workflow M pages

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| case_id | bigint | no | PK |  |
| student_id | varchar(20) | no | FK ? ref.student_master |  |
| incident_on | timestamptz | no |  |  |
| description | text | no |  |  |
| reported_by | varchar(20) | yes | FK ? ref.staff_master |  |
| status | varchar(20) | no |  | 'Open'::character varying |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.discipline_punishment


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| punishment_id | bigint | no | PK |  |
| case_id | bigint | no | FK ? hostel.discipline_case |  |
| student_id | varchar(20) | no | FK ? ref.student_master |  |
| punishment_type | punishment_type | no |  |  |
| bars_outings | boolean | no |  | false |
| from_date | date | no |  |  |
| to_date | date | yes |  |  |
| fine_amount | numeric(12,2) | yes |  |  |
| awarded_by | varchar(20) | yes | FK ? ref.staff_master |  |
| status | punishment_status | no |  | 'In_Force'::hostel.punishment_status |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.doc_counter


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| prefix | varchar(5) | no | PK |  |
| year | smallint | no | PK |  |
| last_seq | integer | no |  | 0 |

### hostel.electricity_tariff


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| tariff_id | bigint | no | PK |  |
| room_type_id | smallint | no | FK ? hostel.room_type |  |
| included_units_per_month | numeric(10,2) | no |  |  |
| rate_per_unit | numeric(8,2) | no |  |  |
| effective_from | date | no |  |  |
| effective_to | date | yes |  |  |
| approved_by | varchar(20) | yes | FK ? ref.staff_master |  |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.fee_demand


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| demand_id | bigint | no | PK |  |
| student_id | varchar(20) | no | FK ? ref.student_master |  |
| fee_plan_id | bigint | yes | FK ? hostel.fee_plan |  |
| fee_head | fee_head | no |  |  |
| instalment_no | smallint | no |  | 1 |
| amount_due | numeric(12,2) | no |  |  |
| due_date | date | no |  |  |
| amount_paid | numeric(12,2) | no |  | 0 |
| status | demand_status | no |  | 'Pending'::hostel.demand_status |
| reference_type | varchar(30) | yes |  |  |
| reference_id | bigint | yes |  |  |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.fee_plan


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| fee_plan_id | bigint | no | PK |  |
| registration_id | bigint | no | FK ? hostel.hostel_registration |  |
| plan_type | plan_type | no |  |  |
| fee_id | bigint | no | FK ? hostel.room_type_fee |  |
| created_on | timestamptz | no |  | now() |
| status | plan_status | no |  | 'Open'::hostel.plan_status |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.fee_receipt


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| receipt_id | bigint | no | PK |  |
| receipt_no | varchar(20) | yes |  |  |
| demand_id | bigint | no | FK ? hostel.fee_demand |  |
| amount | numeric(12,2) | no |  |  |
| paid_on | timestamptz | no |  | now() |
| payment_mode | payment_mode | no |  |  |
| gateway_ref | varchar(80) | yes |  |  |
| gateway_status | gateway_status | no |  | 'Pending'::hostel.gateway_status |
| is_refundable | boolean | no |  | true |
| collected_by | varchar(20) | yes | FK ? ref.staff_master |  |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |

### hostel.hostel_alert


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| alert_id | bigint | no | PK |  |
| alert_type | alert_type | no |  |  |
| student_id | varchar(20) | yes | FK ? ref.student_master |  |
| facility_id | varchar(30) | no | FK ? hostel.hostel_profile |  |
| related_type | varchar(40) | yes |  |  |
| related_id | bigint | yes |  |  |
| raised_at | timestamptz | no |  | now() |
| severity | severity | no |  | 'Warning'::hostel.severity |
| assigned_to | varchar(20) | yes | FK ? ref.staff_master |  |
| parent_informed | boolean | no |  | false |
| acknowledged_at | timestamptz | yes |  |  |
| action_taken | text | yes |  |  |
| status | alert_status | no |  | 'Open'::hostel.alert_status |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.hostel_allocation


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| hostel_alloc_id | bigint | no | PK |  |
| occupant_type | occupant_type | no |  | 'Student'::hostel.occupant_type |
| student_id | varchar(20) | yes | FK ? ref.student_master |  |
| staff_id | varchar(20) | yes | FK ? ref.staff_master |  |
| subspace_id | varchar(30) | no | FK ? infra.subspace |  |
| offer_id | bigint | yes | FK ? hostel.room_offer |  |
| academic_year | varchar(9) | no | FK ? hostel.academic_year |  |
| allocation_date | date | no |  | CURRENT_DATE |
| vacate_date | date | yes |  |  |
| key_no | varchar(20) | no |  |  |
| checked_in_by | varchar(20) | no | FK ? ref.staff_master |  |
| approved_by | varchar(20) | yes | FK ? ref.staff_master |  |
| status | allocation_status | no |  | 'Active'::hostel.allocation_status |
| remarks | text | yes |  |  |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.hostel_profile


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| facility_id | varchar(30) | no | PK FK ? infra.facility |  |
| hostel_code | varchar(10) | no |  |  |
| hostel_gender | hostel_gender | no |  |  |
| default_mess_id | bigint | yes | FK ? hostel.mess_master |  |
| sub_store_code | varchar(10) | yes | FK ? portal.location |  |
| dept_code | varchar(20) | no | FK ? ref.department |  |
| gate_close_time | time without time zone | no |  | '21:30:00'::time without time zone |
| status | hostel_status | no |  | 'Active'::hostel.hostel_status |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.hostel_registration


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| registration_id | bigint | no | PK |  |
| registration_no | varchar(20) | yes |  |  |
| student_id | varchar(20) | no | FK ? ref.student_master |  |
| academic_year | varchar(9) | no | FK ? hostel.academic_year |  |
| facility_id | varchar(30) | no | FK ? hostel.hostel_profile |  |
| room_type_id | smallint | no | FK ? hostel.room_type |  |
| applied_on | timestamptz | no |  | now() |
| reg_demand_id | bigint | yes | FK ? hostel.fee_demand |  |
| rules_accepted | boolean | no |  | false |
| waitlist_no | integer | yes |  |  |
| status | registration_status | no |  | 'Applied'::hostel.registration_status |
| remarks | text | yes |  |  |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.location_access_log


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| log_id | bigint | no | PK |  |
| viewer_staff_id | varchar(20) | no | FK ? ref.staff_master |  |
| student_id | varchar(20) | no | FK ? ref.student_master |  |
| viewed_at | timestamptz | no |  | now() |
| purpose | access_purpose | no |  |  |
| alert_id | bigint | yes | FK ? hostel.hostel_alert |  |

### hostel.mess_master
G1 STUB — complete from Workflow G pages

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| mess_id | bigint | no | PK |  |
| mess_name | varchar(80) | no |  |  |
| facility_id | varchar(30) | yes | FK ? infra.facility |  |
| space_id | varchar(30) | yes | FK ? infra.space |  |
| incharge_id | varchar(20) | yes | FK ? ref.staff_master |  |
| capacity | integer | yes |  |  |
| status | active_status | no |  | 'Active'::shared.active_status |

### hostel.mess_subscription
G2 STUB — Workflow A writes it when the student chooses cuisine; Workflow F reads it for the room meal

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| subscription_id | bigint | no | PK |  |
| student_id | varchar(20) | no | FK ? ref.student_master |  |
| mess_id | bigint | no | FK ? hostel.mess_master |  |
| academic_year | varchar(9) | no | FK ? hostel.academic_year |  |
| cuisine | cuisine | no |  |  |
| mess_demand_id | bigint | yes | FK ? hostel.fee_demand |  |
| from_date | date | no |  | CURRENT_DATE |
| to_date | date | yes |  |  |
| status | subscription_status | no |  | 'Active'::hostel.subscription_status |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.meter_monthly_usage


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| meter_id | bigint | no | PK FK ? hostel.room_meter |  |
| usage_month | date | no | PK |  |
| opening_reading | numeric(12,2) | no |  |  |
| closing_reading | numeric(12,2) | no |  |  |
| units_used | numeric(12,2) | yes |  |  |
| included_units | numeric(10,2) | no |  |  |
| recharged_units | numeric(10,2) | no |  | 0 |
| excess_units | numeric(12,2) | yes |  |  |
| computed_at | timestamptz | no |  | now() |

### hostel.meter_reading


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| reading_id | bigint | no | PK |  |
| meter_id | bigint | no | FK ? hostel.room_meter |  |
| reading_at | timestamptz | no |  | now() |
| reading_kwh | numeric(12,2) | no |  |  |
| source | reading_source | no |  |  |
| read_by | varchar(20) | yes | FK ? ref.staff_master |  |
| handover_id | bigint | yes | FK ? hostel.room_handover |  |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |

### hostel.meter_recharge


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| recharge_id | bigint | no | PK |  |
| meter_id | bigint | no | FK ? hostel.room_meter |  |
| student_id | varchar(20) | no | FK ? ref.student_master |  |
| receipt_id | bigint | no | FK ? hostel.fee_receipt |  |
| units_credited | numeric(10,2) | no |  |  |
| pushed_to_meter | boolean | no |  | false |
| push_ref | varchar(80) | yes |  |  |
| push_attempts | smallint | no |  | 0 |
| status | recharge_status | no |  | 'Paid'::hostel.recharge_status |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.meter_student_map


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| map_id | bigint | no | PK |  |
| meter_id | bigint | no | FK ? hostel.room_meter |  |
| hostel_alloc_id | bigint | no | FK ? hostel.hostel_allocation |  |
| from_datetime | timestamptz | no |  | now() |
| to_datetime | timestamptz | yes |  |  |
| share_pct | numeric(5,2) | no |  | 100 |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.movement_event
D3 — rows can be added but not changed; a scheduled job drops partitions older than policy_setting.movement_retention_days

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| event_id | bigint | no | PK |  |
| student_id | varchar(20) | no | FK ? ref.student_master |  |
| point_id | bigint | no | FK ? hostel.capture_point |  |
| direction | direction | no |  |  |
| event_at | timestamptz | no | PK | now() |
| source | event_source | no |  |  |
| match_confidence | numeric(5,2) | yes |  |  |
| outpass_id | bigint | yes | FK ? hostel.outpass |  |
| recorded_by | varchar(20) | yes | FK ? ref.staff_master |  |


### hostel.no_dues_clearance
N2 STUB — Workflow C writes the Electricity section at the final reading

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| clearance_id | bigint | no | PK |  |
| vacate_id | bigint | no | FK ? hostel.vacate_request |  |
| section | clearance_section | no |  |  |
| dues_amount | numeric(12,2) | no |  | 0 |
| demand_id | bigint | yes | FK ? hostel.fee_demand |  |
| cleared_by | varchar(20) | yes | FK ? ref.staff_master |  |
| cleared_on | timestamptz | yes |  |  |
| remarks | text | yes |  |  |
| status | clearance_status | no |  | 'Pending'::hostel.clearance_status |

### hostel.outpass


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| outpass_id | bigint | no | PK |  |
| outpass_no | varchar(20) | yes |  |  |
| student_id | varchar(20) | no | FK ? ref.student_master |  |
| reason | text | no |  |  |
| destination | varchar(200) | no |  |  |
| leave_from | timestamptz | no |  |  |
| return_by | timestamptz | no |  |  |
| outing_category | outing_category | no |  |  |
| levels_required | smallint | no |  |  |
| contact_during_leave | varchar(15) | no |  |  |
| applied_on | timestamptz | no |  | now() |
| qr_token | varchar(64) | yes |  |  |
| actual_out_event_id | bigint | yes |  |  |
| actual_in_event_id | bigint | yes |  |  |
| actual_out_at | timestamptz | yes |  |  |
| actual_in_at | timestamptz | yes |  |  |
| late_by_minutes | integer | yes |  |  |
| status | outpass_status | no |  | 'Applied'::hostel.outpass_status |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.room_handover


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| handover_id | bigint | no | PK |  |
| hostel_alloc_id | bigint | no | FK ? hostel.hostel_allocation |  |
| vacate_id | bigint | yes | FK ? hostel.vacate_request |  |
| handover_type | handover_type | no |  |  |
| handover_on | timestamptz | no |  | now() |
| meter_reading | numeric(12,2) | no |  |  |
| key_returned | boolean | yes |  |  |
| done_by | varchar(20) | no | FK ? ref.staff_master |  |
| occupant_acknowledged | boolean | no |  | false |
| total_damage_amount | numeric(12,2) | no |  | 0 |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.room_handover_line


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| handover_id | bigint | no | PK FK ? hostel.room_handover |  |
| line_no | smallint | no | PK |  |
| asset_id | varchar(40) | no | FK ? infra.asset_master |  |
| condition | item_condition | no |  |  |
| damage_amount | numeric(12,2) | no |  | 0 |
| remarks | text | yes |  |  |

### hostel.room_meter


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| meter_id | bigint | no | PK |  |
| space_id | varchar(30) | no | FK ? infra.space |  |
| meter_no | varchar(40) | no |  |  |
| meter_type | meter_type | no |  |  |
| device_ref | varchar(80) | yes |  |  |
| installed_on | date | no |  |  |
| asset_id | varchar(40) | yes | FK ? infra.asset_master |  |
| status | meter_status | no |  | 'Active'::hostel.meter_status |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.room_offer


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| offer_id | bigint | no | PK |  |
| registration_id | bigint | no | FK ? hostel.hostel_registration |  |
| subspace_id | varchar(30) | no | FK ? infra.subspace |  |
| offer_no | smallint | no |  |  |
| offered_on | timestamptz | no |  | now() |
| hold_until | timestamptz | no |  |  |
| offered_by | varchar(20) | yes | FK ? ref.staff_master |  |
| student_decision | student_decision | no |  | 'Pending'::hostel.student_decision |
| decision_on | timestamptz | yes |  |  |
| decline_reason | text | yes |  |  |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.room_profile


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| space_id | varchar(30) | no | PK FK ? infra.space |  |
| room_type_id | smallint | no | FK ? hostel.room_type |  |
| reserved_for | reserved_for | no |  | 'None'::hostel.reserved_for |
| is_accessible | boolean | no |  | false |
| nearest_point_id | bigint | yes | FK ? hostel.capture_point |  |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.room_standard_inventory


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| room_type_id | smallint | no | PK FK ? hostel.room_type |  |
| sku | varchar(30) | no | PK FK ? portal.material |  |
| qty_per_room | smallint | no |  | 1 |

### hostel.room_type


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| room_type_id | smallint | no | PK |  |
| type_name | varchar(60) | no |  |  |
| sharing_count | smallint | no |  |  |
| is_ac | boolean | no |  | false |
| attached_bath | boolean | no |  | false |
| status | active_status | no |  | 'Active'::shared.active_status |

### hostel.room_type_fee


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| fee_id | bigint | no | PK |  |
| room_type_id | smallint | no | FK ? hostel.room_type |  |
| facility_id | varchar(30) | no | FK ? hostel.hostel_profile |  |
| academic_year | varchar(9) | no | FK ? hostel.academic_year |  |
| registration_fee | numeric(12,2) | no |  |  |
| hostel_fee | numeric(12,2) | no |  |  |
| instalment_1_pct | numeric(5,2) | no |  | 50 |
| instalment_2_due_date | date | no |  |  |

### hostel.sick_leave


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| sick_leave_id | bigint | no | PK |  |
| student_id | varchar(20) | no | FK ? ref.student_master |  |
| illness_details | text | no |  |  |
| from_date | date | no |  |  |
| to_date | date | no |  |  |
| applied_on | timestamptz | no |  | now() |
| medical_doc_id | uuid | yes | FK ? shared.document |  |
| visited_by | varchar(20) | yes | FK ? ref.staff_master |  |
| visited_at | timestamptz | yes |  |  |
| visit_remarks | text | yes |  |  |
| room_meals_required | boolean | no |  | false |
| extended_from_id | bigint | yes | FK ? hostel.sick_leave |  |
| approved_by | varchar(20) | yes | FK ? ref.staff_master |  |
| closed_on | date | yes |  |  |
| status | sick_leave_status | no |  | 'Applied'::hostel.sick_leave_status |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.sick_meal_delivery


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| sick_leave_id | bigint | no | PK FK ? hostel.sick_leave |  |
| meal_date | date | no | PK |  |
| slot | meal_slot | no | PK |  |
| delivered_by | varchar(20) | yes | FK ? ref.staff_master |  |
| delivered_at | timestamptz | yes |  |  |
| status | delivery_status | no |  | 'Pending'::hostel.delivery_status |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.space_qr


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| qr_id | bigint | no | PK |  |
| space_id | varchar(30) | no | FK ? infra.space |  |
| qr_token | varchar(64) | no |  | encode(gen_random_bytes(24), 'hex'::text |
| generated_on | timestamptz | no |  | now() |
| printed_on | timestamptz | yes |  |  |
| status | qr_status | no |  | 'Active'::hostel.qr_status |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.staff_space_assignment
B1 — Level 1 and Level 2 approvers are found by looking up this table for the student's floor and hostel; no approver name is stored on the student

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| assignment_id | bigint | no | PK |  |
| staff_id | varchar(20) | no | FK ? ref.staff_master |  |
| hostel_role | varchar(30) | no | FK ? portal.role |  |
| facility_id | varchar(30) | no | FK ? hostel.hostel_profile |  |
| zone_id | varchar(30) | yes | FK ? infra.zone |  |
| space_id | varchar(30) | yes | FK ? infra.space |  |
| shift | shift | no |  | 'General'::hostel.shift |
| from_date | date | no |  | CURRENT_DATE |
| to_date | date | yes |  |  |
| show_on_qr | boolean | no |  | false |
| status | assignment_status | no |  | 'Active'::hostel.assignment_status |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.student_contact
MS2 — parsed from the ERP "Contact No" column (mobile:father-94406..|mobile:self-..); parent consent and outpass recommendation use the verified approver row

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| contact_id | bigint | no | PK |  |
| student_id | varchar(20) | no | FK ? ref.student_master |  |
| relation | contact_relation | no |  |  |
| contact_name | varchar(120) | no |  |  |
| mobile_no | varchar(10) | no |  |  |
| is_verified | boolean | no |  | false |
| verified_on | timestamptz | yes |  |  |
| is_outpass_approver | boolean | no |  | false |
| status | active_status | no |  | 'Active'::shared.active_status |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.student_current_status


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| student_id | varchar(20) | no | PK FK ? ref.student_master |  |
| current_status | current_status | no |  | 'Not_Seen'::hostel.current_status |
| last_event_id | bigint | yes |  |  |
| last_event_at | timestamptz | yes |  |  |
| updated_at | timestamptz | no |  | now() |

### hostel.tracking_consent


| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| consent_id | bigint | no | PK |  |
| student_id | varchar(20) | no | FK ? ref.student_master |  |
| given_by | consent_given_by | no |  |  |
| contact_id | bigint | yes | FK ? hostel.student_contact |  |
| policy_version | varchar(20) | no |  |  |
| given_on | timestamptz | no |  | now() |
| withdrawn_on | timestamptz | yes |  |  |
| recorded_by | varchar(20) | yes | FK ? ref.staff_master |  |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

### hostel.vacate_request
N1 STUB — approvals in shared.approval_step (request_type = Vacate); complete from Workflow N pages

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| vacate_id | bigint | no | PK |  |
| student_id | varchar(20) | no | FK ? ref.student_master |  |
| hostel_alloc_id | bigint | yes | FK ? hostel.hostel_allocation |  |
| reason | vacate_reason | no |  |  |
| reason_detail | text | yes |  |  |
| proof_doc_id | uuid | yes | FK ? shared.document |  |
| planned_date | date | no |  |  |
| applied_on | timestamptz | no |  | now() |
| levels_required | smallint | no |  | 4 |
| status | vacate_status | no |  | 'Applied'::hostel.vacate_status |
| created_at | timestamptz | no |  | now() |
| created_by | varchar(20) | yes |  |  |
| updated_at | timestamptz | yes |  |  |
| updated_by | varchar(20) | yes |  |  |

