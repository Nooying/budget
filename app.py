from flask import Flask, Response
import os

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HTML_PATH = os.path.join(BASE_DIR, 'public', 'index.html')

with open(HTML_PATH, 'rb') as f:
    HTML_BYTES = f.read()
if HTML_BYTES.startswith(b'\xef\xbb\xbf'):
    HTML_BYTES = HTML_BYTES[3:]

FILE_SIZE = len(HTML_BYTES)
FIRST_200 = HTML_BYTES[:200].decode('utf-8', errors='replace')

@app.route('/debug')
def debug():
    return Response(
        f'<html><body><h2>Debug Info</h2>'
        f'<p>File path: {HTML_PATH}</p>'
        f'<p>File size: {FILE_SIZE} bytes</p>'
        f'<p>First 200 chars:</p>'
        f'<pre>{FIRST_200}</pre>'
        f'</body></html>',
        status=200,
        headers={'Content-Type': 'text/html; charset=utf-8'}
    )

@app.route('/')
@app.route('/index.html')
def index():
    return Response(
        HTML_BYTES,
        status=200,
        headers={
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Content-Type-Options': 'nosniff',
        }
    )

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
