const {
  rooms,
  getRoom,
  addPlayer,
  removePlayer,
  getRandomWord,
  nextDrawer
} = require("./roomManager");


function registerSocketHandlers(io, socket) {

  function startRound(roomId) {
  const room = getRoom(roomId);

  room.strokes = [];
  room.timeLeft = 60;
  room.word = getRandomWord();

  io.to(roomId).emit("clearBoard");

  // send state separately
  room.players.forEach((playerId) => {
    const target = io.sockets.sockets.get(playerId);

    if (!target) return;

    target.emit("gameState", {
      drawer: room.drawer,
      word: playerId === room.drawer ? room.word : null
    });
  });

  const timer = setInterval(() => {
    room.timeLeft--;

    io.to(roomId).emit("timer", room.timeLeft);

    if (room.timeLeft <= 0) {
      clearInterval(timer);

      nextDrawer(room);
      room.round++;

      startRound(roomId);
    }

  }, 1000);
}

  console.log("🔥 SOCKET CONNECTED", socket.id);

  socket.on("joinRoom", (roomId) => {

    

    socket.join(roomId);

    const room = addPlayer(roomId, socket.id);

     // ✅ send players list
  io.to(roomId).emit("playersUpdate", room.players);
    // if first player → becomes drawer
    if (!room.drawer) {
  room.drawer = socket.id;
  startRound(roomId);
}

    // notify all clients
    io.to(roomId).emit("gameState", {
      drawer: room.drawer
    });

    socket.emit("strokeHistory", room.strokes);
  });

  socket.on("draw", (data) => {
    const { roomId } = data;

    const room = getRoom(roomId);

    if(socket.id !== room.drawer) return;

    room.strokes.push(data);

    console.log("STROKES:", room.strokes.length);

    socket.to(roomId).emit("draw", data);
  });

  socket.on("clearBoard", (roomId) => {
    const room = getRoom(roomId);

     if (socket.id !== room.drawer) return;

    room.strokes = [];

    io.to(roomId).emit("clearBoard");
  });

  socket.on("disconnect", () => {

  for (const roomId in require("./roomManager").rooms) {

    const room = getRoom(roomId);

    room.players = room.players.filter(id => id !== socket.id);

    // if drawer left → assign new one
    if (room.drawer === socket.id) {
      room.drawer = room.players[0] || null;
    }

    io.to(roomId).emit("playersUpdate", room.players);

    io.to(roomId).emit("gameState", {
      drawer: room.drawer
    });
  }

  console.log("Player disconnected:", socket.id);
});

  socket.on("chatMessage", ({ roomId, message }) => {

  const room = getRoom(roomId);

  console.log("CHAT:", message);

  io.to(roomId).emit("chatMessage", {
    sender: socket.id,
    message
  });

  if (message.toLowerCase() === room.word) {

    io.to(roomId).emit("systemMessage", `${socket.id} guessed correctly! 🎉`);

  }
  // check guess

});
}

module.exports = registerSocketHandlers;