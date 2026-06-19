(() => {
  window.onerror = function (msg, src, line, col, err) {
    console.error("Window error:", msg, "at", src + ":" + line + ":" + col, err);
  };

  const socket = io({
  autoConnect: false
});

  const canvas = document.getElementById("board");
  if (!canvas) { console.error("Canvas #board not found!"); return; }

  const ctx = canvas.getContext("2d");

  let drawing = false;
  let prevX = 0, prevY = 0;
  let lastEmit = 0;
  let isDrawer = false;
  let isDrawing = false;
  let currentColor = "#000000";
  let currentSize = 3;
  let currentPlayers = [];
  const joinScreen = document.getElementById("joinScreen");
  const joinBtn = document.getElementById("joinBtn");
  const nameInput = document.getElementById("nameInput");
  const roomInput = document.getElementById("roomInput");
  let roomId = "";
  let playerName = "";
  const overlay = document.getElementById("wordOverlay");
  const wordChoicesDiv = document.getElementById("wordChoices");
  const hintBox = document.getElementById("hintBox");
  const colorButtons = document.querySelectorAll(".colorBtn");
const sizeButtons = document.querySelectorAll(".sizeBtn");
  const timerBox = document.getElementById("timer");
  hintBox.classList.add("hiddenUI");
  timerBox.classList.add("hiddenUI");
  const gameOverOverlay = document.getElementById("gameOverOverlay");
  const finalScores = document.getElementById("finalScores");
  const restartBtn = document.getElementById("restartBtn");
  // --- Canvas sizing ---
  function resizeCanvas() {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCanvas.getContext("2d").drawImage(canvas, 0, 0);

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    
    if (tempCanvas.width > 0 && tempCanvas.height > 0) {
      ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, canvas.width, canvas.height);
    }
    ctx.lineWidth = currentSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = currentColor;
  }

  
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height
    };
  }

  window.addEventListener("load", resizeCanvas);
  window.addEventListener("resize", resizeCanvas);

  // --- UI elements ---
  const clearBtn = document.getElementById("clearBtn");
  const chatBox = document.getElementById("chatBox");
  const startBtn = document.getElementById("startBtn");
  const chatInput = document.getElementById("chatInput");

  colorButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    colorButtons.forEach((b) =>
      b.classList.remove("active")
    );

    btn.classList.add("active");

    currentColor = btn.dataset.color;
  });
});

sizeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    sizeButtons.forEach((b) =>
      b.classList.remove("active")
    );

    btn.classList.add("active");

    currentSize = Number(btn.dataset.size);
  });
});

  // --- Player color/label helpers ---
  const PLAYER_COLORS = ["#42a5f5", "#ef5350", "#66bb6a", "#ffd54a", "#ab47bc", "#ff7043"];
  const playerIndexMap = {};
  let playerCounter = 0;

  function getPlayerIndex(id) {
    if (!(id in playerIndexMap)) playerIndexMap[id] = playerCounter++;
    return playerIndexMap[id];
  }
  function getPlayerColor(id) {
    return PLAYER_COLORS[getPlayerIndex(id) % PLAYER_COLORS.length];
  }
  const playerNames = {};

