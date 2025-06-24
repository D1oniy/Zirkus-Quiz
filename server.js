const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

// Fragenbank
const questions = [
  {frage:"Wie viele verschiedene Plattformen mussten Eltern in der Schulzeit ihres Kindes verstehen lernen?",antworten:["2","4","Niemand weiss es. Nicht mal die Schulleitung.",""],richtig:0},
  {frage:"Was war 2020 DAS Symbol für modernen Schulunterricht?",antworten:["Whiteboard","Videokonferenz","Klassenbuch",""],richtig:1},
  {frage:"Was ist der meistgenutzte Satz kurz vor Schulbeginn?",antworten:["Ich habe nichts zum Anziehen","Wo ist mein Rucksack?","Könnt ihr mich fahren?","WAS WIR HATTEN HAUSAUFGABEN!?"],richtig:3},
  {frage:"Wie viele Jahre dauert es in der Schweiz in der Regel, von der 1. Klasse bis zur Lehre?",antworten:["10","8","9","Kommt drauf an, in welchem Kanton man fragt"],richtig:2},
  {frage:"Was passiert, wenn man im Kanton Bern die Sekundarschule nicht besteht?",antworten:["Automatisch ins Gymnasium","Schule wiederholen/wechseln","Hausarrest","Lehrjahr überspringen"],richtig:1},
  {frage:"Was passiert im Lehrerzimmer wirklich?",antworten:["Meetings","Kaffee trinken","Über Schüler lästern","Alles – wir wissen es nicht"],richtig:3},
  {frage:"Welches ist das beliebteste Schulfach?",antworten:["Sport","Deutsch","Kein Fach","Kommt aufs Lehren an"],richtig:0},
  {frage:"Was ist das beliebteste Schul-Event des Jahres?",antworten:["Abschlussfest","Music Night","Ski Lager","Dress up Day"],richtig:2},
  {frage:"In welchem Fach schläft man am ehesten ein?",antworten:["Deutsch","Math","R.Z.G","BG"],richtig:2},
  {frage:"Welcher Schulhofbereich ist der beliebteste Treffpunkt?",antworten:["Ping-Pong","Basketball","Pizza Haus","WC"],richtig:1},
  {frage:"Welche Lehrer/innen verschieben am meisten Tests?",antworten:["Englisch","Mathe","Sport","Deutsch"],richtig:0},
  {frage:"Häufigstes Missgeschick beim Sportunterricht?",antworten:["Kleider vergessen","Verspätung","Schuhe vergessen","Fussball ins Gesicht"],richtig:3},
  {frage:"In welchem Raum passieren die lustigsten Gespräche?",antworten:["Niveauraum","Klassenzimmer","Multiraum","Schülerlabor"],richtig:1},
  {frage:"Welches Fach verstehen die Eltern am wenigsten?",antworten:["R.Z.G","MUI","E.R.G","W.A.H"],richtig:0}
];

let screen = "start", idx = null;
let buzzerWinner = null;

const clients = {}; // socket.id -> {name,sektor,hasBuzzed}

io.on("connection", socket => {
  // Sektoren an Publikum senden
  socket.emit("sektoren", ["Rot","Blau","Grün","Gelb"]);

  // Registrierung
  socket.on("register", ({name,sektor}) => {
    clients[socket.id] = {name,sektor,hasBuzzed:false};
    socket.emit("registered");
  });

  // Publikum join
  socket.on("audience-join", () => {
    socket.emit("update", screen, getData());
  });

  // Admin steuert Screen
  socket.on("admin-set", ({mode, questionIdx, timer}) => {
    screen = mode;
    idx = questionIdx;
    buzzerWinner = null;
    Object.values(clients).forEach(c=>c.hasBuzzed=false);

    if (mode === "buzzer") {
      io.emit("update","buzzer",{frage:questions[idx].frage});
    }
    if (mode === "quiz") {
      io.emit("update","quiz",{frage:questions[idx].frage,antworten:questions[idx].antworten});
      setTimeout(()=>{
        io.emit("update","quiz",{frage:questions[idx].frage,antworten:questions[idx].antworten,richtige:questions[idx].richtig,showSolution:true});
      }, (timer||20)*1000);
    }
    if (mode === "start") {
      io.emit("update","start", {});
    }
  });

  // Buzzer
  socket.on("buzz", () => {
    const c = clients[socket.id];
    if (screen==="buzzer" && !buzzerWinner && c && !c.hasBuzzed) {
      buzzerWinner = `${c.name} (${c.sektor})`;
      c.hasBuzzed = true;
      io.emit("update","buzzer",{frage:questions[idx].frage,buzzerWinner});
    }
  });

  // Quiz-Antwort
  socket.on("answer", i => {
    // bloß speichern, keine weitere Logik nötig hier
  });

  socket.on("disconnect", ()=>delete clients[socket.id]);
});

function getData(){
  if (screen==="buzzer") return {frage:questions[idx].frage,buzzerWinner};
  if (screen==="quiz")  return {frage:questions[idx].frage,antworten:questions[idx].antworten};
  return {};
}

const PORT = 8080;
http.listen(PORT, ()=>console.log("Server läuft auf",PORT));
