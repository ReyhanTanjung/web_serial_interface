const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const serialController = require('./services/serialController');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// Inisialisasi Serial Controller dengan Socket.IO
serialController.initialize(io);

// Pasang route modular
app.use('/', apiRoutes);

// Middleware 404
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Jalankan server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
