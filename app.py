from flask import Flask, Response, request, jsonify
import os

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

# ---- Serve HTML ----
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HTML_PATH = os.path.join(BASE_DIR, 'public', 'index.html')

with open(HTML_PATH, 'rb') as f:
    HTML_BYTES = f.read()
if HTML_BYTES.startswith(b'\xef\xbb\xbf'):
    HTML_BYTES = HTML_BYTES[3:]

@app.route('/')
@app.route('/index.html')
def index():
    return Response(HTML_BYTES, status=200, headers={
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
    })

# ---- API: get all data ----
@app.route('/api/all', methods=['GET'])
def get_all():
    if not DATABASE_URL:
        return jsonify({})
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT key, value FROM app_data')
        rows = cur.fetchall()
        conn.close()
        return jsonify({r[0]: r[1] for r in rows})
    except Exception as e:
        print(f'get_all error: {e}')
        return jsonify({}), 500

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT, debug=False)
