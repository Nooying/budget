from flask import Flask, Response
import os

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HTML_PATH = os.path.join(BASE_DIR, 'public', 'index.html')

with open(HTML_PATH, 'rb') as f:
    HTML_BYTES = f.read()
# Strip BOM if present
if HTML_BYTES.startswith(b'\xef\xbb\xbf'):
    HTML_BYTES = HTML_BYTES[3:]

@app.route('/')
@app.route('/index.html')
def index():
    return Response(
        HTML_BYTES,
        status=200,
        headers={
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
    )

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
