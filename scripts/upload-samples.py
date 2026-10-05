"""Uploads db/seed/samples/*.csv through the admin import API the way the browser does: check first, then load.
Usage: python scripts/upload-samples.py [kind ...]      API defaults to http://localhost:4000"""
import csv, glob, json, os, sys, urllib.error, urllib.request

API = os.environ.get('API', 'http://localhost:4000') + '/api/admin/import'
HDR = {'x-dev-user': 'S-AD', 'x-dev-role': 'admin', 'Content-Type': 'application/json'}
KIND = {'1-hostels': 'hostels', '2-room-types': 'room_types', '3-rooms': 'rooms', '4-fees': 'fees', '5-room-assets': 'assets',
        '6-room-meters': 'meters', '7-staff-wardens': 'staff', '8-warden-duties': 'duties', '9-students': 'students'}

def call(path, body):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode(), headers=HDR, method='POST')
    try:
        return json.load(urllib.request.urlopen(req))
    except urllib.error.HTTPError as e:
        return {'http': e.code, 'body': e.read().decode()[:400]}

only = sys.argv[1:]
folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'db', 'seed', 'samples')
for path in sorted(glob.glob(os.path.join(folder, '*.csv'))):
    name = os.path.basename(path)[:-4]
    kind = KIND[name]
    if only and kind not in only:
        continue
    rows = list(csv.DictReader(open(path, encoding='utf-8-sig', newline='')))
    chk = call('/%s/check' % kind, {'rows': rows, 'offset': 0})
    res = call('/%s/load' % kind, {'rows': rows, 'offset': 0, 'rows_total': len(rows), 'file_name': name + '.csv'})
    print('%-11s rows=%3d  check ok=%s failed=%s  |  load ok=%s failed=%s batch=%s %s' % (kind, len(rows), chk.get('ok'), chk.get('failed'), res.get('ok'), res.get('failed'), res.get('batch_id'), res.get('body', '')))
    for e in (res.get('errors') or [])[:4]:
        print('      refused row %s (%s): %s' % (e['row'], e.get('key'), e['message']))
