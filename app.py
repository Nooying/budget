from flask import Flask, Response, request, jsonify
import os, json

app = Flask(__name__)
PORT = int(os.environ.get('PORT', 8080))
DATABASE_URL = os.environ.get('DATABASE_URL')

# ---- DB helpers ----
def get_db():
    import psycopg2
    return psycopg2.connect(DATABASE_URL, sslmode='require')

def init_db():
    if not DATABASE_URL:
        print('No DATABASE_URL — running without DB')
        return
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('''
            CREATE TABLE IF NOT EXISTS app_data (
                key VARCHAR(100) PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        ''')
        conn.commit()
        conn.close()
        print('DB initialized OK')
    except Exception as e:
        print(f'DB init error: {e}')

init_db()

# ---- Load HTML template ----
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HTML_PATH = os.path.join(BASE_DIR, 'public', 'index.html')

with open(HTML_PATH, 'rb') as f:
    raw = f.read()
if raw.startswith(b'\xef\xbb\xbf'):
    raw = raw[3:]
HTML_TEMPLATE = raw.decode('utf-8')

# ---- Load all data from DB ----
def load_all_from_db():
    if not DATABASE_URL:
        return {}
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT key, value FROM app_data')
        rows = cur.fetchall()
        conn.close()
        return {r[0]: r[1] for r in rows}
    except Exception as e:
        print(f'load_all error: {e}')
        return {}

# ---- Serve HTML with injected DB data ----
@app.route('/')
@app.route('/index.html')
def index():
    data = load_all_from_db()
    # Inject as window.__BUDGET_DATA__ so localStorage fallback works on any device
    data_json = json.dumps(data, ensure_ascii=False)
    # Escape </script> inside JSON
    data_json = data_json.replace('</script>', '<\\/script>')
    preload = (
        '<script>'
        '(function(){'
        'var s=' + data_json + ';'
        'window.__BUDGET_DATA__=s;'
        'Object.entries(s).forEach(function(e){'
        'try{localStorage.setItem(e[0],e[1]);}catch(x){}'
        '});'
        '})();'
        '</script>'
    )
    html = HTML_TEMPLATE.replace('</head>', preload + '\n</head>', 1)
    return Response(html.encode('utf-8'), status=200, headers={
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
    })

# ---- Serve Excel template ----
@app.route('/import_templates.xlsx')
def download_template():
    import mimetypes
    path = os.path.join(BASE_DIR, 'public', 'import_templates.xlsx')
    if not os.path.exists(path):
        return Response('File not found', status=404)
    with open(path, 'rb') as f:
        data = f.read()
    return Response(data, status=200, headers={
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="import_templates.xlsx"',
    })

# ---- API: FX Rates (BOT → fallback open.er-api.com) ----
@app.route('/api/fx_rates')
def get_fx_rates():
    import urllib.request, datetime
    today_str = datetime.date.today().strftime('%Y-%m-%d')
    bot_key = os.environ.get('BOT_API_KEY', '')

    # 1) Try Bank of Thailand (BOT) API
    if bot_key:
        try:
            url = (
                'https://apigw1.bot.or.th/bot/public/Stat-ExchangeRate/v2/DAILY_AVG_EXG_RATE/'
                f'?start_period={today_str}&end_period={today_str}'
            )
            req = urllib.request.Request(url, headers={
                'X-IBM-Client-Id': bot_key,
                'accept': 'application/json',
            })
            with urllib.request.urlopen(req, timeout=6) as r:
                data = json.loads(r.read())
            rates = {}
            for item in data.get('result', {}).get('data', {}).get('data_detail', []):
                cid = item.get('currency_id', '').strip()
                # mid_rate preferred; fall back to selling_sight
                mid = item.get('mid_rate') or item.get('selling_sight') or item.get('buying_sight')
                if cid and mid:
                    try:
                        rates[cid] = round(float(str(mid).replace(',', '')), 4)
                    except Exception:
                        pass
            if rates:
                return jsonify({'source': 'BOT', 'date': today_str, 'rates': rates})
        except Exception as e:
            print(f'BOT API error: {e}')

    # 2) Fallback: open.er-api.com (free, no key required)
    try:
        url = 'https://open.er-api.com/v6/latest/THB'
        with urllib.request.urlopen(url, timeout=6) as r:
            data = json.loads(r.read())
        raw = data.get('rates', {})  # raw[X] = X per 1 THB → invert to get THB per 1 X
        rates = {}
        for code, rate in raw.items():
            if rate and float(rate) != 0:
                rates[code] = round(1.0 / float(rate), 4)
        return jsonify({'source': 'open.er-api.com', 'date': today_str, 'rates': rates})
    except Exception as e:
        print(f'open.er-api.com error: {e}')
        return jsonify({'error': str(e), 'rates': {}}), 200  # 200 so frontend doesn't crash

# ---- API: get all data ----
@app.route('/api/all', methods=['GET'])
def get_all():
    return jsonify(load_all_from_db())

# ---- API: save one key ----
@app.route('/api/data', methods=['POST'])
def set_data():
    if not DATABASE_URL:
        return jsonify({'ok': True})
    try:
        data = request.json
        key = data['key']
        value = data['value']
        conn = get_db()
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO app_data (key, value, updated_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (key) DO UPDATE SET value=%s, updated_at=NOW()
        ''', (key, value, value))
        conn.commit()
        conn.close()
        return jsonify({'ok': True})
    except Exception as e:
        print(f'set_data error: {e}')
        return jsonify({'error': str(e)}), 500

# ---- API: status / health check ----
@app.route('/api/status', methods=['GET'])
def status():
    db_ok = False
    row_count = 0
    keys = []
    if DATABASE_URL:
        try:
            conn = get_db()
            cur = conn.cursor()
            cur.execute('SELECT key FROM app_data ORDER BY key')
            rows = cur.fetchall()
            conn.close()
            db_ok = True
            row_count = len(rows)
            keys = [r[0] for r in rows]
        except Exception as e:
            return jsonify({'db_connected': False, 'error': str(e), 'DATABASE_URL_set': True})
    return jsonify({
        'db_connected': db_ok,
        'DATABASE_URL_set': bool(DATABASE_URL),
        'row_count': row_count,
        'keys': keys,
    })

# ---- API: bulk sync (push multiple keys at once) ----
@app.route('/api/sync', methods=['POST'])
def bulk_sync():
    if not DATABASE_URL:
        return jsonify({'ok': False, 'error': 'No DATABASE_URL'})
    try:
        data = request.json  # {key: value, ...}
        conn = get_db()
        cur = conn.cursor()
        for key, value in data.items():
            cur.execute('''
                INSERT INTO app_data (key, value, updated_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (key) DO UPDATE SET value=%s, updated_at=NOW()
            ''', (key, value, value))
        conn.commit()
        conn.close()
        return jsonify({'ok': True, 'synced': len(data)})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT, debug=False)
