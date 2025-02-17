const ctxChart = document.getElementById('angleChart').getContext('2d');
const socket = io();

function updateStream() {
    const ipAddress = document.getElementById('ipInput').value;
    const statusDiv = document.getElementById('cam-status');

    statusDiv.textContent = 'Connecting...';

    fetch('http://localhost:5000/update_stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip_address: ipAddress })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            statusDiv.textContent = 'Connected successfully';
            const videoFeed = document.getElementById('videoFeed');
            videoFeed.src = 'http://localhost:5000/video_feed?' + new Date().getTime();
        } else {
            statusDiv.textContent = 'Connection failed: ' + data.error;
        }
    })
    .catch(error => {
        statusDiv.textContent = 'Error: ' + error;
    });
}


// Data awal
const labels = [];
const dataPoints = [];

const angleChart = new Chart(ctxChart, {
    type: 'line',
    data: {
        labels: labels,
        datasets: [{
            label: 'Angle (°)',
            data: dataPoints,
            borderColor: 'blue',
            borderWidth: 2,
            fill: false
        }]
    },
    options: {
        responsive: true,
        scales: {
            x: {
                title: { display: true, text: 'Time' },
                ticks: { autoSkip: true, maxTicksLimit: 10 },
                type: 'category', // Menggunakan tipe 'category' untuk sumbu x
            },
            y: {
                title: { display: true, text: 'Angle (°)' },
                suggestedMin: 50,
                suggestedMax: 60
            }
        },
        animation: false // Menonaktifkan animasi untuk update yang lebih cepat
    }
});


/// Angle Illustration Handler
const canvasAngle = document.getElementById('angleCanvas');
const ctxAngle = canvasAngle.getContext('2d');
const angleText = document.getElementById('angleValue');
const centerX = 10 + canvasAngle.width / 2;
const centerY = -55 + canvasAngle.height / 2;
const radius = 100;

function drawAngle(angle) {
    ctxAngle.clearRect(0, 0, canvasAngle.width, canvasAngle.height);

    // Convert angle to radians (clockwise, 0 degrees at 3 o'clock)
    let radians = angle * (Math.PI / 180);
    let x = centerX + radius * Math.cos(radians);
    let y = centerY + radius * Math.sin(radians);

    // Draw angle line with different stroke color
    ctxAngle.beginPath();
    ctxAngle.moveTo(centerX, centerY);
    ctxAngle.lineTo(x, y);
    ctxAngle.strokeStyle = "red";
    ctxAngle.lineWidth = 1;
    ctxAngle.stroke();
    
    // Update angle value
    angleText.textContent = angle;
}

// Menerima data dari WebSocket dan update grafik
socket.on('angleData', (data) => {
    drawAngle(data.angle);

    // Menambahkan data baru ke labels dan dataPoints
    labels.push(data.time);
    dataPoints.push(data.angle);

    // Batasi jumlah data yang ditampilkan (misal 5 data terakhir)
    if (labels.length > 10) {
        labels.shift();
        dataPoints.shift();
    }

    // Update grafik
    angleChart.data.labels = labels;
    angleChart.data.datasets[0].data = dataPoints;
    angleChart.update();
});



///// COM Selection Handler
var lastComPort = "";
document.getElementById('com-port').addEventListener('change', function() {
    let comPortVal = this.value;
    if (comPortVal !== lastComPort) {
        console.log(`Changing COM port to: ${comPortVal}`);

        fetch('/change-port', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comPort: comPortVal })
        })
        .then(response => response.json())
        .then(data => console.log(data.message))
        .catch(error => console.error('Error changing COM port:', error));

        lastComPort = comPortVal;
    }
});


/////////////////// Button Selection Handler
let isRecording = false;
let recordedData = [];
let currentFileName = 'No file imported';

