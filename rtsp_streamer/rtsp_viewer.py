from flask import Flask, Response, request, jsonify, render_template
from flask_cors import CORS
import cv2
import threading

app = Flask(__name__)
CORS(app)

USERNAME = 'admin'
PASSWORD = 'Alphaangle'
PORT = '554'
current_ip = '192.168.121.159'
current_rtsp_url = f'rtsp://{USERNAME}:{PASSWORD}@{current_ip}:{PORT}/Streaming/Channels/101'
camera_thread = None
frame_buffer = None
stop_thread = False

def capture_frames():
    global frame_buffer, stop_thread
    cap = cv2.VideoCapture(current_rtsp_url)
    while not stop_thread:
        success, frame = cap.read()
        if success:
            _, buffer = cv2.imencode('.jpg', frame)
            frame_buffer = buffer.tobytes()
        else:
            break
    cap.release()

@app.route('/')
def index():
    return render_template('index.html')

def generate_frames():
    global frame_buffer
    while True:
        if frame_buffer is not None:
            yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + frame_buffer + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/update_stream', methods=['POST'])
def update_stream():
    global current_ip, current_rtsp_url, camera_thread, stop_thread
    data = request.get_json()
    new_ip = data.get('ip_address')
    if not new_ip:
        return jsonify({'success': False, 'error': 'No IP address provided'})

    new_rtsp_url = f'rtsp://{USERNAME}:{PASSWORD}@{new_ip}:{PORT}/Streaming/Channels/101'
    if camera_thread and camera_thread.is_alive():
        stop_thread = True
        camera_thread.join()

    stop_thread = False
    current_ip = new_ip
    current_rtsp_url = new_rtsp_url

    try:
        camera_thread = threading.Thread(target=capture_frames)
        camera_thread.start()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    camera_thread = threading.Thread(target=capture_frames)
    camera_thread.start()
    app.run(host='0.0.0.0', port=5000, threaded=True)
