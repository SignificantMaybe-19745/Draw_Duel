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
      timeLeft: 120,
      started: false,
      state: "waiting",
      correctGuessers: [],
      host: null
    };
  }
  return rooms[roomId];
}

function addPlayer(roomId, socketId) {
  const room = getRoom(roomId);

  if (!room.host) {
    room.host = socketId;
  }

  // prevent duplicate joins
  if (!room.players.includes(socketId)) {
    room.players.push(socketId);
  }

  // initialize score for new player
  if (room.scores[socketId] === undefined) {
    room.scores[socketId] = 0;
  }

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
  nextDrawer,
  getWordChoices,
  getWordHint,
};