from flask import Flask, jsonify

PORT = 5000

app = Flask(__name__)

@app.route('/health')
def health():
    return jsonify({'status': 'ok'})



if __name__ == '__main__':
    app.run(debug=True, port=PORT)
