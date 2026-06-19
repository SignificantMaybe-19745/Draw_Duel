const crypto = require("crypto");

const rooms = {};

const RECONNECT_GRACE_MS = 5 * 60 * 1000; // 5 minutes

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
      disconnected: {}, // token -> { name, score, disconnectAt, cleanupTimer }
    };
  }
  return rooms[roomId];
}

// name: display name typed at join time (used as-is for brand new players;
//   ignored in favor of the saved name when a valid reconnect token matches,
//   since the identity is tied to the token, not whatever was typed)
// token: optional reconnect token from a previous session in THIS room
//
// Returns { room, token, reconnected }
//   token       -> the token the client should store (new, or the same one reused)
//   reconnected -> true if this restored a disconnected player's score
function addPlayer(roomId, socketId, name, token) {
  const room = getRoom(roomId);

  if (!room.host) {
    room.host = socketId;
  }

  let finalToken = token;
  let finalName = name;
  let restoredScore = null;
  let reconnected = false;

  if (token && room.disconnected[token]) {
    const saved = room.disconnected[token];
    clearTimeout(saved.cleanupTimer);
    delete room.disconnected[token];

    finalName = saved.name;
    restoredScore = saved.score;
    reconnected = true;
  } else {
    // No valid token for this room -> brand new identity, even if the
    // client sent a (stale/foreign) token along with it.
    finalToken = crypto.randomUUID();
  }

  // prevent duplicate joins
  const exists = room.players.find(p => p.id === socketId);

  if (!exists) {
    room.players.push({
      id: socketId,
      name: finalName,
      token: finalToken,
    });
  }

  // initialize / restore score
  if (room.scores[socketId] === undefined) {
    room.scores[socketId] = reconnected ? restoredScore : 0;
  }

  return { room, token: finalToken, reconnected };
}

// Called on socket disconnect. Moves the player into the room's
// disconnected bucket (preserving name + score) for RECONNECT_GRACE_MS,
// then removes them from the active players/scores lists.
// Returns the removed player object (or null if not found).
function disconnectPlayer(roomId, socketId) {
  const room = getRoom(roomId);

  const player = room.players.find(p => p.id === socketId);
  if (!player) return null;

  const score = room.scores[socketId] || 0;

  if (player.token) {
    const cleanupTimer = setTimeout(() => {
      delete room.disconnected[player.token];
    }, RECONNECT_GRACE_MS);

    room.disconnected[player.token] = {
      name: player.name,
      score,
      disconnectAt: Date.now(),
      cleanupTimer,
    };
  }

  room.players = room.players.filter(p => p.id !== socketId);
  delete room.scores[socketId];

  return player;
}

function removePlayer(socketId) {
  for (const roomId in rooms) {
    const room = rooms[roomId];
    room.players = room.players.filter(
  p => p.id !== socketId
);
  }
}

const words = require("./words");

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
  disconnectPlayer,
  getRandomWord,
  nextDrawer,
  getWordChoices,
  getWordHint,
};