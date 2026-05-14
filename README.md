# ⚔️ DrawDuel

DrawDuel is a real-time multiplayer drawing-and-guessing game inspired by Skribbl.io, built using vanilla JavaScript, HTML5 Canvas, Node.js, Express, and Socket.IO.

Players join rooms, take turns drawing selected words, and compete to guess correctly before time runs out. The project focuses heavily on realtime synchronization, multiplayer game-state management, and smooth gameplay UX.

---

# 🚀 Live Demo

🔗 https://draw-duel-traf.onrender.com

---

# ✨ Features

## 🎮 Multiplayer Gameplay
- Real-time multiplayer rooms
- Host-controlled game start
- Automatic drawer rotation
- Turn-based gameplay system
- End-game scoreboard and winner detection

## ✏️ Drawing System
- HTML5 Canvas based drawing
- Real-time drawing synchronization using Socket.IO
- Brush color selection
- Multiple brush sizes
- Clear board functionality
- Drawing permissions (only current drawer can draw)

## 🧠 Guessing Mechanics
- Live chat system
- Server-side correct guess validation
- Hidden answers in chat
- Progressive word hint reveal system
- Auto-end round when everyone guesses correctly

## 🏆 Game State & Scoring
- Live leaderboard updates
- Drawer bonus scoring
- Round timer system
- Match lifecycle handling
- Final game-over screen
- Replay support

## 🛡️ Stability Features
- Drawer disconnect recovery
- Empty room cleanup
- Timer cleanup and interval protection
- Duplicate game-start prevention

---

# 🧱 Tech Stack

## Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- HTML5 Canvas

## Backend
- Node.js
- Express.js
- Socket.IO

## Deployment
- Render

---

# 🏗️ Project Structure

```bash
server/
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── roomManager.js
├── socketHandler.js
├── words.js
├── server.js
└── package.json
