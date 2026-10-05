-- =====================================================================
-- 053  hostel — Workflow C: Electricity meter
--      Meter fixed to room > Mapped at check-in > Readings > Limit reached > Online recharge > Final reading
--      Tables C1 Room_Meter, C2 Electricity_Tariff, C3 Meter_Student_Map, C4 Meter_Reading,
--             C5 Meter_Recharge, C6 Meter_Monthly_Usage
-- =====================================================================

CREATE TYPE hostel.meter_type      AS ENUM ('Smart_Prepaid','Manual');
CREATE TYPE hostel.meter_status    AS ENUM ('Active','Faulty','Replaced');
CREATE TYPE hostel.reading_source  AS ENUM ('Auto','Manual','Handover');
CREATE TYPE hostel.recharge_status AS ENUM ('Paid','Credited','Failed','Refunded');

-- ---------- C1 Room_Meter: electricity meter (one Active per room) ----------
CREATE TABLE hostel.room_meter (
  meter_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  space_id     varchar(30) NOT NULL REFERENCES infra.space,  -- room; one meter per room
  meter_no     varchar(40) NOT NULL UNIQUE,                  -- number printed on the meter
  meter_type   hostel.meter_type NOT NULL,
  device_ref   varchar(80),                                  -- identifier used to send a recharge to the meter (required if smart)
  installed_on date NOT NULL,
  asset_id     varchar(40) REFERENCES infra.asset_master,    -- the meter as an asset, if tagged
  status       hostel.meter_status NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20),
  CHECK (meter_type <> 'Smart_Prepaid' OR device_ref IS NOT NULL)
);
CREATE UNIQUE INDEX ux_room_meter_active ON hostel.room_meter (space_id) WHERE status = 'Active';   -- rule: one Active meter per room

-- ---------- C2 Electricity_Tariff: rate for a room type for a period ----------
CREATE TABLE hostel.electricity_tariff (
  tariff_id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room_type_id             smallint NOT NULL REFERENCES hostel.room_type,   -- AC and non-AC rooms can differ
  included_units_per_month numeric(10,2) NOT NULL,           -- units covered by the hostel fee, per room
  rate_per_unit            numeric(8,2) NOT NULL,            -- price of each extra unit
  effective_from           date NOT NULL,
  effective_to             date,                             -- empty while current
  approved_by              varchar(20) REFERENCES ref.staff_master,   -- Pro-VC Finance
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20),
  EXCLUDE USING gist (room_type_id WITH =, daterange(effective_from, coalesce(effective_to, 'infinity'::date), '[]') WITH &&)   -- rates over time; one current
);

-- ---------- C3 Meter_Student_Map: student linked to a meter for a period (opened/closed by check-in/check-out) ----------
CREATE TABLE hostel.meter_student_map (
  map_id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  meter_id        bigint NOT NULL REFERENCES hostel.room_meter,
  hostel_alloc_id bigint NOT NULL UNIQUE REFERENCES hostel.hostel_allocation,   -- the stay that created the link; gives the student
  from_datetime   timestamptz NOT NULL DEFAULT now(),        -- check-in time
  to_datetime     timestamptz,                               -- check-out or transfer time
  share_pct       numeric(5,2) NOT NULL DEFAULT 100 CHECK (share_pct > 0 AND share_pct <= 100),   -- share of the room's excess, for shared rooms
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20),
  CHECK (to_datetime IS NULL OR to_datetime >= from_datetime)
);
CREATE INDEX ix_meter_map_open ON hostel.meter_student_map (meter_id) WHERE to_datetime IS NULL;

-- ---------- C4 Meter_Reading ----------
CREATE TABLE hostel.meter_reading (
  reading_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  meter_id    bigint NOT NULL REFERENCES hostel.room_meter,
  reading_at  timestamptz NOT NULL DEFAULT now(),
  reading_kwh numeric(12,2) NOT NULL CHECK (reading_kwh >= 0),
  source      hostel.reading_source NOT NULL,
  read_by     varchar(20) REFERENCES ref.staff_master,       -- required if manual
  handover_id bigint REFERENCES hostel.room_handover,        -- when source = Handover
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20),
  CHECK (source <> 'Manual' OR read_by IS NOT NULL),
  UNIQUE (meter_id, reading_at)
);
CREATE INDEX ix_meter_reading_latest ON hostel.meter_reading (meter_id, reading_at DESC);

-- ---------- C5 Meter_Recharge: online top-up by a student ----------
CREATE TABLE hostel.meter_recharge (
  recharge_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  meter_id        bigint NOT NULL REFERENCES hostel.room_meter,
  student_id      varchar(20) NOT NULL REFERENCES ref.student_master,
  receipt_id      bigint NOT NULL UNIQUE REFERENCES hostel.fee_receipt,   -- a recharge exists only for a successful payment
  units_credited  numeric(10,2) NOT NULL,                    -- Derived: amount divided by the rate (set by trigger)
  pushed_to_meter boolean NOT NULL DEFAULT false,            -- Yes when the meter confirms
  push_ref        varchar(80),                               -- confirmation from the meter system
  push_attempts   smallint NOT NULL DEFAULT 0,
  status          hostel.recharge_status NOT NULL DEFAULT 'Paid',
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20)
);

-- ---------- C6 Meter_Monthly_Usage: produced by the system for reports ----------
CREATE TABLE hostel.meter_monthly_usage (
  meter_id        bigint NOT NULL REFERENCES hostel.room_meter,
  usage_month     date NOT NULL,                             -- first day of the month
  opening_reading numeric(12,2) NOT NULL,
  closing_reading numeric(12,2) NOT NULL,
  units_used      numeric(12,2) GENERATED ALWAYS AS (closing_reading - opening_reading) STORED,
  included_units  numeric(10,2) NOT NULL,                    -- from the tariff
  recharged_units numeric(10,2) NOT NULL DEFAULT 0,          -- sum of recharges in the month
  excess_units    numeric(12,2) GENERATED ALWAYS AS (greatest(closing_reading - opening_reading - included_units, 0)) STORED,
  computed_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (meter_id, usage_month),
  CHECK (closing_reading >= opening_reading)
);