function getPlayerLabel(id) {
  return playerNames[id] || "Unknown";
}

  // --- Chat ---
  function appendChat({ name, nameColor, text, isSystem, isCorrect }) {
    const msg = document.createElement("div");
    msg.className = isCorrect ? "chat-correct" : "chat-msg";

    if (!isSystem && !isCorrect) {
      const nameEl = document.createElement("div");
      nameEl.className = "chat-name";
      nameEl.style.color = nameColor || "#aaa";
      nameEl.textContent = name;
      msg.appendChild(nameEl);
    }

    const textEl = document.createElement("div");
    textEl.className = isSystem ? "chat-system" : "chat-text";
    textEl.textContent = text;
    msg.appendChild(textEl);

    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function sendChat() {
    const message = chatInput.value.trim();
    if (!message) return;
    socket.emit("chatMessage", { roomId, message });
    chatInput.value = "";
  }

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChat();
  });

  // --- Buttons ---
  startBtn.addEventListener("click", () => socket.emit("startGame", roomId));
  clearBtn.addEventListener("click", () => socket.emit("clearBoard", roomId));

  // --- Socket events ---
  joinBtn.addEventListener("click", () => {
  const name = nameInput.value.trim();
  const room = roomInput.value.trim();

  if (!name || !room) return;

  playerName = name;
  roomId = room;

  socket.connect();
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);

  socket.emit("joinRoom", {
    roomId,
    name: playerName
  });

  joinScreen.style.display = "none";
});

  socket.on("clearBoard", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  socket.on("strokeHistory", (strokes) => {
    strokes.forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(s.x1 * canvas.width, s.y1 * canvas.height);
      ctx.lineTo(s.x2 * canvas.width, s.y2 * canvas.height);
      ctx.strokeStyle = s.color || "#111";
      ctx.lineWidth = (s.size || 0.005) * canvas.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    });
  });

  socket.on("draw", (data) => {
    if (typeof data.x1 !== "number") return;
    ctx.beginPath();
    ctx.moveTo(data.x1 * canvas.width, data.y1 * canvas.height);
    ctx.lineTo(data.x2 * canvas.width, data.y2 * canvas.height);
    ctx.strokeStyle = data.color || "#111";
    ctx.lineWidth = (data.size || 0.005) * canvas.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  });

  socket.on("playersUpdate", (players) => {
  currentPlayers = players.map(p => p.id);

  players.forEach((p) => {
    playerNames[p.id] = p.name;
  });
});

  socket.on("chatMessage", ({ sender, message }) => {
    appendChat({
      name: getPlayerLabel(sender),
      nameColor: getPlayerColor(sender),
      text: message,
    });
  });
  socket.on("chooseWord", (choices) => {
    hintBox.classList.add("hiddenUI");
timerBox.classList.add("hiddenUI");
  overlay.classList.remove("hidden");
  wordChoicesDiv.innerHTML = "";

  choices.forEach((word) => {
    const btn = document.createElement("button");
    btn.className = "wordBtn";
    btn.textContent = word;

    btn.onclick = () => {
      socket.emit("selectWord", { roomId, word });
      overlay.classList.add("hidden");
    };

    wordChoicesDiv.appendChild(btn);
  });
});

  socket.on("roundTransition", () => {
  hintBox.classList.add("hiddenUI");
  timerBox.classList.add("hiddenUI");
});

  socket.on("wordHint", (hint) => {
  hintBox.classList.remove("hiddenUI");
  timerBox.classList.remove("hiddenUI");

  hintBox.textContent = hint;
});
  socket.on("systemMessage", (msg) => {
    const isCorrect = msg.toLowerCase().includes("guessed correctly") || msg.includes("✓");
    appendChat({ text: msg, isSystem: true, isCorrect });
  });

  socket.on("lobbyState", ({ host, started }) => {
    if (started) { startBtn.style.display = "none"; return; }
    if (socket.id && socket.id === host) {
      startBtn.style.display = "block";
      startBtn.disabled = false;
    } else {
      startBtn.style.display = "none";
    }
  });

  socket.on("gameOver", ({ scores, winner }) => {
  gameOverOverlay.classList.remove("hidden");
  hintBox.classList.add("hiddenUI");
timerBox.classList.add("hiddenUI");
  finalScores.innerHTML = "";

  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1]);

  sorted.forEach(([id, score], index) => {
    const row = document.createElement("div");
    row.className = "finalRow";

    row.innerHTML = `
      <span>
        ${index === 0 ? "👑" : "#"+(index+1)}
        ${getPlayerLabel(id)}
      </span>

      <span>${score}</span>
    `;

    finalScores.appendChild(row);
  });
});
  socket.on("gameState", ({ drawer }) => {
    overlay.classList.add("hidden");
    if (drawer) startBtn.style.display = "none";

    const statusBox = document.getElementById("statusBox");
    statusBox.innerHTML = "";

    const label = document.createElement("div");
    label.className = "roleLabel";
    label.style.cssText = "font-size:12px;padding:6px 8px;border-radius:6px;margin-bottom:6px;";

    if (drawer === socket.id) {
      isDrawer = true;
      clearBtn.style.display = "block";
      label.textContent = "🎨 You are drawing!";
      label.style.background = "#2a2500";
      label.style.color = "#ffd54a";
    } else {
      isDrawer = false;
      clearBtn.style.display = "none";
      label.textContent = "✏️ Guess the word!";
      label.style.background = "#1a2f1a";
      label.style.color = "#66bb6a";
    }

    statusBox.appendChild(label);
  });

  socket.on("scoreUpdate", (scores) => {
    const board = document.getElementById("leaderboard");
    board.innerHTML = "";
    const medals = ["🥇", "🥈", "🥉"];
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([id, score], index) => {
      const row = document.createElement("div");
      row.className = "lb-row";
      const left = document.createElement("span");
      left.textContent = `${medals[index] || (index + 1 + ".")} ${getPlayerLabel(id)}`;
      const right = document.createElement("span");
      right.textContent = score;
      right.style.color = "#ffd54a";
      row.appendChild(left);
      row.appendChild(right);
      board.appendChild(row);
    });
  });

  socket.on("timer", (time) => {
    const el = document.getElementById("timer");
    el.textContent = time;
    el.style.background = time <= 10 ? "#ef5350" : "#ffd54a";
    el.style.color = time <= 10 ? "#fff" : "#111";
  });

  socket.onAny((event, ...args) => {
    console.log("Socket event:", event, args);
  });

    // --- Drawing ---
  canvas.style.touchAction = "none";

  canvas.addEventListener("pointerdown", (e) => {
    if (!isDrawer) return;

    drawing = true;
    canvas.setPointerCapture?.(e.pointerId);

    const pos = getPos(e);
    prevX = pos.x;
    prevY = pos.y;
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!drawing || !isDrawer) return;
    if (Date.now() - lastEmit < 10) return;
    lastEmit = Date.now();

    const pos = getPos(e);
    const x = pos.x;
    const y = pos.y;

    ctx.beginPath();
    ctx.moveTo(prevX * canvas.width, prevY * canvas.height);
    ctx.lineTo(x * canvas.width, y * canvas.height);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    socket.emit("draw", {
      roomId,
      x1: prevX,
      y1: prevY,
      x2: x,
      y2: y,
      color: currentColor,
      size: currentSize / canvas.width,
    });

    prevX = x;
    prevY = y;
  });

  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) =>
    canvas.addEventListener(ev, () => {
      drawing = false;
    })
  );
  console.log("script.js ready");
})();