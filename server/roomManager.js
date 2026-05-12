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
      turnsPlayed: 0,
      maxRounds: 3,
      timeLeft: 120,
      started: false,
      state: "waiting",
      correctGuessers: [],
      host: null,
      timer: null,
    };
  }
  return rooms[roomId];
}

function addPlayer(roomId, socketId, name) {
  const room = getRoom(roomId);

  if (!room.host) {
    room.host = socketId;
  }

  // prevent duplicate joins
  const exists = room.players.find(p => p.id === socketId);

  if (!exists) {
    room.players.push({
      id: socketId,
      name
    });
  }

  // initialize score
  if (room.scores[socketId] === undefined) {
    room.scores[socketId] = 0;
  }

  return room;
}

function removePlayer(socketId) {
  for (const roomId in rooms) {
    const room = rooms[roomId];
    room.players = room.players.filter(
  p => p.id !== socketId
);
  }
}

const words = ["apple", "dog", "car", "house", "tree"];

function getRandomWord() {
  return words[Math.floor(Math.random() * words.length)];
}
function getWordChoices() {
  const shuffled = [...words].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}
function getWordHint(word, timeLeft) {
  if (!word) return "";

  const revealCount = Math.floor((120 - timeLeft) / 30);

  const indices = [];

  while (indices.length < revealCount) {
    const rand = Math.floor(Math.random() * word.length);

    if (
      word[rand] !== " " &&
      !indices.includes(rand)
    ) {
      indices.push(rand);
    }
  }

  return word
    .split("")
    .map((char, index) => {
      if (char === " ") return " ";
      return indices.includes(index) ? char : "_";
    })
    .join(" ");
}
function nextDrawer(room) {
  if (room.players.length === 0) {
    room.drawer = null;
    return;
  }

  const currentIndex = room.players.findIndex(
    p => p.id === room.drawer
  );

  const nextIndex = (currentIndex + 1) % room.players.length;

  room.drawer = room.players[nextIndex].id;
}

module.exports = {
  rooms,
  getRoom,
  addPlayer,
  removePlayer,
  getRandomWord,
  nextDrawer,
  getWordChoices,
  getWordHint,
};