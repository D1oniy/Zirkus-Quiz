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
let userInfos = {}; // Neu: speichert Name und Sektor pro Socket

io.on("connection", sock => {
  sock.emit("update-sektoren", SEKTOR_NAMES);

  sock.on("register", d => {
    if (!akroVoted[sock.id]) akroVoted[sock.id] = [false, false, false];
    userInfos[sock.id] = { name: d.name, sektor: d.sektor };
  });
});
io.on("connection", sock => {
  sock.emit("update-sektoren", SEKTOR_NAMES);

  sock.on("register", d => {
    if (!akroVoted[sock.id]) akroVoted[sock.id] = [false, false, false];
  });

  sock.on("audience-join", () => sock.emit("screen-update", currentScreen, getData(sock.id)));

  sock.on("set-screen", ({ screen, data }) => {
    currentScreen = screen;
if (screen === "buzzer") {
    if (data.buzzerWinner) {
        // Gewinner-View
        if (socket.id === data.buzzerWinner.id) {
            c.innerHTML = `
                <div class="text-2xl font-bold text-green-600 mb-4 animate-bounce">Du warst am schnellsten am Buzzer!<br>Stehe auf und sage die Antwort!</div>
                <canvas id="confetti-canvas" class="fixed inset-0 pointer-events-none"></canvas>
            `;
            startConfetti();
        } else {
            // Für alle anderen: Gewinner-Anzeige in Sektor-Farbe
            const sektorIdx = data.buzzerWinner.sektor ?? 0;
            const sektorColor = sektorColors[sektorIdx] || "#888";
            c.innerHTML = `
                <div class="text-2xl font-bold mb-2" style="color:${sektorColor}">
                    ${data.buzzerWinner.name} [${sektorNames[sektorIdx]}]
                </div>
                <div class="text-lg">war am schnellsten am Buzzer!</div>
            `;
        }
    } else {
        // Runder Buzzer
        c.innerHTML = `
            <div class="mb-6 text-xl font-bold">${data.frage || ""}</div>
            <button id="buzzerBtn"
                class="w-40 h-40 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition text-white text-3xl font-bold shadow-2xl flex items-center justify-center mx-auto animate-pulse"
                style="box-shadow: 0 0 40px 10px #f87171;">
                BUZZER!
            </button>
        `;
        document.getElementById("buzzerBtn").onclick = () => socket.emit("buzzer");
    }
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
      const winnerInfo = userInfos[sock.id] || { name: "Unbekannt", sektor: 0 };
      io.emit("screen-update", "buzzer", {
        frage: questions[currentIdx]?.frage,
        buzzerWinner: { id: sock.id, name: winnerInfo.name, sektor: winnerInfo.sektor }
      });
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
