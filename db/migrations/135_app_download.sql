-- 135: count the student app downloads from the /app page. One row per tap on "Download for Android".
-- No IP address or name is kept: device_hash is a one-way hash of the address and browser, so repeat taps
-- from the same phone can be counted once.
create table if not exists shared.app_download (
  download_id   bigint generated always as identity primary key,
  file          varchar(60)  not null,
  downloaded_at timestamptz  not null default now(),
  device_hash   char(64)     not null,
  device        varchar(40),          -- Android, iPhone, Windows ... from the browser
  referrer      varchar(120)
);
create index if not exists ix_app_download_at on shared.app_download (downloaded_at);
comment on table shared.app_download is 'Taps on the app download button (/app); device_hash is a salted one-way hash, never the address itself.';
