// Neue Version von server.js mit Namen, Sektor, Quiz und Buzzer
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const fragen = [
  {
    frage: "Wie viele verschiedene Plattformen mussten Eltern in der Schulzeit ihres Kindes verstehen lernen?",
    antworten: ["2", "4", "Niemand weiss es. Nicht mal die Schulleitung.", ""],
    richtig: 2
  },
  {
    frage: "Was war 2020 DAS Symbol für modernen Schulunterricht?",
    antworten: ["Whiteboard", "Videokonferenz", "Klassenbuch", ""],
    richtig: 1
  },
  // ... weitere Fragen ...
];

let currentScreen = "start";
let currentQuestionIndex = null;
let buzzerWinner = null;
let answers = {}; // socket.id -> Antwortindex
let audience = {}; // socket.id -> { name, sektor, hasBuzzed }

io.on("connection", (socket) => {
  socket.on("register", ({ name, sektor }) => {
    audience[socket.id] = { name, sektor, hasBuzzed: false };
    socket.emit("registered");
  });

  socket.on("audience-join", () => {
    if (currentScreen === "buzzer" && currentQuestionIndex !== null) {
      const q = fragen[currentQuestionIndex];
      socket.emit("buzzer-question", q.frage);
    }
    if (currentScreen === "quiz" && currentQuestionIndex !== null) {
      const q = fragen[currentQuestionIndex];
      socket.emit("quiz-start", q.frage, q.antworten);
    }
  });

  socket.on("set-screen", (screen, index) => {
    currentScreen = screen;
    currentQuestionIndex = index;
    buzzerWinner = null;
    answers = {};
    for (const id in audience) audience[id].hasBuzzed = false;

    if (screen === "buzzer") {
      const q = fragen[index];
      io.emit("buzzer-question", q.frage);
    }
    if (screen === "quiz") {
      const q = fragen[index];
      io.emit("quiz-start", q.frage, q.antworten);
      setTimeout(() => {
        io.emit("quiz-end", fragen[index].richtig);
      }, 20000);
    }
    if (screen === "start") {
      io.emit("reset");
    }
  });

  socket.on("buzzer", () => {
    const user = audience[socket.id];
    if (!buzzerWinner && currentScreen === "buzzer" && user && !user.hasBuzzed) {
      buzzerWinner = `${user.name} (${user.sektor})`;
      audience[socket.id].hasBuzzed = true;
      io.emit("buzzer-winner", buzzerWinner);
    }
  });

  socket.on("answer", (antwortIndex) => {
    if (currentScreen === "quiz" && !(socket.id in answers)) {
      answers[socket.id] = antwortIndex;
    }
  });

  socket.on("disconnect", () => {
    delete audience[socket.id];
  });
});

const PORT = process.env.PORT || 5500;
http.listen(PORT, () => console.log("Server läuft auf Port", PORT));
