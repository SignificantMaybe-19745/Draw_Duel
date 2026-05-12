const {
  rooms,
  getRoom,
  addPlayer,
  removePlayer,
  getRandomWord,
  nextDrawer,
  getWordChoices,
  getWordHint,
} = require("./roomManager");


function registerSocketHandlers(io, socket) {

function endRound(roomId) {
  console.log("END ROUND CALLED");
  const room = getRoom(roomId);

  io.to(roomId).emit("systemMessage", `⏰ Time's up! Word was: ${room.word}`);

  let count = 3;
  if (room.drawer && room.correctGuessers.length > 0) {

  let totalGuesserPoints = 0;

  room.correctGuessers.forEach((id) => {
    totalGuesserPoints += room.scores[id] || 0;
  });

  const avg = Math.floor(totalGuesserPoints / room.correctGuessers.length);
  const drawerBonus = Math.floor(avg * 0.4);

  if (!room.scores[room.drawer]) room.scores[room.drawer] = 0;
  room.scores[room.drawer] += drawerBonus;

  io.to(roomId).emit(
    "systemMessage",
    `🎨 Drawer earned +${drawerBonus}`
  );

  io.to(roomId).emit("scoreUpdate", room.scores);
}
  const countdown = setInterval(() => {
    io.to(roomId).emit("systemMessage", `Next round in ${count}...`);
    count--;

    if (count < 0) {
  clearInterval(countdown);

  room.turnsPlayed++;

  const totalTurns = room.players.length * room.maxRounds;

  console.log("TURNS:", room.turnsPlayed);

  if (room.turnsPlayed >= totalTurns) {
    console.log("GAME OVER NOW");
    endGame(roomId);
    return;
  }

  nextDrawer(room);

  room.round =
    Math.floor(room.turnsPlayed / room.players.length) + 1;

  startRound(roomId);
}
  }, 1000);
}
  
  function endGame(roomId) {
  const room = getRoom(roomId);

  room.started = false;
  room.state = "waiting";

  const sorted = Object.entries(room.scores)
    .sort((a, b) => b[1] - a[1]);

  const winnerId = sorted[0]?.[0];

  io.to(roomId).emit("gameOver", {
    scores: room.scores,
    winner: winnerId
  });

  io.to(roomId).emit(
    "systemMessage",
    `🏆 ${winnerId} wins the game!`
  );
}
  socket.on("startGame", (roomId) => {
  const room = getRoom(roomId);

  if (socket.id !== room.host) return;
  if (room.players.length < 2) return;

  room.started = true;
  room.state = "playing";
  room.drawer = room.players[0]?.id;
  room.turnsPlayed = 0;
  room.round = 1;
  room.scores = {};

  room.players.forEach(player => {
  room.scores[player.id] = 0;
});
  startRound(roomId);
  });

  function startRound(roomId) {
  const room = getRoom(roomId);
  room.correctGuessers = [];
  room.strokes = [];
  room.timeLeft = 120;
  room.word = null; // not decided yet
  const choices = getWordChoices();

  io.to(roomId).emit("clearBoard");

  // send state separately
  room.players.forEach((player) => {
     const playerId = player.id;
    const target = io.sockets.sockets.get(playerId);

    if (!target) return;

    if (playerId === room.drawer) {
  target.emit("chooseWord", choices);
} else {
  target.emit("systemMessage", "⏳ Drawer is choosing a word...");
}
  });

  
  }

    console.log("🔥 SOCKET CONNECTED", socket.id);

   socket.on("joinRoom", ({ roomId, name }) => {
  socket.join(roomId);

  const room = addPlayer(roomId, socket.id, name);

  io.to(roomId).emit("playersUpdate", room.players);
  io.to(roomId).emit("scoreUpdate", room.scores);
  // Always update lobby info
  io.to(roomId).emit("lobbyState", {
    host: room.host,
    players: room.players,
    started: room.started
  });

  // If game has already started, send proper gameState per player
  if (room.started) {
    room.players.forEach((player) => {
  const playerId = player.id;

  const target = io.sockets.sockets.get(playerId);

  if (!target) return;

  target.emit("gameState", {
    drawer: room.drawer,
    word: playerId === room.drawer ? room.word : null
  });
});
  }

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
  for (const roomId in rooms) {
    const room = getRoom(roomId);

    room.players = room.players.filter(
  p => p.id !== socket.id
);

    // remove score entry
    delete room.scores[socket.id];

    // if host left, assign new host
    if (room.host === socket.id) {
      room.host = room.players[0]?.id || null;
    }

    // if drawer left, assign next available player
    if (room.drawer === socket.id) {
      room.drawer = room.players[0]?.id || null;
    }

    // delete room if empty
    if (room.players.length === 0) {
      delete rooms[roomId];
      console.log(`🧹 Deleted empty room: ${roomId}`);
      continue;
    }

    io.to(roomId).emit("playersUpdate", room.players);
    io.to(roomId).emit("scoreUpdate", room.scores);

    io.to(roomId).emit("lobbyState", {
      host: room.host,
      players: room.players,
      started: room.started
    });

    io.to(roomId).emit("gameState", {
      drawer: room.drawer
    });
  }

  console.log("Player disconnected:", socket.id);
});
socket.on("selectWord", ({ roomId, word }) => {
  const room = getRoom(roomId);

  if (socket.id !== room.drawer) return;

  room.word = word;

  // send gameState now
  room.players.forEach((player) => {
    const playerId = player.id;
    const target = io.sockets.sockets.get(playerId);
    if (!target) return;

    target.emit("gameState", {
      drawer: room.drawer,
      word: playerId === room.drawer ? word : null
    });
  });

  // start timer NOW
  clearInterval(room.timer);
  room.timer = setInterval(() => {
    room.timeLeft--;

    io.to(roomId).emit("timer", room.timeLeft);
    room.players.forEach((player) => {
    const playerId = player.id;
    const target = io.sockets.sockets.get(playerId);

  if (!target) return;

  if (playerId === room.drawer) {
    target.emit("wordHint", room.word);
  } else {
    target.emit(
      "wordHint",
      getWordHint(room.word, room.timeLeft)
    );
  }
});
    if (room.timeLeft <= 0) {
      clearInterval(room.timer);
      endRound(roomId);
    }
  }, 1000);
});
  socket.on("chatMessage", ({ roomId, message }) => {
  const room = getRoom(roomId);

  const guess = message.toLowerCase().trim();
  const answer = room.word.toLowerCase();

  if (guess === answer) {

  // prevent duplicate scoring
  if (room.correctGuessers.includes(socket.id)) return;

  const playerCount = room.players.length;
  const guessOrder = room.correctGuessers.length;

  // base by lobby size
  let base = 80;
  if (playerCount === 3) base = 100;
  else if (playerCount === 4) base = 120;
  else if (playerCount >= 5) base = 150;

  // order bonus
  let orderBonus = 20;
  if (guessOrder === 0) orderBonus = 100;
  else if (guessOrder === 1) orderBonus = 70;
  else if (guessOrder === 2) orderBonus = 40;

  // speed bonus
  const speedBonus = room.timeLeft * 2;

  const total = base + orderBonus + speedBonus;

  if (!room.scores[socket.id]) room.scores[socket.id] = 0;
  room.scores[socket.id] += total;

  room.correctGuessers.push(socket.id);

  io.to(roomId).emit(
    "systemMessage",
    `${socket.id} guessed correctly! +${total} 🎉`
  );

  io.to(roomId).emit("scoreUpdate", room.scores);

  return;
}

  io.to(roomId).emit("chatMessage", {
    sender: socket.id,
    message
  });
});
}

module.exports = registerSocketHandlers;