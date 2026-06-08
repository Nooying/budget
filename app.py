from flask import Flask, Response
import os

app = Flask(__name__)
PORT = int(os.environ.get('PORT', 8080))

@app.route('/')
def index():
    with open(os.path.join('public', 'index.html'), 'r', encoding='utf-8') as f:
        content = f.read()
    return Response(content, mimetype='text/html; charset=utf-8')

@app.route('/<path:filename>')
def static_files(filename):
    filepath = os.path.join('public', filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        return Response(content, mimetype='text/html; charset=utf-8')
    return 'Not found', 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT, debug=False)
