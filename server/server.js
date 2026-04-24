console.log("NEW SERVER STARTED");

const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const registerSocketHandlers = require("./socketHandler");

const app = express();

// serve frontend
const frontendPath = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendPath));

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", (socket) => {
  registerSocketHandlers(io, socket);
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT}`);
});