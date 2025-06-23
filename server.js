const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const SEKTOR_COLORS = ["#ef4444", "#2563eb", "#facc15", "#22c55e"];
const SEKTOR_NAMES = ["Sektor 1", "Sektor 2", "Sektor 3", "Sektor 4"];
const THEATER_NAMEN = ["Person 1", "Person 2", "Person 3", "Person 4", "Person 5", "Person 6", "Person 7"];
const HOBBY_NAMEN = ["Reiter 1", "Reiter 2", "Reiter 3", "Reiter 4", "Reiter 5", "Reiter 6", "Reiter 7"];

let audience = {};
let screen = "start";
let gruppePunkte = [0,0,0,0];
let buzzerFrage = "";
let buzzerWinnerId = null;

let quiz = {
    frage: "",
    antworten: [],
    richtige: 0,
    antwortenProSektor: [[],[],[],[]],
    richtigProSektor: [0,0,0,0],
    countdown: 0,
    timer: 10,
    done: false,
    siegerSektor: null
};
let quizInterval = null;

// AKRO separat für alle drei Shows
let akroBewertungen1 = [];
let akroBewertungen2 = [];
let akroBewertungen3 = [];
let akroVoted = {};

let murderVotes = {};
let komplizeVotes = {};
let hobbyVotes = {};

io.on("connection", (socket) => {
    socket.on("register", ({ name, sektor }) => {
        audience[socket.id] = { name, sektor: Number(sektor) };
        if (!akroVoted[socket.id]) akroVoted[socket.id] = [false,false,false];
    });

    socket.emit("update-sektoren", SEKTOR_NAMES);

    socket.on("audience-join", () => {
        socket.emit("screen-update", screen, getScreenData(screen, socket.id));
    });

    socket.on("buzzer", () => {
        if (screen === "buzzer" && !buzzerWinnerId && audience[socket.id]) {
            buzzerWinnerId = socket.id;
            gruppePunkte[audience[socket.id].sektor]++;
            for (let sid of Object.keys(audience)) {
                io.to(sid).emit("screen-update", "buzzer", {
                    frage: buzzerFrage,
                    buzzerWinner: {
                        name: audience[socket.id].name,
                        sektor: audience[socket.id].sektor,
                        deinId: sid === socket.id
                    }
                });
            }
        }
    });

    socket.on("quiz-answer", (antwort) => {
        if (screen === "quiz" && audience[socket.id] && !quiz.done) {
            const sektor = audience[socket.id].sektor;
            if (quiz.antwortenProSektor[sektor].includes(socket.id)) return;
            quiz.antwortenProSektor[sektor].push(socket.id);
            if (antwort === quiz.richtige) {
                quiz.richtigProSektor[sektor]++;
            }
            io.emit("screen-update", screen, getScreenData("quiz"));
        }
    });

    socket.on("akro-bewerten", ({ show, wertung }) => {
        const idx = show-1;
        if (["akro1","akro2","akro3"].includes("akro"+show) && audience[socket.id]) {
            if (!akroVoted[socket.id]) akroVoted[socket.id] = [false,false,false];
            if (akroVoted[socket.id][idx]) return;
            if (show === 1) akroBewertungen1.push(wertung);
            if (show === 2) akroBewertungen2.push(wertung);
            if (show === 3) akroBewertungen3.push(wertung);
            akroVoted[socket.id][idx] = true;
            io.emit("screen-update", "akro"+show, getScreenData("akro"+show, socket.id));
        }
    });

    socket.on("murder-vote", (idx) => {
        if (screen === "murder" && audience[socket.id]) {
            murderVotes[socket.id] = idx;
            io.emit("screen-update", "murder", getScreenData("murder"));
        }
    });
    socket.on("komplize-vote", (idx) => {
        if (screen === "komplize" && audience[socket.id]) {
            komplizeVotes[socket.id] = idx;
            io.emit("screen-update", "komplize", getScreenData("komplize"));
        }
    });
    socket.on("hobby-vote", (idx) => {
        if (screen === "hobby" && audience[socket.id]) {
            hobbyVotes[socket.id] = idx;
            io.emit("screen-update", "hobby", getScreenData("hobby"));
        }
    });

    socket.on("set-screen", ({screen: scr, data}) => {
        screen = scr;
        if (scr === "buzzer") {
            buzzerWinnerId = null;
            buzzerFrage = data?.frage || "";
        }
        if (scr === "quiz") {
            if(quizInterval) clearInterval(quizInterval);
            quiz = {
                frage: data.frage,
                antworten: data.antworten,
                richtige: data.richtige,
                antwortenProSektor: [[],[],[],[]],
                richtigProSektor: [0,0,0,0],
                countdown: data.timer || 10,
                timer: data.timer || 10,
                done: false,
                siegerSektor: null
            };
            startQuizCountdown();
        }
        if (scr.startsWith("akro")) {
            let nr = parseInt(scr.replace("akro", ""), 10);
            if(nr === 1) akroBewertungen1 = [];
            if(nr === 2) akroBewertungen2 = [];
            if(nr === 3) akroBewertungen3 = [];
            for(const id of Object.keys(audience)) {
                if(!akroVoted[id]) akroVoted[id] = [false,false,false];
                akroVoted[id][nr-1] = false;
            }
        }
        if (scr === "murder") murderVotes = {};
        if (scr === "komplize") komplizeVotes = {};
        if (scr === "hobby") hobbyVotes = {};
        io.emit("screen-update", scr, getScreenData(scr));
    });

    socket.on("disconnect", () => {
        delete audience[socket.id];
        delete akroVoted[socket.id];
        delete murderVotes[socket.id];
        delete komplizeVotes[socket.id];
        delete hobbyVotes[socket.id];
    });
});

