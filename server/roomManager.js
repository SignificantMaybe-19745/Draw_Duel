const rooms = {};

function getRoom(roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      strokes: [],
      players: [],
      scores: {},
      drawer: null,
      word: "apple",
      round: 1,
      timeLeft:60
    };
  }
  return rooms[roomId];
}

function addPlayer(roomId, socketId) {
  const room = getRoom(roomId);
  room.players.push(socketId);
  return room;
}

function removePlayer(socketId) {
  for (const roomId in rooms) {
    const room = rooms[roomId];
    room.players = room.players.filter(id => id !== socketId);
  }
}

const words = ["apple", "dog", "car", "house", "tree"];

function getRandomWord() {
  return words[Math.floor(Math.random() * words.length)];
}

function nextDrawer(room) {
  if (room.players.length === 0) {
    room.drawer = null;
    return;
  }

  const currentIndex = room.players.indexOf(room.drawer);
  const nextIndex = (currentIndex + 1) % room.players.length;

  room.drawer = room.players[nextIndex];
}

module.exports = {
  rooms,
  getRoom,
  addPlayer,
  removePlayer,
  getRandomWord,
  nextDrawer
};