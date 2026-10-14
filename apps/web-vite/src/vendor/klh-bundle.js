// ESM wrapper around the KLH design-system bundle (project/components/bundle.js). Do not edit by hand; re-run scripts/sync-klh.mjs.
import * as __React from 'react';
const __out = {};
/* @ds-bundle: {"format":4,"namespace":"KLH","components":[{"name":"Button"},{"name":"StatusChip"},{"name":"Icon"},{"name":"IconTile"},{"name":"Card"},{"name":"StatCard"},{"name":"HeroHeader"},{"name":"QuickAction"},{"name":"ModuleLauncher"},{"name":"Field"},{"name":"Checkbox"},{"name":"RadioGroup"},{"name":"Switch"},{"name":"SegmentedControl"},{"name":"Tabs"},{"name":"Slider"},{"name":"DatePicker"},{"name":"FileUpload"},{"name":"OtpInput"},{"name":"FilterChip"},{"name":"Rating"},{"name":"Avatar"},{"name":"Tooltip"},{"name":"Menu"},{"name":"Accordion"},{"name":"Notice"},{"name":"DataTable"},{"name":"Skeleton"},{"name":"EmptyState"},{"name":"Drawer"},{"name":"ConfirmDialog"},{"name":"Toast"},{"name":"Stepper"},{"name":"ApprovalTrail"},{"name":"Timeline"},{"name":"NotificationItem"},{"name":"Money"},{"name":"Countdown"},{"name":"UsageMeter"},{"name":"ProgressRing"},{"name":"Sparkline"},{"name":"BarChart"},{"name":"AreaChart"},{"name":"DonutChart"},{"name":"PassCard"},{"name":"BedMap"},{"name":"AppShell"},{"name":"BottomNav"},{"name":"KioskPanel"}]} */
(function () {
  var React = __React;
  var h = React.createElement, useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo, useRef = React.useRef;
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }

  /* ---------- formatting ---------- */
  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function toDate(d) { return d instanceof Date ? d : new Date(d); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function formatDate(d) { d = toDate(d); return pad(d.getDate()) + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); }
  function formatTime(d) { d = toDate(d); var hr = d.getHours(), m = d.getMinutes(); var ap = hr >= 12 ? 'pm' : 'am'; hr = hr % 12 || 12; return hr + ':' + pad(m) + ' ' + ap; }
  function formatDateTime(d) { return formatDate(d) + ', ' + formatTime(d); }
  function formatINR(n, opts) {
    opts = opts || {};
    var f = new Intl.NumberFormat('en-IN', { minimumFractionDigits: opts.paise === false ? 0 : 2, maximumFractionDigits: opts.paise === false ? 0 : 2 });
    return '₹' + f.format(n);
  }

  /* ---------- status tones ---------- */
  var TONES = {
    success: ['Active','Confirmed','Checked_In','Accepted','Paid','Credited','Approved','Vacant','In_Room','In_Hostel','Returned','Delivered','Good','Verified','Success'],
    progress: ['Fee_Paid','Allotted','Parent_Recommended','L1_Approved','L2_Approved','Recommended','Occupied','Day_Or_More'],
    info: ['Applied','Out','On_Campus','Outside_On_Pass','Transferred','Acknowledged','Auto','Handover','Info','Same_Day','Scan','Camera'],
    warning: ['Pending','Waitlisted','Held','Part_Paid','On_Sick_Leave','Not_Seen','Open','Fair','Warning'],
    critical: ['Overdue','Rejected','Failed','Faulty','Suspended','Outside_No_Pass','Missed','Damaged','Missing','Expired','Critical'],
    neutral: ['Cancelled','Vacated','Declined','Waived','Closed','Ended','Replaced','Alumni','Refunded','Not_Required','Manual','Under Maintenance','Under_Maintenance','In']
  };
  var STATUS_TONES = {};
  Object.keys(TONES).forEach(function (t) { TONES[t].forEach(function (v) { STATUS_TONES[v] = t; }); });
  function toneOf(status) { return STATUS_TONES[status] || 'neutral'; }
  function statusLabel(status) { return String(status).replace(/_/g, ' '); }

  /* ---------- Icon ---------- */
  var PATHS = {
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3',
    bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
    download: 'M12 3v12M7 10l5 5 5-5M5 21h14',
    check: 'M5 12l5 5L20 7',
    x: 'M6 6l12 12M18 6L6 18',
    alert: 'M12 3l10 18H2L12 3zM12 10v4M12 17.5v.01',
    info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5v.01',
    lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
    'chevron-right': 'M9 6l6 6-6 6',
    'chevron-down': 'M6 9l6 6 6-6',
    'chevron-left': 'M15 6l-6 6 6 6',
    sort: 'M8 9l4-4 4 4M8 15l4 4 4-4',
    home: 'M3 11l9-8 9 8M5 10v10h14V10',
    filter: 'M3 5h18l-7 8v6l-4 2v-8z',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
    user: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21a8 8 0 0 1 16 0',
    wallet: 'M3 7h18v13H3zM3 7l3-4h12l3 4M16 13.5h2',
    bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
    door: 'M5 21V3h11v18M16 5h3v16M12 12v.01',
    plus: 'M12 5v14M5 12h14',
    inbox: 'M3 13l3-9h12l3 9v7H3zM3 13h5l1 3h6l1-3h5',
    calendar: 'M4 5h16v16H4zM4 10h16M8 3v4M16 3v4',
    upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
    file: 'M6 3h8l4 4v14H6zM14 3v4h4',
    more: 'M11 5a1 1 0 1 0 2 0 1 1 0 0 0-2 0M11 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0M11 19a1 1 0 1 0 2 0 1 1 0 0 0-2 0',
    settings: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M14 4v4M8 10v4M16 16v4',
    logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
    login: 'M10 4H6v16h4M14 8l4 4-4 4M18 12H8',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
    pin: 'M12 21s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12zM12 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
    utensils: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2-3 5v5h3v8',
    heart: 'M12 20s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.2-8 11-8 11zM8 11h2l1-2 2 4 1-2h2',
    qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2',
    'trend-up': 'M3 17l6-6 4 4 8-8M15 7h6v6',
    'trend-down': 'M3 7l6 6 4-4 8 8M15 17h6v-6',
    'arrow-right': 'M5 12h14M13 6l6 6-6 6',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
    trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14',
    users: 'M9 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M18 14a6 6 0 0 1 4 7',
    building: 'M4 21V4h11v17M15 9h5v12M8 8h3M8 12h3M8 16h3M3 21h18',
    bed: 'M3 19V6M3 13h18v6M21 13a3 3 0 0 0-3-3h-7v3M7 9.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
    key: 'M7.5 10.5a4.5 4.5 0 1 0 0 .01M11.5 12H21v3M17 12v3',
    receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
    phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
    mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
    gauge: 'M4 18a8 8 0 1 1 16 0M12 18l4-6',
    sparkle: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z'
  };
  function Icon(p) {
    return h('svg', { className: cx('klh-icon', p.className), viewBox: '0 0 24 24', 'aria-hidden': p.label ? undefined : 'true', role: p.label ? 'img' : undefined, 'aria-label': p.label, style: p.size ? { width: p.size, height: p.size } : undefined },
      h('path', { d: PATHS[p.name] || PATHS.info }));
  }

  /* ---------- Button ---------- */
  var reasonSeq = 0;
  function Button(p) {
    var idRef = useRef(null); if (!idRef.current) idRef.current = 'klh-r' + (++reasonSeq);
    var variant = p.variant || 'secondary', size = p.size || 'md';
    var blocked = !!p.blockedReason;
    var btn = h('button', {
      type: p.type || 'button', className: cx('klh-btn klh-focus', 'klh-btn-' + variant, size !== 'md' && 'klh-btn-' + size, p.block && 'klh-btn-block', p.pill && 'klh-btn-pill', p.iconOnly && 'klh-btn-icononly', p.className),
      disabled: p.disabled || blocked || p.loading, onClick: p.onClick, 'aria-describedby': blocked ? idRef.current : undefined, 'aria-busy': p.loading || undefined, 'aria-label': p['aria-label'] || (p.iconOnly && typeof p.children === 'string' ? p.children : undefined)
    }, p.loading ? h('span', { className: 'klh-spin', 'aria-hidden': 'true' }) : (p.icon ? h(Icon, { name: p.icon }) : null), p.iconOnly ? null : p.children, p.iconRight ? h(Icon, { name: p.iconRight }) : null);
    if (!blocked) return btn;
    return h('div', { style: { display: p.block ? 'block' : 'inline-block' } }, btn,
      h('div', { id: idRef.current, className: 'klh-btn-reason' }, h(Icon, { name: 'lock', size: 14 }), h('span', null, p.blockedReason)));
  }

  /* ---------- StatusChip ---------- */
  function StatusChip(p) {
    var tone = p.tone || toneOf(p.status);
    return h('span', { className: cx('klh-chip', 'klh-tone-' + tone, p.className), 'data-status': p.status }, p.label || statusLabel(p.status));
  }

  /* ---------- IconTile / Card / StatCard ---------- */
  function IconTile(p) { return h('span', { className: cx('klh-tile', 'klh-tile-' + (p.color || 'brand'), p.size === 'lg' && 'klh-tile-lg', p.solid && 'klh-tile-solid'), 'aria-hidden': 'true' }, h(Icon, { name: p.icon || 'info' })); }
  function Card(p) {
    var hasHead = p.title || p.action || p.icon;
    return h('section', { className: cx('klh-card', (p.interactive || p.onClick) && 'klh-card-interactive', p.className), onClick: p.onClick, style: p.padding != null ? { padding: p.padding } : undefined, 'aria-label': p.title ? undefined : p['aria-label'] },
      hasHead ? h('div', { className: 'klh-card-head' },
        h('div', { className: 'klh-card-head-l' }, p.icon ? h(IconTile, { icon: p.icon, color: p.color }) : null,
          h('div', null, h('h2', { className: 'klh-card-title' }, p.title), p.subtitle ? h('div', { className: 'klh-card-sub' }, p.subtitle) : null)),
        p.action || null) : null,
      p.children);
  }
  function StatCard(p) {
    var tag = p.onClick ? 'button' : 'div';
    var t = p.trend;
    var vivid = p.variant === 'vivid';
    return h(tag, { className: cx('klh-card klh-stat klh-focus', p.tone && !vivid && 'klh-stat-' + p.tone, vivid && 'klh-stat-vivid klh-vivid-' + (p.color || 'brand')), onClick: p.onClick, type: p.onClick ? 'button' : undefined },
      h('div', { className: 'klh-stat-top' }, h('span', { className: 'klh-stat-label' }, p.label), p.icon ? h(IconTile, { icon: p.icon, color: p.color }) : null),
      h('span', { className: 'klh-stat-value' }, p.value),
      h('div', { className: 'klh-stat-foot' },
        h('span', { className: 'klh-stat-sub' },
          t ? h('span', { className: cx('klh-trend', t.good === false || (t.good == null && t.dir === 'down') ? 'klh-trend-down' : 'klh-trend-up') }, h(Icon, { name: t.dir === 'down' ? 'trend-down' : 'trend-up', size: 12 }), t.value) : null,
          p.sub || null),
        p.spark ? h(Sparkline, { data: p.spark, color: p.sparkColor, width: 96, height: 32 }) : null));
  }

  /* ---------- HeroHeader ---------- */
  function HeroPattern() {
    var cells = [], col = { 2: 'g', 9: 'c', 13: 'v', 20: 'g', 27: 'c' };
    for (var r = 0; r < 4; r++) for (var c = 0; c < 7; c++) {
      var i = r * 7 + c; if ((r + c) % 3 === 0 && !col[i]) continue;
      cells.push(h('rect', { key: i, x: 150 + c * 28, y: 24 + r * 28, width: 20, height: 20, rx: 5, className: col[i] }));
    }
    return h('svg', { className: 'klh-hero-pattern', width: 380, height: 220, viewBox: '0 0 380 220', 'aria-hidden': 'true' },
      h('circle', { className: 'b2', cx: 340, cy: 30, r: 70, opacity: .9 }),
      h('circle', { className: 'b1', cx: 300, cy: 150, r: 38 }),
      h('circle', { className: 'ring', cx: 370, cy: 190, r: 46 }),
      h('circle', { className: 'b4', cx: 236, cy: 196, r: 14 }),
      cells);
  }
  function HeroHeader(p) {
    return h('section', { className: 'klh klh-hero' }, h(HeroPattern), h('div', { className: 'klh-hero-glow' }),
      h('div', null,
        p.eyebrow ? h('div', { className: 'klh-hero-eyebrow' }, p.eyebrow) : null,
        h('h1', null, p.title),
        p.subtitle ? h('p', { className: 'klh-hero-sub' }, p.subtitle) : null),
      p.chips ? h('div', { className: 'klh-row' }, p.chips) : null,
      p.actions ? h('div', { className: 'klh-hero-actions' }, p.actions) : null,
      p.stats ? h('div', { className: 'klh-hero-stats' }, p.stats.map(function (st, i) { return h('div', { key: i, className: 'klh-hero-stat' }, h('b', { className: st.gold ? 'gold' : undefined }, st.value), h('span', null, st.label)); })) : null);
  }

  /* ---------- QuickAction ---------- */
  function QuickAction(p) {
    return h('button', { type: 'button', className: cx('klh-qa', p.vertical && 'klh-qa-v'), onClick: p.onClick },
      h(IconTile, { icon: p.icon, color: p.color, size: 'lg', solid: p.solid !== false }),
      h('span', { className: 'klh-qa-text' }, h('b', null, p.title), p.sub ? h('span', null, p.sub) : null),
      p.badge ? h('span', { className: 'klh-badge' }, p.badge) : null,
      h(Icon, { name: 'arrow-right' }));
  }

  /* ---------- ModuleLauncher ---------- */
  function ModuleLauncher(p) {
    return h('div', { className: 'klh-launcher', role: 'list' }, (p.modules || []).map(function (m, i) {
      return h('button', { key: i, type: 'button', role: 'listitem', className: 'klh-mod', onClick: m.onClick, title: m.title },
        h('span', { className: 'klh-mod-letter', 'aria-hidden': 'true' }, m.code || ''),
        h(IconTile, { icon: m.icon, color: m.color, size: 'lg', solid: true }),
        h('b', null, m.title), m.sub ? h('span', { className: 'klh-mod-sub' }, m.sub) : null,
        m.badge ? h('span', { className: 'klh-badge' }, m.badge) : null);
    }));
  }

  /* ---------- Field ---------- */
  var fieldSeq = 0;
  function Field(p) {
    var idRef = useRef(null); if (!idRef.current) idRef.current = 'klh-f' + (++fieldSeq);
    var id = p.id || idRef.current, msgId = id + '-msg';
    if (p.visible === false) return null;
    var control;
    if (p.derived) {
      control = h('div', { className: 'klh-readonly', id: id, 'aria-readonly': 'true' }, p.value != null ? p.value : '—');
    } else if (p.children) {
      control = React.Children.map(p.children, function (c) { return React.isValidElement(c) ? React.cloneElement(c, { id: c.props.id || id, 'aria-invalid': p.error ? 'true' : undefined, 'aria-describedby': (p.error || p.hint) ? msgId : undefined }) : c; });
    }
    return h('div', { className: cx('klh-field', p.error && 'klh-field-error', p.className) },
      h('label', { className: 'klh-label', htmlFor: p.derived ? undefined : id }, p.label,
        p.required ? h('span', { className: 'klh-req', 'aria-hidden': 'true' }, '*') : null,
        p.derived ? h('span', { className: 'klh-auto' }, p.derivedLabel || 'Auto') : null),
      control,
      p.error ? h('span', { className: 'klh-error', id: msgId }, h(Icon, { name: 'alert', size: 14 }), p.error)
        : (p.hint ? h('span', { className: 'klh-hint', id: msgId }, p.hint) : null));
  }
  function Input(p) { return h('input', Object.assign({}, p, { className: cx('klh-input', p.className) })); }
  function Select(p) {
    var opts = p.options || [];
    var rest = Object.assign({}, p); delete rest.options;
    return h('select', Object.assign(rest, { className: cx('klh-select', p.className) }),
      opts.map(function (o) { var v = typeof o === 'string' ? o : o.value; return h('option', { key: v, value: v }, typeof o === 'string' ? o : o.label); }));
  }
  function Textarea(p) { return h('textarea', Object.assign({}, p, { className: cx('klh-textarea', p.className) })); }

  /* ---------- OtpInput ---------- */
  function OtpInput(p) {
    var len = p.length || 6;
    var st = useState(p.value || ''), val = st[0], setVal = st[1];
    var t = useState(p.resendIn != null ? p.resendIn : 30), left = t[0], setLeft = t[1];
    var refs = useRef([]);
    useEffect(function () { if (left <= 0) return; var id = setTimeout(function () { setLeft(left - 1); }, 1000); return function () { clearTimeout(id); }; }, [left]);
    function set(i, ch) {
      ch = ch.replace(/\D/g, '');
      var arr = val.split(''); while (arr.length < len) arr.push('');
      if (ch.length > 1) { ch.slice(0, len).split('').forEach(function (c, k) { arr[k] = c; }); }
      else arr[i] = ch;
      var nv = arr.join('').slice(0, len); setVal(nv); p.onChange && p.onChange(nv);
      if (ch && refs.current[i + 1]) refs.current[i + 1].focus();
    }
    var boxes = [];
    for (var i = 0; i < len; i++) (function (i) {
      boxes.push(h('input', { key: i, ref: function (el) { refs.current[i] = el; }, inputMode: 'numeric', autoComplete: i === 0 ? 'one-time-code' : 'off', maxLength: len, 'aria-label': 'Digit ' + (i + 1) + ' of ' + len, value: val[i] || '',
        onChange: function (e) { set(i, e.target.value); },
        onKeyDown: function (e) { if (e.key === 'Backspace' && !val[i] && refs.current[i - 1]) refs.current[i - 1].focus(); } }));
    })(i);
    return h('div', { className: 'klh-field' },
      h('div', { className: cx('klh-otp', p.error && 'klh-otp-error'), role: 'group', 'aria-label': 'One-time password' }, boxes),
      p.error ? h('span', { className: 'klh-error' }, h(Icon, { name: 'alert', size: 14 }), p.error) : null,
      h('span', { className: 'klh-hint' }, left > 0 ? 'Resend OTP in 0:' + pad(left)
        : h('button', { type: 'button', className: 'klh-btn klh-btn-ghost klh-btn-sm', onClick: function () { setLeft(p.resendIn != null ? p.resendIn : 30); p.onResend && p.onResend(); } }, 'Resend OTP')));
  }

  /* ---------- Notice ---------- */
  var NOTICE_ICON = { success: 'check', warning: 'alert', critical: 'alert', info: 'info', neutral: 'lock', progress: 'info' };
  function Notice(p) {
    var tone = p.tone || 'info';
    return h('div', { className: cx('klh-notice', 'klh-tone-' + tone, p.className), role: tone === 'critical' ? 'alert' : 'status' },
      h(Icon, { name: p.icon || NOTICE_ICON[tone] }),
      h('div', { className: 'klh-notice-body' }, p.title ? h('div', { className: 'klh-notice-title' }, p.title) : null, p.children ? h('div', null, p.children) : null),
      p.action || null);
  }

  /* ---------- Skeleton ---------- */
  function Skeleton(p) {
    if (p.variant === 'table') {
      var rows = p.rows || 5, cols = p.cols || 5, out = [];
      for (var r = 0; r < rows; r++) { var tds = []; for (var c = 0; c < cols; c++) tds.push(h('td', { key: c }, h('span', { className: 'klh-skel', style: { width: (40 + ((r * 7 + c * 13) % 50)) + '%' } }))); out.push(h('tr', { key: r }, tds)); }
      return h('tbody', { 'aria-busy': 'true' }, out);
    }
    var lines = p.lines || 3, ls = [];
    for (var i = 0; i < lines; i++) ls.push(h('span', { key: i, className: 'klh-skel', style: { width: i === lines - 1 ? '60%' : '100%', height: p.height || 12 } }));
    return h('div', { className: 'klh-stack', style: { gap: 10 }, 'aria-busy': 'true', 'aria-label': 'Loading' }, ls);
  }

  /* ---------- EmptyState ---------- */
  function EmptyState(p) {
    return h('div', { className: 'klh-empty' },
      h('div', { className: 'klh-empty-icon' }, h(Icon, { name: p.icon || 'inbox' })),
      h('h3', null, p.title), p.body ? h('p', null, p.body) : null, p.action || null);
  }

  /* ---------- DataTable ---------- */
  function DataTable(p) {
    var cols = p.columns || [], rows = p.rows || [];
    var s = useState(''), q = s[0], setQ = s[1];
    var so = useState(p.defaultSort || null), sort = so[0], setSort = so[1];
    var pg = useState(0), page = pg[0], setPage = pg[1];
    var size = p.pageSize || 10;
    var filtered = useMemo(function () {
      var r = rows;
      if (q) { var ql = q.toLowerCase(); r = r.filter(function (row) { return cols.some(function (c) { var v = row[c.key]; return v != null && String(v).toLowerCase().indexOf(ql) >= 0; }); }); }
      if (sort) { r = r.slice().sort(function (a, b) { var x = a[sort.key], y = b[sort.key]; var o = x > y ? 1 : x < y ? -1 : 0; return sort.dir === 'desc' ? -o : o; }); }
      return r;
    }, [rows, q, sort]);
    var pages = Math.max(1, Math.ceil(filtered.length / size));
    var view = filtered.slice(page * size, page * size + size);
    function toggle(k) { setSort(!sort || sort.key !== k ? { key: k, dir: 'asc' } : { key: k, dir: sort.dir === 'asc' ? 'desc' : 'asc' }); }
    var head = h('thead', null, h('tr', null, cols.map(function (c) {
      var al = c.align === 'right' ? 'klh-right' : undefined;
      var ariaSort = sort && sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined;
      return h('th', { key: c.key, className: al, 'aria-sort': ariaSort, scope: 'col' }, c.sortable === false ? c.label : h('button', { onClick: function () { toggle(c.key); } }, c.label, h(Icon, { name: 'sort', size: 12 })));
    })));
    var body;
    if (p.loading) body = h(Skeleton, { variant: 'table', cols: cols.length, rows: 5 });
    else if (!view.length) body = h('tbody', null, h('tr', null, h('td', { colSpan: cols.length }, p.empty || h(EmptyState, { title: q ? 'No matches for “' + q + '”' : 'Nothing here yet', body: q ? 'Try a different name, ID or room number.' : null, icon: q ? 'search' : 'inbox' }))));
    else body = h('tbody', null, view.map(function (row, i) {
      var k = p.rowKey ? row[p.rowKey] : i;
      return h('tr', { key: k, className: cx(p.onRowClick && 'klh-clickable', p.selectedKey != null && p.selectedKey === k && 'klh-selected'), onClick: p.onRowClick ? function () { p.onRowClick(row); } : undefined, tabIndex: p.onRowClick ? 0 : undefined,
        onKeyDown: p.onRowClick ? function (e) { if (e.key === 'Enter') p.onRowClick(row); } : undefined },
        cols.map(function (c) { return h('td', { key: c.key, className: c.align === 'right' ? 'klh-right' : undefined }, c.render ? c.render(row[c.key], row) : row[c.key]); }));
    }));
    return h('div', { className: 'klh-table-wrap' },
      h('div', { className: 'klh-table-bar' },
        p.searchable === false ? null : h('div', { className: 'klh-search' }, h(Icon, { name: 'search' }), h('input', { className: 'klh-input', type: 'search', placeholder: p.searchPlaceholder || 'Search', 'aria-label': p.searchPlaceholder || 'Search', value: q, onChange: function (e) { setQ(e.target.value); setPage(0); } })),
        p.filters || null,
        h('div', { style: { marginLeft: 'auto' }, className: 'klh-row' }, p.actions || null, p.onExport ? h(Button, { icon: 'download', size: 'sm', onClick: p.onExport }, 'Export') : null)),
      h('div', { className: 'klh-table-scroll' }, h('table', { className: 'klh-table' }, p.caption ? h('caption', { className: 'klh-sr' }, p.caption) : null, head, body)),
      h('div', { className: 'klh-table-foot' },
        h('span', null, p.loading ? 'Loading…' : (filtered.length ? (page * size + 1) + '–' + Math.min(filtered.length, page * size + size) + ' of ' + filtered.length : '0 results')),
        h('div', { className: 'klh-row' },
          h('button', { className: 'klh-iconbtn', 'aria-label': 'Previous page', disabled: page === 0, onClick: function () { setPage(Math.max(0, page - 1)); } }, h(Icon, { name: 'chevron-left' })),
          h('span', null, 'Page ' + (page + 1) + ' of ' + pages),
          h('button', { className: 'klh-iconbtn', 'aria-label': 'Next page', disabled: page >= pages - 1, onClick: function () { setPage(Math.min(pages - 1, page + 1)); } }, h(Icon, { name: 'chevron-right' })))));
  }

  /* ---------- overlays ---------- */
  function useEsc(open, fn) { useEffect(function () { if (!open || !fn) return; function k(e) { if (e.key === 'Escape') fn(); } document.addEventListener('keydown', k); return function () { document.removeEventListener('keydown', k); }; }, [open, fn]); }
  function Drawer(p) {
    useEsc(p.open, p.onClose);
    if (!p.open) return null;
    return h('div', { className: 'klh-scrim', onClick: function (e) { if (e.target === e.currentTarget && p.onClose) p.onClose(); } },
      h('aside', { className: 'klh-drawer klh', role: 'dialog', 'aria-modal': 'true', 'aria-label': p.title },
        h('div', { className: 'klh-drawer-head' },
          h('div', null, h('h2', null, p.title), p.subtitle ? h('div', { className: 'klh-muted' }, p.subtitle) : null),
          h('button', { className: 'klh-iconbtn', 'aria-label': 'Close', onClick: p.onClose }, h(Icon, { name: 'x' }))),
        h('div', { className: 'klh-drawer-body' }, p.children),
        p.footer ? h('div', { className: 'klh-drawer-foot' }, p.footer) : null));
  }
  function ConfirmDialog(p) {
    useEsc(p.open, p.onCancel);
    var r = useState(''), remarks = r[0], setRemarks = r[1];
    if (!p.open) return null;
    var needs = p.requireRemarks && !remarks.trim();
    return h('div', { className: 'klh-scrim klh-scrim-center' },
      h('div', { className: 'klh-dialog klh', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': p.title },
        h('span', { className: cx('klh-dialog-icon', p.tone === 'danger' ? 'klh-tile-red' : 'klh-tile-brand') }, h(Icon, { name: p.icon || (p.tone === 'danger' ? 'alert' : 'info') })),
        h('h2', null, p.title), p.body ? h('p', null, p.body) : null,
        p.requireRemarks ? h(Field, { label: p.remarksLabel || 'Remarks', required: true }, h(Textarea, { value: remarks, onChange: function (e) { setRemarks(e.target.value); } })) : null,
        h('div', { className: 'klh-dialog-actions' },
          h(Button, { onClick: p.onCancel }, p.cancelLabel || 'Cancel'),
          h(Button, { variant: p.tone === 'danger' ? 'danger' : 'primary', disabled: needs, onClick: function () { p.onConfirm && p.onConfirm(remarks); } }, p.confirmLabel || 'Confirm'))));
  }

  /* ---------- Toast ---------- */
  var TOAST_ICON = { success: 'check', warning: 'alert', critical: 'x', info: 'info' };
  function Toast(p) {
    var tone = p.tone || 'success';
    useEffect(function () { if (!p.onClose || p.duration === 0) return; var id = setTimeout(p.onClose, p.duration || 5000); return function () { clearTimeout(id); }; }, []);
    return h('div', { className: 'klh-toast', role: tone === 'critical' ? 'alert' : 'status' },
      h('span', { className: cx('klh-toast-mark', 'klh-tone-' + tone) }, h(Icon, { name: TOAST_ICON[tone] })),
      h('div', { className: 'klh-toast-text' }, h('strong', null, p.title), p.children ? h('span', { className: 'klh-muted' }, p.children) : null),
      p.action || null,
      p.onClose ? h('button', { className: 'klh-iconbtn', 'aria-label': 'Dismiss', onClick: p.onClose }, h(Icon, { name: 'x' })) : null);
  }
  function ToastStack(p) { return h('div', { className: cx('klh-toasts', p.inline && 'klh-toasts-static'), 'aria-live': 'polite' }, p.children); }

  /* ---------- Stepper ---------- */
  function Stepper(p) {
    var steps = p.steps || [];
    return h('ol', { className: cx('klh-steps', p.orientation === 'vertical' && 'klh-steps-vertical') }, steps.map(function (s, i) {
      var st = s.state || 'upcoming';
      var mark = st === 'done' ? h(Icon, { name: 'check' }) : st === 'rejected' ? h(Icon, { name: 'x' }) : String(i + 1);
      return h('li', { key: i, className: cx('klh-step', 'klh-step-' + st), 'aria-current': st === 'current' ? 'step' : undefined },
        h('span', { className: 'klh-step-mark' }, mark),
        h('div', { className: 'klh-step-text' }, h('span', { className: 'klh-step-label' }, s.label), s.meta ? h('span', { className: 'klh-step-meta' }, s.meta) : null));
    }));
  }

  /* ---------- ApprovalTrail ---------- */
  function ApprovalTrail(p) {
    return h('ol', { className: 'klh-trail', 'aria-label': 'Approval trail' }, (p.entries || []).map(function (e, i) {
      var tone = toneOf(e.decision);
      return h('li', { key: i },
        h('span', { className: cx('klh-trail-lvl', 'klh-tone-' + tone) }, e.level != null ? (typeof e.level === 'number' ? 'L' + e.level : e.level) : i + 1),
        h('div', null,
          h('div', { className: 'klh-trail-top' }, h('span', null, h('span', { className: 'klh-trail-who' }, e.role), e.person ? ' · ' + e.person : ''), h(StatusChip, { status: e.decision })),
          h('div', { className: 'klh-trail-meta' }, e.at ? formatDateTime(e.at) : 'Awaiting decision'),
          e.remarks ? h('div', { className: 'klh-trail-remarks' }, e.remarks) : null));
    }));
  }

  /* ---------- Money ---------- */
  function Money(p) {
    return h('div', { className: 'klh-money' },
      h('span', { className: 'klh-money-amt' }, formatINR(p.amount, { paise: p.paise })),
      (p.dueDate || p.status) ? h('span', { className: 'klh-money-meta' }, p.dueDate ? 'Due ' + formatDate(p.dueDate) : null, p.status ? h(StatusChip, { status: p.status }) : null) : null);
  }

  /* ---------- Countdown ---------- */
  function Countdown(p) {
    var n = useState(Date.now()), now = n[0], setNow = n[1];
    useEffect(function () { var id = setInterval(function () { setNow(Date.now()); }, 1000); return function () { clearInterval(id); }; }, []);
    var ms = Math.max(0, toDate(p.until).getTime() - now);
    var tone = ms === 0 ? 'critical' : ms < 3600e3 ? 'critical' : ms < 6 * 3600e3 ? 'warning' : 'info';
    var hh = Math.floor(ms / 3600e3), mm = Math.floor(ms % 3600e3 / 60e3), ss = Math.floor(ms % 60e3 / 1000);
    var txt = ms === 0 ? (p.expiredLabel || 'Expired') : (hh >= 24 ? Math.floor(hh / 24) + 'd ' + (hh % 24) + 'h ' + pad(mm) + 'm' : hh + 'h ' + pad(mm) + 'm ' + pad(ss) + 's');
    return h('span', { className: cx('klh-countdown', 'klh-tone-' + tone), role: 'timer', 'aria-live': 'off', title: 'Until ' + formatDateTime(p.until) },
      h(Icon, { name: 'clock' }), p.label ? h('span', { style: { fontWeight: 500 } }, p.label) : null, txt);
  }

  /* ---------- UsageMeter ---------- */
  function UsageMeter(p) {
    var used = p.used || 0, inc = p.included || 1, pct = Math.min(100, used / inc * 100);
    var cls = used > inc ? 'klh-meter-over' : pct >= 80 ? 'klh-meter-near' : '';
    return h('div', { className: 'klh-stack', style: { gap: 8 } },
      h('div', { className: 'klh-row', style: { justifyContent: 'space-between' } },
        h('span', { className: 'klh-stat-label' }, p.label || 'Units used this month'),
        h('span', { className: 'klh-num', style: { fontWeight: 600 } }, used + ' / ' + inc + ' ' + (p.unit || 'kWh'))),
      h('div', { className: 'klh-meter-track', role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': inc, 'aria-valuenow': used, 'aria-label': p.label || 'Units used' }, h('div', { className: cx('klh-meter-fill', cls), style: { width: pct + '%' } })),
      p.footnote ? h('span', { className: 'klh-hint' }, p.footnote) : null);
  }

  /* ---------- BedMap ---------- */
  var BED_TONE = { Vacant: 'success', Held: 'warning', Occupied: 'progress', 'Under Maintenance': 'neutral', Under_Maintenance: 'neutral' };
  function BedMap(p) {
    var rooms = p.rooms || [];
    return h('div', { className: 'klh-stack', style: { gap: 12 } },
      p.legend === false ? null : h('div', { className: 'klh-legend' }, ['Vacant', 'Held', 'Occupied', 'Under Maintenance'].map(function (s) { return h(StatusChip, { key: s, status: s, tone: BED_TONE[s] }); })),
      h('div', { className: 'klh-floor' }, rooms.map(function (r) {
        var roomBlock = r.maintenance || r.blockedReason;
        return h('div', { key: r.no, className: cx('klh-room', roomBlock && 'klh-room-disabled'), title: r.blockedReason || undefined },
          h('div', { className: 'klh-room-head' }, h('span', { className: 'klh-room-no' }, r.no), h('span', { className: 'klh-room-type' }, r.type)),
          h('div', { className: 'klh-beds' }, (r.beds || []).map(function (b) {
            var bedStatus = r.maintenance ? 'Under Maintenance' : b.status;
            var selectable = p.selectable && !roomBlock && bedStatus === 'Vacant';
            var selected = p.selected === b.id;
            var tone = BED_TONE[bedStatus] || 'neutral';
            return h('button', { key: b.id, type: 'button', className: cx('klh-bed', !selected && 'klh-tone-' + tone), 'data-selectable': selectable ? 'true' : undefined, 'aria-pressed': p.selectable ? String(selected) : undefined, 'aria-disabled': p.selectable && !selectable ? 'true' : undefined,
              'aria-label': b.id + ', ' + bedStatus + (b.occupant ? ', ' + b.occupant : '') + (r.blockedReason ? ', ' + r.blockedReason : ''), title: b.occupant || bedStatus,
              onClick: selectable && p.onSelect ? function () { p.onSelect(b.id, r); } : undefined }, b.id.split('-').pop());
          })),
          r.blockedReason ? h('span', { className: 'klh-hint' }, r.blockedReason) : (r.reserved && r.reserved !== 'None' ? h('span', { className: 'klh-hint' }, 'Reserved: ' + r.reserved) : null));
      })));
  }

  /* ---------- AppShell ---------- */
  function initials(name) { return String(name || '').split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }
  var NAV_COLORS = ['brand', 'violet', 'orange', 'sky', 'rose', 'indigo', 'amber', 'cyan'];
  function AppShell(p) {
    var u = p.user || {};
    return h('div', { className: 'klh klh-shell' },
      h('aside', { className: 'klh-side', 'aria-label': 'Main navigation' },
        h('div', { className: 'klh-brand' }, h('span', { className: 'klh-brand-mark', 'aria-hidden': 'true' }, 'KL'), h('span', { className: 'klh-brand-name' }, p.productName || 'KL Residencies', h('small', null, p.productSub || 'Hostel Management'))),
        h('nav', { className: 'klh-nav' }, (p.nav || []).map(function (g, gi) {
          return h('div', { key: gi, className: 'klh-nav-group' },
            g.heading ? h('div', { className: 'klh-nav-heading' }, g.heading) : null,
            (g.items || []).map(function (it, ii) {
              return h('button', { key: ii, className: 'klh-nav-item', 'aria-current': it.active ? 'page' : undefined, onClick: it.onClick, title: it.label },
                h('span', { className: cx('klh-nav-ico', !it.active && 'klh-tile-' + (it.color || NAV_COLORS[(gi * 3 + ii) % NAV_COLORS.length])) }, h(Icon, { name: it.icon || 'chevron-right' })), h('span', { className: 'klh-nav-label' }, it.label), it.badge ? h('span', { className: 'klh-badge' }, it.badge) : null);
            }));
        })),
        h('div', { className: 'klh-side-foot' }, h(Avatar, { name: u.name, color: 'amber', status: 'online' }), h('div', null, h('b', null, u.name), h('small', null, u.role)))),
      h('div', { className: 'klh-main' },
        h('header', { className: 'klh-top' },
          p.hostels ? h('select', { className: 'klh-select', 'aria-label': 'Hostel', defaultValue: p.hostel }, p.hostels.map(function (x) { return h('option', { key: x }, x); })) : null,
          p.years ? h('select', { className: 'klh-select', 'aria-label': 'Academic year', defaultValue: p.year }, p.years.map(function (x) { return h('option', { key: x }, x); })) : null,
          h('div', { className: 'klh-search' }, h(Icon, { name: 'search' }), h('input', { className: 'klh-input', type: 'search', placeholder: p.searchPlaceholder || 'Search students, rooms, receipts', 'aria-label': 'Global search' }), h('span', { className: 'klh-kbd', 'aria-hidden': 'true' }, 'Ctrl K')),
          h('div', { className: 'klh-top-right' },
            h('button', { className: 'klh-iconbtn', 'aria-label': 'Notifications' + (p.notifications ? ', ' + p.notifications + ' unread' : '') }, h(Icon, { name: 'bell' }), p.notifications ? h('span', { className: 'klh-badge' }, p.notifications) : null),
            h('button', { className: 'klh-iconbtn klh-profile', style: { width: 'auto', padding: '0 6px', height: 40 }, 'aria-label': 'Profile menu' },
              h(Avatar, { name: u.name, color: 'navy' }),
              h('span', { style: { textAlign: 'left', color: 'var(--ink)', fontSize: 13, lineHeight: '18px' } }, u.name, h('small', null, u.role)),
              h(Icon, { name: 'chevron-down' })))),
        h('main', { className: 'klh-content' },
          (p.breadcrumb || p.title) ? h('div', { className: 'klh-pagehead' },
            h('div', null,
              p.breadcrumb ? h('ol', { className: 'klh-crumbs', 'aria-label': 'Breadcrumb' }, p.breadcrumb.map(function (b, i) { return h('li', { key: i }, b); })) : null,
              p.title ? h('h1', null, p.title) : null),
            p.primaryAction || null) : null,
          p.children)));
  }

  /* ---------- BottomNav ---------- */
  function BottomNav(p) {
    return h('nav', { className: 'klh-bottomnav', 'aria-label': 'Main' }, (p.items || []).slice(0, 5).map(function (it, i) {
      return h('button', { key: i, 'aria-current': it.active ? 'page' : undefined, onClick: it.onClick },
        h('span', { className: 'klh-bn-ico' }, h(Icon, { name: it.icon || 'home' })), it.label, it.badge ? h('span', { className: 'klh-badge' }, it.badge) : null);
    }));
  }

  /* ---------- KioskPanel ---------- */
  function KioskPanel(p) {
    var r = p.result || 'idle', s = p.student || {}, ps = p.pass || {};
    var title = r === 'valid' ? (p.title || 'VALID PASS') : r === 'invalid' ? (p.title || 'NOT ALLOWED') : (p.title || 'Scan outpass QR');
    return h('div', { className: cx('klh klh-kiosk', 'klh-kiosk-' + r), role: r === 'idle' ? undefined : 'alert', style: p.height ? { minHeight: p.height } : undefined },
      r === 'idle' ? h('div', { className: 'klh-kiosk-badge' }, h(Icon, { name: 'qr' })) : null,
      r !== 'idle' && s.name ? h('div', { className: 'klh-kiosk-photo', 'aria-hidden': 'true' }, s.photo ? h('img', { src: s.photo, alt: '', style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 } }) : initials(s.name)) : null,
      h('p', { className: 'klh-kiosk-title' }, title),
      r === 'invalid' && p.reason ? h('p', { className: 'klh-kiosk-body' }, p.reason) : null,
      s.name ? h('p', { className: 'klh-kiosk-body' }, s.name + (s.id ? ' · ' + s.id : '')) : null,
      ps.no ? h('p', { className: 'klh-kiosk-body', style: { fontSize: 22, lineHeight: '30px' } }, ps.no + (ps.from ? ' · ' + formatDateTime(ps.from) + ' to ' + formatDateTime(ps.to) : '')) : null,
      p.lateBy ? h('p', { className: 'klh-kiosk-body', style: { fontWeight: 700 } }, 'Late by ' + p.lateBy + ' minutes') : null,
      p.actionLabel ? h('button', { className: 'klh-kiosk-action', onClick: p.onAction }, p.actionLabel) : null,
      p.secondary || null);
  }

  function Person(p) { return h('span', { className: 'klh-person' }, h(Avatar, { name: p.name, src: p.src, size: 'sm' }), h('span', null, h('b', null, p.name), p.sub ? h('span', null, p.sub) : null)); }

  /* ---------- Checkbox / RadioGroup / Switch ---------- */
  function Checkbox(p) {
    return h('label', { className: 'klh-check' },
      h('input', { type: 'checkbox', checked: p.checked, defaultChecked: p.defaultChecked, disabled: p.disabled, onChange: p.onChange && function (e) { p.onChange(e.target.checked); } }),
      h('span', { className: 'klh-check-box' }, h(Icon, { name: 'check' })),
      h('span', { className: 'klh-check-text' }, h('b', null, p.label), p.description ? h('span', null, p.description) : null));
  }
  var rgSeq = 0;
  function RadioGroup(p) {
    var nm = useRef(null); if (!nm.current) nm.current = p.name || 'klh-rg' + (++rgSeq);
    var st = useState(p.defaultValue), v = p.value !== undefined ? p.value : st[0];
    var cards = p.variant === 'cards';
    return h('div', { role: 'radiogroup', 'aria-label': p.label, className: cards ? 'klh-radio-cards' : 'klh-stack', style: cards ? undefined : { gap: 12 } }, (p.options || []).map(function (o) {
      var item = h('label', { key: o.value, className: 'klh-check klh-check-radio' },
        h('input', { type: 'radio', name: nm.current, value: o.value, checked: v === o.value, disabled: o.disabled, onChange: function () { st[1](o.value); p.onChange && p.onChange(o.value); } }),
        h('span', { className: 'klh-check-box' }),
        h('span', { className: 'klh-check-text' }, h('b', null, o.label), o.description ? h('span', null, o.description) : null));
      return cards ? h('div', { key: o.value, className: 'klh-radio-card' }, item, o.extra ? h('div', { style: { marginTop: 10, paddingLeft: 30 } }, o.extra) : null) : item;
    }));
  }
  function Switch(p) {
    return h('label', { className: 'klh-switch' },
      h('input', { type: 'checkbox', role: 'switch', checked: p.checked, defaultChecked: p.defaultChecked, disabled: p.disabled, onChange: p.onChange && function (e) { p.onChange(e.target.checked); } }),
      h('span', { className: 'klh-switch-track' }),
      p.label ? h('span', { className: 'klh-check-text' }, h('b', null, p.label), p.description ? h('span', null, p.description) : null) : null);
  }

  /* ---------- SegmentedControl / Tabs ---------- */
  function SegmentedControl(p) {
    var st = useState(p.defaultValue != null ? p.defaultValue : (p.options[0] || {}).value), v = p.value !== undefined ? p.value : st[0];
    return h('div', { className: 'klh-seg', role: 'radiogroup', 'aria-label': p.label }, p.options.map(function (o) {
      return h('button', { key: o.value, type: 'button', role: 'radio', 'aria-checked': String(v === o.value), onClick: function () { st[1](o.value); p.onChange && p.onChange(o.value); } }, o.icon ? h(Icon, { name: o.icon }) : null, o.label);
    }));
  }
  function Tabs(p) {
    var st = useState(p.defaultValue != null ? p.defaultValue : (p.tabs[0] || {}).id), v = p.value !== undefined ? p.value : st[0];
    return h('div', { className: 'klh-tabs', role: 'tablist', 'aria-label': p.label }, p.tabs.map(function (t) {
      return h('button', { key: t.id, role: 'tab', className: 'klh-tab', 'aria-selected': String(v === t.id), onClick: function () { st[1](t.id); p.onChange && p.onChange(t.id); } }, t.icon ? h(Icon, { name: t.icon }) : null, t.label, t.count != null ? h('span', { className: 'klh-tab-count' }, t.count) : null);
    }));
  }

  /* ---------- Slider ---------- */
  function Slider(p) {
    var min = p.min || 0, max = p.max || 100, st = useState(p.defaultValue != null ? p.defaultValue : min);
    var v = p.value !== undefined ? p.value : st[0];
    function set(x) { st[1](x); p.onChange && p.onChange(x); }
    var fmt = p.format || function (x) { return x; };
    return h('div', { className: 'klh-slider' },
      h('div', { className: 'klh-slider-head' }, h('span', { className: 'klh-label' }, p.label), h('span', { className: 'klh-slider-val' }, fmt(v))),
      p.caption ? h('span', { className: 'klh-hint' }, typeof p.caption === 'function' ? p.caption(v) : p.caption) : null,
      h('input', { type: 'range', min: min, max: max, step: p.step || 1, value: v, 'aria-label': p.label, style: { '--pct': ((v - min) / (max - min) * 100) + '%' }, onChange: function (e) { set(Number(e.target.value)); } }),
      h('div', { className: 'klh-slider-marks' }, h('span', null, fmt(min)), h('span', null, fmt(max))),
      p.presets ? h('div', { className: 'klh-presets' }, p.presets.map(function (x) { return h(FilterChip, { key: x, label: fmt(x), selected: v === x, onClick: function () { set(x); } }); })) : null);
  }

  /* ---------- DatePicker ---------- */
  var DOW = ['Mo','Tu','We','Th','Fr','Sa','Su'];
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function sameDay(a, b) { return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function Calendar(p) {
    var sel = p.value ? toDate(p.value) : null, today = p.today ? toDate(p.today) : new Date();
    var vm = useState(function () { var d = sel || today; return new Date(d.getFullYear(), d.getMonth(), 1); }), view = vm[0], setView = vm[1];
    var min = p.min ? toDate(p.min) : null; if (min) min = new Date(min.getFullYear(), min.getMonth(), min.getDate());
    var start = (view.getDay() + 6) % 7, days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate(), cells = [];
    for (var i = 0; i < start; i++) cells.push(h('span', { key: 'o' + i, className: 'klh-cal-day out' }));
    for (var d = 1; d <= days; d++) (function (d) {
      var dt = new Date(view.getFullYear(), view.getMonth(), d), dis = min && dt < min;
      cells.push(h('button', { key: d, type: 'button', className: cx('klh-cal-day', sameDay(dt, today) && 'today'), 'aria-selected': String(sameDay(dt, sel)), 'aria-disabled': dis ? 'true' : undefined, 'aria-label': formatDate(dt), onClick: dis ? undefined : function () { p.onChange && p.onChange(dt); } }, d));
    })(d);
    return h('div', { className: cx('klh-cal', p.pop && 'klh-cal-pop') },
      h('div', { className: 'klh-cal-head' },
        h('button', { className: 'klh-iconbtn', type: 'button', 'aria-label': 'Previous month', onClick: function () { setView(new Date(view.getFullYear(), view.getMonth() - 1, 1)); } }, h(Icon, { name: 'chevron-left' })),
        h('span', null, MONTHS[view.getMonth()] + ' ' + view.getFullYear()),
        h('button', { className: 'klh-iconbtn', type: 'button', 'aria-label': 'Next month', onClick: function () { setView(new Date(view.getFullYear(), view.getMonth() + 1, 1)); } }, h(Icon, { name: 'chevron-right' }))),
      h('div', { className: 'klh-cal-grid' }, DOW.map(function (x) { return h('span', { key: x, className: 'klh-cal-dow' }, x); }), cells));
  }
  function DatePicker(p) {
    var st = useState(p.defaultValue || null), v = p.value !== undefined ? p.value : st[0];
    var o = useState(!!p.defaultOpen), open = o[0], setOpen = o[1];
    function pick(d) { st[1](d); p.onChange && p.onChange(d); if (!p.inline) setOpen(false); }
    if (p.inline) return h(Calendar, { value: v, min: p.min, today: p.today, onChange: pick });
    return h('div', { className: 'klh-dp' },
      h('button', { type: 'button', className: 'klh-input', style: { display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer' }, 'aria-haspopup': 'dialog', 'aria-expanded': String(open), onClick: function () { setOpen(!open); } },
        h(Icon, { name: 'calendar' }), h('span', { style: { color: v ? 'var(--ink)' : 'var(--ink-subtle)' } }, v ? formatDate(v) : (p.placeholder || 'Select date'))),
      open ? h(Calendar, { pop: true, value: v, min: p.min, today: p.today, onChange: pick }) : null);
  }

  /* ---------- FileUpload ---------- */
  function fmtSize(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB'; }
  function FileUpload(p) {
    var st = useState(p.files || []), files = st[0], setFiles = st[1];
    var ov = useState(false), inp = useRef(null);
    function add(list) { var arr = Array.prototype.map.call(list, function (f) { return { name: f.name, size: f.size, progress: 100 }; }); var nf = files.concat(arr); setFiles(nf); p.onChange && p.onChange(nf); }
    return h('div', null,
      h('div', { className: cx('klh-drop', ov[0] && 'klh-drop-over'), tabIndex: 0, role: 'button', 'aria-label': p.label || 'Upload file',
        onClick: function () { inp.current && inp.current.click(); }, onKeyDown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.current && inp.current.click(); } },
        onDragOver: function (e) { e.preventDefault(); ov[1](true); }, onDragLeave: function () { ov[1](false); }, onDrop: function (e) { e.preventDefault(); ov[1](false); add(e.dataTransfer.files); } },
        h(IconTile, { icon: 'upload', color: 'brand', size: 'lg', solid: true }),
        h('b', null, h('u', null, 'Click to upload'), ' or drag and drop'),
        h('span', { className: 'klh-hint' }, p.hint || 'PDF, JPG or PNG up to 5 MB'),
        h('input', { ref: inp, type: 'file', hidden: true, accept: p.accept, multiple: p.multiple, onChange: function (e) { add(e.target.files); } })),
      files.length ? h('ul', { className: 'klh-files' }, files.map(function (f, i) {
        return h('li', { key: i, className: 'klh-file' }, h(IconTile, { icon: 'file', color: f.error ? 'red' : 'sky' }),
          h('div', { className: 'klh-file-main' }, h('span', { className: 'klh-file-name' }, f.name),
            f.error ? h('span', { className: 'klh-error' }, f.error) : (f.progress < 100 ? h('div', { className: 'klh-file-bar' }, h('i', { style: { width: f.progress + '%' } })) : h('span', { className: 'klh-hint' }, fmtSize(f.size) + ' · Uploaded'))),
          f.progress < 100 && !f.error ? h('span', { className: 'klh-hint klh-num' }, f.progress + '%') : null,
          h('button', { className: 'klh-iconbtn', 'aria-label': 'Remove ' + f.name, onClick: function () { var nf = files.filter(function (_, k) { return k !== i; }); setFiles(nf); p.onChange && p.onChange(nf); } }, h(Icon, { name: 'trash' })));
      })) : null);
  }

  /* ---------- FilterChip / Rating ---------- */
  function FilterChip(p) {
    return h('button', { type: 'button', className: 'klh-fchip', 'aria-pressed': String(!!p.selected), onClick: p.onClick },
      p.selected ? h(Icon, { name: 'check', size: 14 }) : (p.icon ? h(Icon, { name: p.icon, size: 14 }) : null), p.label, p.count != null ? h('span', { className: 'klh-fchip-count' }, p.count) : null);
  }
  var STAR = 'M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z';
  function Rating(p) {
    var max = p.max || 5, st = useState(p.defaultValue || 0), v = p.value !== undefined ? p.value : st[0], hv = useState(0);
    var shown = hv[0] || v, labels = p.labels || ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'], stars = [];
    for (var i = 1; i <= max; i++) (function (i) {
      stars.push(h('button', { key: i, type: 'button', className: cx('klh-star', i <= shown && 'on'), role: 'radio', 'aria-checked': String(v === i), 'aria-label': i + ' of ' + max + (labels[i - 1] ? ', ' + labels[i - 1] : ''), disabled: p.readOnly,
        onMouseEnter: function () { if (!p.readOnly) hv[1](i); }, onMouseLeave: function () { hv[1](0); }, onClick: function () { st[1](i); p.onChange && p.onChange(i); } }, h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, h('path', { d: STAR }))));
    })(i);
    return h('div', { className: 'klh-row', style: { gap: 12 } }, h('div', { className: 'klh-rating', role: 'radiogroup', 'aria-label': p.label || 'Rating' }, stars), shown ? h('span', { style: { fontWeight: 700 } }, labels[shown - 1]) : null);
  }

  /* ---------- Avatar / Tooltip / Menu / Accordion ---------- */
  var AV_COLORS = ['brand', 'violet', 'orange', 'rose', 'sky', 'indigo', 'amber', 'cyan'];
  function hashStr(s) { var x = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0; return x; }
  function Avatar(p) {
    var color = p.color || AV_COLORS[hashStr(p.name) % AV_COLORS.length];
    var dot = p.status ? h('span', { className: 'klh-avatar-dot', style: { background: 'var(--' + ({ online: 'success-solid', away: 'warning-solid', busy: 'critical-solid', offline: 'chart-5' }[p.status] || 'chart-5') + ')' } }) : null;
    return h('span', { className: cx('klh-avatar', 'klh-tile-' + color, p.size && 'klh-avatar-' + p.size), title: p.name, role: 'img', 'aria-label': p.name },
      p.src ? h('img', { src: p.src, alt: '' }) : initials(p.name), dot);
  }
  function AvatarGroup(p) {
    var names = p.names || [], max = p.max || 4, shown = names.slice(0, max);
    return h('span', { className: 'klh-avgroup' }, shown.map(function (n) { return h(Avatar, { key: n, name: n, size: p.size || 'sm' }); }),
      names.length > max ? h('span', { className: cx('klh-avatar klh-tile-brand', 'klh-avatar-' + (p.size || 'sm')) }, '+' + (names.length - max)) : null);
  }
  function Tooltip(p) { return h('span', { className: cx('klh-tip', p.open && 'klh-tip-open') }, p.children, h('span', { className: 'klh-tip-bubble', role: 'tooltip' }, p.content)); }
  function Menu(p) {
    var o = useState(!!p.defaultOpen), open = o[0], setOpen = o[1];
    useEsc(open, function () { setOpen(false); });
    var list = h('div', { className: cx('klh-menu', p.static && 'klh-menu-static'), role: 'menu' },
      p.header ? h('div', { className: 'klh-menu-head' }, p.header) : null,
      (p.items || []).map(function (it, i) {
        if (it === 'sep') return h('div', { key: i, className: 'klh-menu-sep', role: 'separator' });
        return h('button', { key: i, role: 'menuitem', className: cx('klh-menu-item', it.danger && 'klh-menu-item-danger'), onClick: function () { setOpen(false); it.onClick && it.onClick(); } }, it.icon ? h(Icon, { name: it.icon }) : null, it.label, it.kbd ? h('kbd', null, it.kbd) : null);
      }));
    if (p.static) return list;
    return h('div', { className: 'klh-menu-wrap' },
      p.trigger ? React.cloneElement(p.trigger, { onClick: function () { setOpen(!open); }, 'aria-haspopup': 'menu', 'aria-expanded': String(open) })
        : h('button', { className: 'klh-iconbtn', 'aria-label': p.label || 'More actions', 'aria-haspopup': 'menu', 'aria-expanded': String(open), onClick: function () { setOpen(!open); } }, h(Icon, { name: 'more' })),
      open ? list : null);
  }
  function Accordion(p) {
    var st = useState(p.defaultOpen != null ? p.defaultOpen : 0), op = st[0];
    return h('div', { className: 'klh-acc' }, (p.items || []).map(function (it, i) {
      var isOpen = op === i, pid = 'klh-acc-' + i;
      return h('div', { key: i, className: 'klh-acc-item' },
        h('button', { className: 'klh-acc-btn', 'aria-expanded': String(isOpen), 'aria-controls': pid, onClick: function () { st[1](isOpen ? -1 : i); } }, it.icon ? h(IconTile, { icon: it.icon, color: it.color }) : null, it.title, h(Icon, { name: 'chevron-down' })),
        isOpen ? h('div', { className: 'klh-acc-panel', id: pid }, it.content) : null);
    }));
  }

  /* ---------- Timeline / NotificationItem ---------- */
  var TL = { success: ['green', 'check'], info: ['sky', 'arrow-right'], warning: ['amber', 'alert'], critical: ['red', 'alert'], progress: ['violet', 'info'], accent: ['orange', 'sparkle'], brand: ['brand', 'info'] };
  function Timeline(p) {
    return h('ol', { className: 'klh-tl' }, (p.items || []).map(function (it, i) {
      var t = TL[it.tone || 'progress'] || TL.progress;
      return h('li', { key: i }, h('span', { className: 'klh-tl-time' }, it.time), h('span', { className: cx('klh-tl-dot', 'klh-tile-' + t[0]) }, h(Icon, { name: it.icon || t[1] })),
        h('div', { className: 'klh-tl-body' }, h('b', null, it.title), it.sub ? h('div', null, it.sub) : null));
    }));
  }
  function NotificationItem(p) {
    return h('div', { className: cx('klh-notif', p.unread && 'klh-notif-unread'), role: 'listitem', tabIndex: 0, onClick: p.onClick },
      p.avatar ? h(Avatar, { name: p.avatar }) : h(IconTile, { icon: p.icon || 'bell', color: p.color }),
      h('div', { className: 'klh-notif-main' }, h('div', { className: 'klh-row', style: { justifyContent: 'space-between', flexWrap: 'nowrap' } }, h('b', null, p.title), h('span', { className: 'klh-notif-time' }, p.time)), p.body ? h('p', null, p.body) : null, p.action ? h('div', { style: { marginTop: 8 } }, p.action) : null),
      p.unread ? h('span', { className: 'klh-notif-dot', 'aria-label': 'Unread' }) : null);
  }

  /* ---------- Charts ---------- */
  function Sparkline(p) {
    var d = p.data || [], w = p.width || 120, ht = p.height || 36; if (d.length < 2) return null;
    var mn = Math.min.apply(null, d), mx = Math.max.apply(null, d), rg = mx - mn || 1;
    var pts = d.map(function (v, i) { return [i / (d.length - 1) * w, ht - 3 - (v - mn) / rg * (ht - 6)]; });
    var line = pts.map(function (q, i) { return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('');
    var last = pts[pts.length - 1];
    return h('svg', { className: cx('klh-spark', p.color), width: w, height: ht, viewBox: '0 0 ' + w + ' ' + ht, 'aria-hidden': 'true' },
      h('path', { className: 'area', d: line + 'L' + w + ' ' + ht + 'L0 ' + ht + 'Z', opacity: .7 }), h('path', { className: 'line', d: line }),
      h('circle', { cx: last[0], cy: last[1], r: 3, className: 'line', style: { fill: 'var(--surface-1)' } }));
  }
  function BarChart(p) {
    var data = p.data || [], W = p.width || 560, H = p.height || 220, pl = 36, pb = 26, pt = 18;
    var mx = Math.max.apply(null, data.map(function (d) { return d.value; }).concat([p.limit || 0])) * 1.15 || 1;
    var step = (W - pl) / data.length, bw = Math.min(36, step * .56), ticks = 4, els = [];
    for (var t = 0; t <= ticks; t++) { var y = pt + (H - pt - pb) * (1 - t / ticks), val = Math.round(mx * t / ticks); els.push(h('line', { key: 'g' + t, className: 'grid', x1: pl, x2: W, y1: y, y2: y })); els.push(h('text', { key: 't' + t, className: 'axis', x: pl - 8, y: y + 4, textAnchor: 'end' }, val)); }
    data.forEach(function (d, i) {
      var bh = (H - pt - pb) * d.value / mx, x = pl + i * step + (step - bw) / 2, y = H - pb - bh;
      var cls = p.limit && d.value > p.limit ? 'bar over' : d.highlight ? 'bar hi' : 'bar';
      els.push(h('rect', { key: 'b' + i, className: cls, x: x, y: y, width: bw, height: Math.max(bh, 1), rx: Math.min(8, bw / 3) }, h('title', null, d.label + ': ' + d.value + (p.unit ? ' ' + p.unit : ''))));
      if (d.highlight || p.showValues) els.push(h('text', { key: 'v' + i, className: 'val', x: x + bw / 2, y: y - 6, textAnchor: 'middle' }, d.value));
      els.push(h('text', { key: 'l' + i, className: 'axis', x: x + bw / 2, y: H - 8, textAnchor: 'middle' }, d.label));
    });
    if (p.limit) { var ly = pt + (H - pt - pb) * (1 - p.limit / mx); els.push(h('line', { key: 'lim', className: 'limit', x1: pl, x2: W, y1: ly, y2: ly })); els.push(h('text', { key: 'liml', className: 'limit-label', x: W, y: ly - 6, textAnchor: 'end' }, p.limitLabel || 'Limit ' + p.limit)); }
    var defs = h('defs', null,
      h('linearGradient', { id: 'klh-bar-grad', x1: 0, y1: 0, x2: 0, y2: 1 }, h('stop', { offset: '0%', style: { stopColor: 'var(--sky)' } }), h('stop', { offset: '100%', style: { stopColor: 'var(--primary)' } })),
      h('linearGradient', { id: 'klh-bar-hi', x1: 0, y1: 0, x2: 0, y2: 1 }, h('stop', { offset: '0%', style: { stopColor: 'var(--hero-accent)' } }), h('stop', { offset: '100%', style: { stopColor: 'var(--accent)' } })));
    return h('svg', { className: 'klh-chart', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': p.label || 'Bar chart' }, defs, els);
  }
  var gradSeq = 0;
  function AreaChart(p) {
    var idRef = useRef(null); if (!idRef.current) idRef.current = 'klh-ag' + (++gradSeq);
    var series = p.series || [], labels = p.labels || [], W = p.width || 760, H = p.height || 230, pl = 48, pb = 28, pt = 16, pr = 12;
    var all = []; series.forEach(function (s) { all = all.concat(s.data); });
    var mx = Math.max.apply(null, all) * 1.15 || 1, n = labels.length, els = [], defs = [];
    function X(i) { return pl + (W - pl - pr) * (n > 1 ? i / (n - 1) : 0); }
    function Y(v) { return pt + (H - pt - pb) * (1 - v / mx); }
    for (var t = 0; t <= 4; t++) { var yv = mx * t / 4, y = Y(yv); els.push(h('line', { key: 'g' + t, className: 'grid', x1: pl, x2: W - pr, y1: y, y2: y })); els.push(h('text', { key: 't' + t, className: 'axis', x: pl - 8, y: y + 4, textAnchor: 'end' }, p.yFormat ? p.yFormat(yv) : Math.round(yv))); }
    labels.forEach(function (l, i) { els.push(h('text', { key: 'x' + i, className: 'axis', x: X(i), y: H - 8, textAnchor: 'middle' }, l)); });
    var VARS = { c1: '--primary', c2: '--violet', c3: '--accent', c4: '--sky', c5: '--rose' };
    series.forEach(function (s, si) {
      var c = s.color || ('c' + (si + 1)), gid = idRef.current + '-' + si;
      defs.push(h('linearGradient', { key: gid, id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, h('stop', { offset: '0%', style: { stopColor: 'var(' + VARS[c] + ')', stopOpacity: .32 } }), h('stop', { offset: '100%', style: { stopColor: 'var(' + VARS[c] + ')', stopOpacity: 0 } })));
      var pts = s.data.map(function (v, i) { return [X(i), Y(v)]; });
      var d = pts.map(function (q, i) { if (!i) return 'M' + q[0] + ' ' + q[1]; var pq = pts[i - 1], cx1 = pq[0] + (q[0] - pq[0]) / 2; return 'C' + cx1 + ' ' + pq[1] + ' ' + cx1 + ' ' + q[1] + ' ' + q[0] + ' ' + q[1]; }).join('');
      els.push(h('path', { key: 'a' + si, className: 'ar', d: d + 'L' + X(n - 1) + ' ' + (H - pb) + 'L' + X(0) + ' ' + (H - pb) + 'Z', fill: 'url(#' + gid + ')' }));
      els.push(h('path', { key: 'l' + si, className: 'ln ' + c, d: d }));
      var last = pts[pts.length - 1]; els.push(h('circle', { key: 'p' + si, className: 'pt ' + c, cx: last[0], cy: last[1], r: 4.5 }));
    });
    return h('div', { className: 'klh-stack', style: { gap: 12 } },
      p.legend === false ? null : h('div', { className: 'klh-chart-legend' }, series.map(function (s, si) { return h('span', { key: si }, h('i', { className: s.color || ('c' + (si + 1)) }), s.name); })),
      h('svg', { className: 'klh-chart klh-area', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': p.label || 'Area chart' }, h('defs', null, defs), els));
  }
  function DonutChart(p) {
    var data = p.data || [], size = p.size || 168, sw = p.thickness || 22, r = (size - sw) / 2, C = 2 * Math.PI * r;
    var total = data.reduce(function (a, d) { return a + d.value; }, 0) || 1, off = 0;
    var arcs = data.map(function (d, i) {
      var len = C * d.value / total, gap = data.length > 1 ? 3 : 0;
      var el = h('circle', { key: i, className: d.color || ('c' + (i + 1)), cx: size / 2, cy: size / 2, r: r, strokeWidth: sw, strokeDasharray: Math.max(len - gap, 0) + ' ' + (C - Math.max(len - gap, 0)), strokeDashoffset: -off, style: { fill: 'none' } }, h('title', null, d.label + ': ' + d.value));
      off += len; return el;
    });
    return h('div', { className: 'klh-donut' },
      h('div', { className: 'klh-ring' }, h('svg', { width: size, height: size, role: 'img', 'aria-label': p.label || 'Donut chart' }, h('circle', { className: 'klh-ring-track', cx: size / 2, cy: size / 2, r: r, strokeWidth: sw }), arcs),
        h('div', { className: 'klh-ring-label' }, h('b', null, p.centerValue != null ? p.centerValue : total), h('span', null, p.centerLabel || 'Total'))),
      p.legend === false ? null : h('ul', { className: 'klh-legend-list' }, data.map(function (d, i) { return h('li', { key: i }, h('i', { className: d.color || ('c' + (i + 1)) }), d.label, h('b', null, d.value)); })));
  }
  function ProgressRing(p) {
    var size = p.size || 104, sw = p.stroke || 10, r = (size - sw) / 2, C = 2 * Math.PI * r, max = p.max || 100, pct = Math.max(0, Math.min(1, (p.value || 0) / max));
    return h('div', { className: 'klh-ring', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-valuenow': p.value, 'aria-label': p.ariaLabel || p.sublabel },
      h('svg', { width: size, height: size }, h('circle', { className: 'klh-ring-track', cx: size / 2, cy: size / 2, r: r, strokeWidth: sw }),
        h('circle', { className: cx('klh-ring-val', p.color), cx: size / 2, cy: size / 2, r: r, strokeWidth: sw, strokeDasharray: C, strokeDashoffset: C * (1 - pct) })),
      h('div', { className: 'klh-ring-label' }, h('b', null, p.label != null ? p.label : Math.round(pct * 100) + '%'), p.sublabel ? h('span', null, p.sublabel) : null));
  }

  /* ---------- PassCard ---------- */
  function QrPlaceholder(p) {
    var n = 25, s = p.size || 150, c = s / n, seed = hashStr(p.value || 'KLH'), rects = [];
    function finder(x, y) { return (x >= 0 && x < 7 && y >= 0 && y < 7) && (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4)); }
    function inFinder(x, y) { return (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9); }
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      var on;
      if (inFinder(x, y)) on = finder(x, y) || finder(x - (n - 7), y) || finder(x, y - (n - 7));
      else { seed = (seed * 1103515245 + 12345) >>> 0; on = (seed >>> 16) % 2 === 0; }
      if (on) rects.push(h('rect', { key: x + '-' + y, x: x * c, y: y * c, width: c + .3, height: c + .3 }));
    }
    return h('svg', { className: 'klh-qr', width: s + 26, height: s + 26, viewBox: '-13 -13 ' + (s + 26) + ' ' + (s + 26), role: 'img', 'aria-label': 'QR code for ' + p.value }, rects);
  }
  function PassCard(p) {
    var s = p.student || {}, ps = p.pass || {};
    return h('article', { className: 'klh klh-pass', 'aria-label': 'Outpass ' + ps.no },
      h('div', { className: 'klh-pass-top' }, h(Avatar, { name: s.name, src: s.photo, size: 'lg', color: 'amber' }),
        h('div', null, h('b', null, s.name), h('small', null, (s.id || '') + (s.room ? ' · ' + s.room : ''))),
        h('span', { className: 'klh-pass-tag' }, p.tag || 'APPROVED')),
      h('div', { className: 'klh-pass-tear', 'aria-hidden': 'true' }),
      h('div', { className: 'klh-pass-body' },
        h(QrPlaceholder, { value: ps.no }),
        h('span', { className: 'klh-code' }, ps.no),
        h('div', { className: 'klh-pass-times' },
          h('div', null, h('small', null, 'Leave'), h('b', null, ps.from ? formatTime(ps.from) : '—'), h('span', null, ps.from ? formatDate(ps.from) : '')),
          h(Icon, { name: 'arrow-right' }),
          h('div', null, h('small', null, 'Return by'), h('b', null, ps.to ? formatTime(ps.to) : '—'), h('span', null, ps.to ? formatDate(ps.to) : ''))),
        ps.destination ? h('span', { className: 'klh-row klh-muted' }, h(Icon, { name: 'pin', size: 14 }), ps.destination) : null));
  }

  var api = {
    Button: Button, StatusChip: StatusChip, Icon: Icon, Card: Card, StatCard: StatCard, Field: Field, Input: Input, Select: Select, Textarea: Textarea,
    OtpInput: OtpInput, Notice: Notice, DataTable: DataTable, Skeleton: Skeleton, EmptyState: EmptyState, Drawer: Drawer, ConfirmDialog: ConfirmDialog,
    Toast: Toast, ToastStack: ToastStack, IconTile: IconTile, HeroHeader: HeroHeader, QuickAction: QuickAction, ModuleLauncher: ModuleLauncher, AreaChart: AreaChart, Checkbox: Checkbox, RadioGroup: RadioGroup, Switch: Switch, SegmentedControl: SegmentedControl, Tabs: Tabs, Slider: Slider, DatePicker: DatePicker, Calendar: Calendar, FileUpload: FileUpload, FilterChip: FilterChip, Rating: Rating, Avatar: Avatar, AvatarGroup: AvatarGroup, Tooltip: Tooltip, Menu: Menu, Accordion: Accordion, Timeline: Timeline, NotificationItem: NotificationItem, Sparkline: Sparkline, BarChart: BarChart, DonutChart: DonutChart, ProgressRing: ProgressRing, PassCard: PassCard, Person: Person, Stepper: Stepper, ApprovalTrail: ApprovalTrail, Money: Money, Countdown: Countdown, UsageMeter: UsageMeter,
    BedMap: BedMap, AppShell: AppShell, BottomNav: BottomNav, KioskPanel: KioskPanel,
    STATUS_TONES: STATUS_TONES, toneOf: toneOf, statusLabel: statusLabel, formatINR: formatINR, formatDate: formatDate, formatTime: formatTime, formatDateTime: formatDateTime
  };
  __out.KLH = api;
})();

export const KLH = __out.KLH;
export default KLH;