function startQuizCountdown() {
    if(quizInterval) clearInterval(quizInterval);
    quiz.countdown = quiz.timer;
    quiz.done = false;
    io.emit("screen-update", "quiz", getScreenData("quiz"));
    quizInterval = setInterval(()=>{
        quiz.countdown--;
        if (quiz.countdown <= 0) {
            clearInterval(quizInterval);
            quiz.done = true;
            let max = Math.max(...quiz.richtigProSektor);
            let sieger = quiz.richtigProSektor.findIndex(r=>r===max && max>0);
            quiz.siegerSektor = sieger>=0 ? sieger : null;
            if(sieger>=0) gruppePunkte[sieger]++;
            io.emit("screen-update", "quiz", getScreenData("quiz"));
        } else {
            io.emit("screen-update", "quiz", getScreenData("quiz"));
        }
    }, 1000);
}

// AKRO DURCHSCHNITTE
function getAkroDurchschnitte() {
    function avg(arr) {
        return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : "0.00";
    }
    return [
        avg(akroBewertungen1),
        avg(akroBewertungen2),
        avg(akroBewertungen3)
    ];
}

function getScreenData(screen, sockid) {
    if (screen === "start") return {};
    if (screen === "buzzer") {
        let winner = null;
        if(buzzerWinnerId && audience[buzzerWinnerId]) {
            winner = {
                name: audience[buzzerWinnerId].name,
                sektor: audience[buzzerWinnerId].sektor,
                deinId: sockid && (buzzerWinnerId === sockid)
            }
        }
        return { frage: buzzerFrage, buzzerWinner: winner };
    }
    if (screen === "quiz") {
        let abgestimmt = false;
        if(sockid && audience[sockid]) {
            const sektor = audience[sockid].sektor;
            if(quiz.antwortenProSektor[sektor].includes(sockid)) abgestimmt = true;
        }
        return {
            frage: quiz.frage,
            antworten: quiz.antworten,
            richtige: quiz.richtige,
            countdown: quiz.countdown,
            antwortCounts: quiz.done ? quiz.richtigProSektor : null,
            showSolution: quiz.done,
            siegerSektor: quiz.siegerSektor,
            abgestimmt
        };
    }
    if (screen.startsWith("akro")) {
        const nr = parseInt(screen.replace("akro", ""), 10);
        let arr = nr===1?akroBewertungen1:nr===2?akroBewertungen2:akroBewertungen3;
        let avg = arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2) : "0";
        let abgestimmt = !!(sockid && akroVoted[sockid] && akroVoted[sockid][nr-1]);
        return {
            showNr: nr,
            abgestimmt,
            chart: {labels:["Durchschnitt"], values: [avg]},
            allAkroAverages: getAkroDurchschnitte()
        }
    }
    if (screen === "murder") {
        let abgestimmt = !!(sockid && murderVotes[sockid] !== undefined);
        return {
            namen: THEATER_NAMEN,
            title: "Wer ist der Moerder?",
            chart: makeVoteChart(THEATER_NAMEN, murderVotes),
            abgestimmt
        }
    }
    if (screen === "komplize") {
        let abgestimmt = !!(sockid && komplizeVotes[sockid] !== undefined);
        return {
            namen: THEATER_NAMEN,
            title: "Wer ist der Komplize?",
            chart: makeVoteChart(THEATER_NAMEN, komplizeVotes),
            abgestimmt
        }
    }
    if (screen === "hobby") {
        let abgestimmt = !!(sockid && hobbyVotes[sockid] !== undefined);
        return {
            namen: HOBBY_NAMEN,
            title: "Wer war der beste Hobby Horsing Reiter?",
            chart: makeVoteChart(HOBBY_NAMEN, hobbyVotes),
            abgestimmt
        }
    }
    return {};
}

function makeVoteChart(namen, votes) {
    let counts = Array(namen.length).fill(0);
    Object.values(votes).forEach(idx=>{
        if(idx>=0 && idx<namen.length) counts[idx]++;
    });
    return {labels: namen, values: counts};
}

const PORT = process.env.PORT || 5500;
http.listen(PORT, () => console.log("Server läuft auf Port", PORT));
