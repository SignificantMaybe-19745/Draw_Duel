(() => {
  window.onerror = function (msg, src, line, col, err) {
    console.error("Window error:", msg, "at", src + ":" + line + ":" + col, err);
  };

  const socket = io("http://localhost:3000");

  const canvas = document.getElementById("board");
  if (!canvas) { console.error("Canvas #board not found!"); return; }

  const ctx = canvas.getContext("2d");

  let currentColor = "#111111";
  let brushSize = 3;
  let drawing = false;
  let prevX = 0, prevY = 0;
  let lastEmit = 0;
  let isDrawer = false;

  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("room") || "default";

  // --- Canvas sizing ---
  function resizeCanvas() {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCanvas.getContext("2d").drawImage(canvas, 0, 0);

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.drawImage(tempCanvas, 0, 0);
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = currentColor;
  }

  // Get mouse position correctly relative to canvas internal resolution
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  window.addEventListener("load", resizeCanvas);
  window.addEventListener("resize", resizeCanvas);

  // --- UI elements ---
  const clearBtn = document.getElementById("clearBtn");
  const chatBox = document.getElementById("chatBox");
  const startBtn = document.getElementById("startBtn");
  const chatInput = document.getElementById("chatInput");

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
  function getPlayerLabel(id) {
    return `Player ${getPlayerIndex(id) + 1}`;
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
  socket.on("connect", () => {
    console.log("Connected:", socket.id);
    socket.emit("joinRoom", roomId);
  });

  socket.on("clearBoard", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  socket.on("strokeHistory", (strokes) => {
    strokes.forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.strokeStyle = s.color || "#111";
      ctx.lineWidth = s.size || 3;
      ctx.stroke();
    });
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
  });

  socket.on("draw", (data) => {
    if (typeof data.x1 !== "number") return;
    ctx.beginPath();
    ctx.moveTo(data.x1, data.y1);
    ctx.lineTo(data.x2, data.y2);
    ctx.strokeStyle = data.color || "#111";
    ctx.lineWidth = data.size || 3;
    ctx.stroke();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
  });

  socket.on("playersUpdate", (players) => {
    const playersDiv = document.getElementById("players");
    playersDiv.innerHTML = "";
    players.forEach((p) => {
      const id = typeof p === "string" ? p : p.id;
      const row = document.createElement("div");
      row.className = "player-row";
      const dot = document.createElement("div");
      dot.className = "player-dot";
      dot.style.background = getPlayerColor(id);
      const name = document.createElement("span");
      name.textContent = getPlayerLabel(id);
      row.appendChild(dot);
      row.appendChild(name);
      playersDiv.appendChild(row);
    });
  });

  socket.on("chatMessage", ({ sender, message }) => {
    appendChat({
      name: getPlayerLabel(sender),
      nameColor: getPlayerColor(sender),
      text: message,
    });
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

  socket.on("gameState", ({ drawer }) => {
    if (drawer) startBtn.style.display = "none";

    const playersDiv = document.getElementById("players");
    playersDiv.querySelectorAll(".roleLabel").forEach(el => el.remove());

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

    playersDiv.prepend(label);
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
  canvas.addEventListener("mousedown", (e) => {
    drawing = true;
    const pos = getPos(e);
    prevX = pos.x;
    prevY = pos.y;
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!drawing || !isDrawer) return;
    if (Date.now() - lastEmit < 10) return;
    lastEmit = Date.now();

    const pos = getPos(e);
    const x = pos.x;
    const y = pos.y;

    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    ctx.stroke();

    socket.emit("draw", {
      roomId,
      x1: prevX, y1: prevY,
      x2: x, y2: y,
      color: currentColor,
      size: brushSize,
    });

    prevX = x;
    prevY = y;
  });

  ["mouseup", "mouseleave"].forEach((ev) =>
    canvas.addEventListener(ev, () => { drawing = false; })
  );

  console.log("script.js ready");
})();