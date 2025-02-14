const { SerialPort, ReadlineParser } = require('serialport');

let port = null;
let parser = null;
let currentSerialPort = 'COM1';
const BAUD_RATE = 9600;
let io = null;

function initialize(ioInstance) {
    io = ioInstance;
    openSerialPort(currentSerialPort);
}

function openSerialPort(comPort) {
    if (port) {
        port.close((err) => {
            if (err) console.error('Error closing port:', err.message);
        });
    }

    port = new SerialPort({
        path: comPort,
        baudRate: BAUD_RATE,
        autoOpen: false,
    });

    parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

    port.open((err) => {
        if (err) {
            return console.error('Error opening port:', err.message);
        }
        console.log(`Serial port ${comPort} opened`);
    });

    parser.on('data', (data) => {
        const angle = parseAngleData(data);
        if (angle !== null && io) {
            console.log("Parsed Angle:", angle);
            io.emit('angleData', { angle, time: new Date().toLocaleTimeString() });
        }
    });

    port.on('error', (err) => {
        console.error('Serial port error:', err.message);
    });
}

function parseAngleData(data) {
    const match = data.trim().match(/^\$ANGL,(-?\d+(\.\d+)?)$/);
    return match ? parseFloat(match[1]) : null;
}

function changePort(comPort) {
    if (comPort !== currentSerialPort) {
        currentSerialPort = comPort;
        openSerialPort(comPort);
        return `COM port changed to ${comPort}`;
    } else {
        return `COM port is already set to ${comPort}`;
    }
}

module.exports = {
    initialize,
    changePort,
};
