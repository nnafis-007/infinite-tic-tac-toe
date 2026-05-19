const cells = Array.from(document.querySelectorAll(".cell"));
const turnLabel = document.querySelector("#turn");
const statusLabel = document.querySelector("#status");
const warningLabel = document.querySelector("#warning");
const resetButton = document.querySelector("#reset");
const themeToggle = document.querySelector("#theme-toggle");
const celebration = document.querySelector("#celebration");

const players = [
  { name: "Player 1", mark: "X", className: "x", colorLabel: "blue" },
  { name: "Player 2", mark: "O", className: "o", colorLabel: "red" },
];

const moveHistory = {
  X: [],
  O: [],
};

let currentPlayer = 0;
let gameOver = false;
let audioContext;

const winPatterns = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const updateTurnLabel = () => {
  const player = players[currentPlayer];
  turnLabel.innerHTML = `${player.name} (<span class="${player.className}">${player.mark}</span>) turn`;
};

const updateStatus = (message) => {
  statusLabel.textContent = message;
};

const clearPendingDeleteHighlights = () => {
  cells.forEach((cell) => cell.classList.remove("pending-delete"));
};

const updateDeleteWarning = () => {
  clearPendingDeleteHighlights();

  if (gameOver) {
    warningLabel.textContent = "";
    return;
  }

  const player = players[currentPlayer];
  const history = moveHistory[player.mark];

  if (history.length < 3) {
    warningLabel.textContent = "";
    return;
  }

  const oldestIndex = history[0];
  const oldestCell = cells[oldestIndex];
  if (oldestCell) {
    oldestCell.classList.add("pending-delete");
  }
  warningLabel.textContent = `Next delete: ${player.mark} in cell ${oldestIndex + 1}`;
};

const updateTurnState = () => {
  updateTurnLabel();
  updateDeleteWarning();
};

const clearCell = (cell) => {
  cell.textContent = "";
  cell.classList.remove("x", "o", "fade-out", "pending-delete");
  cell.removeAttribute("data-mark");
};

const fadeAndClear = (cell) => {
  clearCell(cell);
  cell.classList.add("fade-out");
  cell.addEventListener(
    "animationend",
    () => {
      cell.classList.remove("fade-out");
    },
    { once: true }
  );
};

const popCell = (cell) => {
  cell.classList.remove("pop");
  void cell.offsetWidth;
  cell.classList.add("pop");
};

const trimPlayerMoves = (mark) => {
  if (moveHistory[mark].length < 3) {
    return;
  }

  const oldestIndex = moveHistory[mark].shift();
  const oldestCell = cells[oldestIndex];

  if (oldestCell) {
    fadeAndClear(oldestCell);
  }
};

const getAudioContext = () => {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
};

const playTone = (frequency, duration, type = "sine", gain = 0.08, delay = 0) => {
  const context = getAudioContext();
  const oscillator = context.createOscillator();
  const amp = context.createGain();
  const now = context.currentTime + delay;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(amp);
  amp.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
};

const playMoveSound = (mark) => {
  const frequency = mark === "X" ? 520 : 360;
  playTone(frequency, 0.08, "triangle", 0.08);
};

const playWinSound = () => {
  playTone(520, 0.12, "sine", 0.09, 0);
  playTone(660, 0.12, "sine", 0.08, 0.08);
  playTone(820, 0.14, "sine", 0.08, 0.16);
};

const updateResetLabel = () => {
  resetButton.textContent = gameOver ? "Play again" : "Reset";
};

const getWinner = () => {
  const board = cells.map((cell) => cell.dataset.mark || "");
  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return "";
};

const spawnConfetti = () => {
  celebration.innerHTML = "";
  celebration.classList.add("active");

  const emojis = ["🎉", "✨", "🎆", "🎇", "🥳"];
  const count = 26;

  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.top = `${Math.random() * 20}%`;
    piece.style.animationDelay = `${Math.random() * 0.2}s`;
    celebration.appendChild(piece);
  }

  window.setTimeout(() => {
    celebration.classList.remove("active");
    celebration.innerHTML = "";
  }, 1800);
};

const endGame = (winnerMark) => {
  const winner = players.find((player) => player.mark === winnerMark);
  if (!winner) {
    return;
  }
  gameOver = true;
  updateStatus(`Game over, winner: ${winner.name}`);
  turnLabel.textContent = "";
  warningLabel.textContent = "";
  clearPendingDeleteHighlights();
  spawnConfetti();
  playWinSound();
  updateResetLabel();
};

const resetGame = () => {
  cells.forEach((cell) => clearCell(cell));
  moveHistory.X = [];
  moveHistory.O = [];
  currentPlayer = 0;
  gameOver = false;
  updateStatus("");
  updateTurnState();
  celebration.classList.remove("active");
  celebration.innerHTML = "";
  updateResetLabel();
};

const placeMark = (cell, index) => {
  const player = players[currentPlayer];

  if (gameOver || cell.dataset.mark) {
    return;
  }

  trimPlayerMoves(player.mark);

  cell.textContent = player.mark;
  cell.dataset.mark = player.mark;
  cell.classList.add(player.className);
  popCell(cell);
  moveHistory[player.mark].push(index);
  playMoveSound(player.mark);

  const winner = getWinner();
  if (winner) {
    endGame(winner);
    return;
  }

  currentPlayer = currentPlayer === 0 ? 1 : 0;
  updateTurnState();
};

cells.forEach((cell, index) => {
  cell.addEventListener("click", () => placeMark(cell, index));
});

resetButton.addEventListener("click", resetGame);

themeToggle.addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
  themeToggle.textContent = document.documentElement.classList.contains("dark")
    ? "Light mode"
    : "Dark mode";
});

updateTurnState();
updateStatus("");
updateResetLabel();
