(() => {
  window.onerror = function (msg, src, line, col, err) {
    console.error("Window error:", msg, "at", src + ":" + line + ":" + col, err);
  };

  console.log("script.js loading...");

  const socket = io("http://localhost:3000");

  const canvas = document.getElementById("board");
  if (!canvas) {
    console.error("Canvas element #board not found!");
    return;
  }

  const ctx = canvas.getContext("2d");

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "black";

  let drawing = false;
  let prevX = 0, prevY = 0;
  let lastEmit = 0;
  let isDrawer = false;

  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("room") || "default";

  console.log("Joining room:", roomId);

  // --- UI elements ---
  const clearBtn = document.getElementById("clearBtn");
  const chatBox = document.getElementById("chatBox");
  const sendBtn = document.getElementById("sendBtn");
  const startBtn = document.getElementById("startBtn");

startBtn.addEventListener("click", () => {
  socket.emit("startGame", roomId);
});
  // --- clear board ---
  socket.on("clearBoard", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  clearBtn.addEventListener("click", () => {
    socket.emit("clearBoard", roomId);
  });

  // --- chat send ---
  sendBtn.addEventListener("click", () => {
    const input = document.getElementById("chatInput");
    const message = input.value;

    socket.emit("chatMessage", { roomId, message });

    input.value = "";
  });

  // --- socket events ---
  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
    socket.emit("joinRoom", roomId);
  });

  socket.on("strokeHistory", (strokes) => {
    strokes.forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    });
  });

  socket.on("draw", (data) => {
    if (typeof data.x1 !== "number") return;

    ctx.beginPath();
    ctx.moveTo(data.x1, data.y1);
    ctx.lineTo(data.x2, data.y2);
    ctx.stroke();
  });

  socket.on("playersUpdate", (players) => {
    const playersDiv = document.getElementById("players");

    playersDiv.innerHTML = "<b>Players:</b><br>";

    players.forEach((p, index) => {
      playersDiv.innerHTML += `Player ${index + 1}<br>`;
    });
  });

  socket.on("chatMessage", ({ sender, message }) => {
    const msg = document.createElement("div");
    msg.textContent = `${sender}: ${message}`;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
  });

  socket.on("lobbyState", ({ host, started }) => {
  if (started) {
    startBtn.style.display = "none";
    return;
  }

  if (socket.id && socket.id === host) {
    startBtn.style.display = "block";
    startBtn.disabled = false;
  } else {
    startBtn.style.display = "none";
  }
});

  socket.on("systemMessage", (msg) => {
    const el = document.createElement("div");
    el.style.color = "yellow";
    el.textContent = msg;
    chatBox.appendChild(el);
    chatBox.scrollTop = chatBox.scrollHeight;
  });

  socket.on("gameState", ({ drawer }) => {
    if (drawer) 
    {
      startBtn.style.display = "none";
    }
    const playersDiv = document.getElementById("players");

    // remove old label
    playersDiv.querySelectorAll(".roleLabel").forEach(el => el.remove());

    const label = document.createElement("div");
    label.classList.add("roleLabel");

    if (drawer === socket.id) {
      isDrawer = true;
      clearBtn.style.display = "block";
      label.textContent = "🎨 You are drawing!";
      label.style.color = "yellow";
    } else {
      isDrawer = false;
      clearBtn.style.display = "none";
      label.textContent = "✏️ Guess the word!";
      label.style.color = "lightgreen";
    }

    playersDiv.prepend(label);
  });

  socket.on("scoreUpdate", (scores) => {
  const board = document.getElementById("leaderboard");

  board.innerHTML = "";

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  sorted.forEach(([id, score], index) => {
    const row = document.createElement("div");
    row.textContent = `${index + 1}. Player ${index + 1} - ${score}`;
    board.appendChild(row);
  });
});


  socket.on("timer", (time) => {
  document.getElementById("timer").textContent = time;
});

  socket.onAny((event, ...args) => {
    console.log("Socket event:", event, args);
  });

  // --- drawing ---
  canvas.addEventListener("mousedown", (e) => {
    drawing = true;
    prevX = e.offsetX;
    prevY = e.offsetY;
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!drawing || !isDrawer) return;

    if (Date.now() - lastEmit < 10) return;
    lastEmit = Date.now();

    const x = e.offsetX;
    const y = e.offsetY;

    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.stroke();

    socket.emit("draw", {
      roomId,
      x1: prevX,
      y1: prevY,
      x2: x,
      y2: y
    });

    prevX = x;
    prevY = y;
  });

  ["mouseup", "mouseleave"].forEach((ev) =>
    canvas.addEventListener(ev, () => {
      drawing = false;
    })
  );

  console.log("script.js setup complete");
})();