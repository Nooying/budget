from flask import Flask, send_file, make_response
import os

app = Flask(__name__)
PORT = int(os.environ.get('PORT', 8080))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

@app.route('/')
@app.route('/index.html')
def index():
    path = os.path.join(BASE_DIR, 'public', 'index.html')
    response = make_response(send_file(path, mimetype='text/html'))
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT, debug=False)
