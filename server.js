const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const SEKTOR_NAMES = ["Sektor 1", "Sektor 2", "Sektor 3", "Sektor 4"];

let currentScreen = "start";
let questions = [ /* …deine Fragen… */ ];
let currentIdx = null;
let buzzerWinnerId = null;
let akroVoted = {};
let quizState = { answers: {}, done: false };

io.on("connection", sock => {
  sock.emit("update-sektoren", SEKTOR_NAMES);

  sock.on("register", d => {
    if (!akroVoted[sock.id]) akroVoted[sock.id] = [false, false, false];
  });

  sock.on("audience-join", () => sock.emit("screen-update", currentScreen, getData(sock.id)));

  sock.on("set-screen", ({ screen, data }) => {
    currentScreen = screen;
    if (screen === "buzzer") {
      buzzerWinnerId = null;
      // Save the current question for the buzzer round
      questions[0] = data; // Always use index 0 for simplicity
      currentIdx = 0;
      io.emit("screen-update", "buzzer", { frage: data.frage });
    }
    if (screen === "quiz") {
      questions[0] = data; // Always use index 0 for simplicity
      currentIdx = 0;
      quizState = { answers: {}, done: false };
      io.emit("screen-update", "quiz", { frage: data.frage, antworten: data.antworten });
      setTimeout(() => {
        quizState.done = true;
        io.emit("screen-update", "quiz", { ...getData() });
      }, (data.timer || 20) * 1000);
    }
    if (screen === "start") {
      io.emit("screen-update", "start", {});
    }
  });

  sock.on("buzzer", () => {
    if (currentScreen === "buzzer" && !buzzerWinnerId) {
      buzzerWinnerId = sock.id;
      io.emit("screen-update", "buzzer", { frage: questions[currentIdx].frage, buzzerWinner: { id: sock.id } });
    }
  });

  sock.on("quiz-answer", i => {
    if (currentScreen === "quiz" && !quizState.done) {
      quizState.answers[sock.id] = i;
      // kein weiteres Handling hier
    }
  });
});
function getData(sockid) {
  // Implementiere hier die gewünschte Logik
  return {};
}

http.listen(5500);