// Fungsi untuk memperbarui informasi di box "Information"
function updateInfoBox() {
    document.getElementById('total-samples').textContent = recordedData.length;
    document.getElementById('current-angle').textContent = recordedData.length > 0 ? `${recordedData[recordedData.length - 1][1]}°` : '0°';
    document.getElementById('recording-status').textContent = isRecording ? 'Yes' : 'No';
    document.getElementById('last-update').textContent = recordedData.length > 0 ? recordedData[recordedData.length - 1][0] : 'Never';
}

document.addEventListener('DOMContentLoaded', () => {
    let fileInfo = document.createElement('div');
    fileInfo.id = 'file-info';
    fileInfo.className = 'text-gray-700 mt-2';
    fileInfo.textContent = `Current File: ${currentFileName}`;
    document.body.prepend(fileInfo);
    updateInfoBox();
});

// Fungsi untuk menampilkan notifikasi popup
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 bg-${type === 'error' ? 'red' : 'green'}-500 text-white px-4 py-2 rounded shadow`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Tombol Record Data
document.getElementById('record-btn').addEventListener('click', () => {
    isRecording = true;
    showNotification('Recording started', 'success');
    document.getElementById('stop-btn').disabled = false;
    updateInfoBox();
});

// Tombol Stop Record
document.getElementById('stop-btn').addEventListener('click', () => {
    isRecording = false;
    showNotification('Recording stopped', 'error');
    document.getElementById('stop-btn').disabled = true;
    updateInfoBox();
});

// Menerima data dari WebSocket dan menyimpannya jika recording aktif
socket.on('angleData', (data) => {
    if (isRecording) {
        recordedData.push([data.time, data.angle]);
        updateInfoBox();
    }
});

// Tombol Export Data
document.getElementById('export-btn').addEventListener('click', () => {
    if (recordedData.length === 0) {
        showNotification('No data recorded to export', 'error');
        return;
    }

    let csvContent = 'Time,Angle\n' + recordedData.map(e => e.join(',')).join('\n');
    let blob = new Blob([csvContent], { type: 'text/csv' });
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'recorded_data.csv';
    link.click();
});

// Tombol Import Data
document.getElementById('import-btn').addEventListener('click', () => {
    let input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.addEventListener('change', (event) => {
        let file = event.target.files[0];
        if (!file) return;

        let reader = new FileReader();
        reader.onload = function (e) {
            let content = e.target.result;
            let rows = content.split('\n').slice(1).map(row => row.split(','));
            
            let existingTimestamps = new Set(recordedData.map(r => r[0]));
            let newData = rows.filter(r => r.length === 2 && !existingTimestamps.has(r[0]))
                              .map(r => [r[0], parseFloat(r[1])]);
            
            recordedData = recordedData.concat(newData);
            currentFileName = file.name;
            document.getElementById('file-info').textContent = `Current File: ${currentFileName}`;
            showNotification('Data imported successfully', 'success');
            updateInfoBox();
        };
        reader.readAsText(file);
    });
    input.click();
});

document.addEventListener("DOMContentLoaded", function () {
    const startCameraButton = document.getElementById("start-camera");
    const stopCameraButton = document.createElement("button");
    const videoElement = document.getElementById("camera-feed");
    let stream = null;

    stopCameraButton.textContent = "Stop Camera";
    stopCameraButton.className = "absolute bottom-4 left-4 bg-red-500 text-white px-3 py-1 rounded-lg shadow hover:bg-red-700 focus:outline-none focus:shadow-outline";
    stopCameraButton.style.display = "none";
    videoElement.parentElement.appendChild(stopCameraButton);

    startCameraButton.addEventListener("click", async function () {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoElement.srcObject = stream;
            startCameraButton.style.display = "none";
            stopCameraButton.style.display = "block";
        } catch (error) {
            console.error("Error accessing camera:", error);
            alert("Could not access the camera. Please check permissions.");
        }
    });

    stopCameraButton.addEventListener("click", function () {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
            startCameraButton.style.display = "block";
            stopCameraButton.style.display = "none";
        }
    });
});