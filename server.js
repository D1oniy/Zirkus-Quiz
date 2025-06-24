const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const SEKTOR_NAMES = ["Sektor 1", "Sektor 2", "Sektor 3", "Sektor 4"];

let currentScreen = "start";
let questions = [];
let currentIdx = null;
let buzzerWinnerId = null;
let akroVoted = {};
let quizState = { answers: {}, done: false };
let userInfos = {}; // speichert Name und Sektor pro Socket

io.on("connection", sock => {
    sock.emit("update-sektoren", SEKTOR_NAMES);

    sock.on("register", d => {
        if (!akroVoted[sock.id]) akroVoted[sock.id] = [false, false, false];
        userInfos[sock.id] = { name: d.name, sektor: d.sektor };
    });

    sock.on("audience-join", () => sock.emit("screen-update", currentScreen, getData(sock.id)));

    sock.on("set-screen", ({ screen, data }) => {
        currentScreen = screen;
        if (screen === "buzzer") {
            buzzerWinnerId = null;
            questions[0] = data;
            currentIdx = 0;
            io.emit("screen-update", "buzzer", { frage: data.frage });
        }
        if (screen === "quiz") {
            questions[0] = data;
            currentIdx = 0;
            quizState = { answers: {}, done: false };
            const endTime = Date.now() + ((data.timer || 20) * 1000) + 1000; // +1 Sekunde für "21" Start
            io.emit("screen-update", "quiz", { frage: data.frage, antworten: data.antworten, endTime });
            setTimeout(() => {
                quizState.done = true;
                const sektorCorrect = [0, 0, 0, 0];
                for (const [sockid, answer] of Object.entries(quizState.answers)) {
                    const info = userInfos[sockid];
                    if (info && answer === data.richtige) {
                        sektorCorrect[info.sektor] = (sektorCorrect[info.sektor] || 0) + 1;
                    }
                }
                io.emit("screen-update", "quiz", {
                    frage: data.frage,
                    antworten: data.antworten,
                    richtige: data.richtige,
                    showSolution: true,
                    sektorCorrect
                });
            }, (data.timer || 20) * 1000 + 1000); // +1 Sekunde für "21" Start
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
            if (!(sock.id in quizState.answers)) {
                quizState.answers[sock.id] = i;
                sock.emit("screen-update", "quiz", {
                    frage: questions[currentIdx].frage,
                    antworten: questions[currentIdx].antworten,
                    abgestimmt: true,
                    endTime: getQuizEndTime()
                });
            }
        }
    });
});

function getData(sockid) {
    // Kann für spätere Features genutzt werden
    return {};
}

function getQuizEndTime() {
    // Ermittle das aktuelle EndTime für Quiz, falls jemand später joint
    if (questions[0] && questions[0].timer) {
        // Suche nach dem letzten gesendeten endTime
        return Date.now() + ((questions[0].timer || 20) * 1000);
    }
    return undefined;
}

http.listen(5500);
