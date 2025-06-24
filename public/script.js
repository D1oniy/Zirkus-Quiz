const socket = io();
const isAdmin = window.location.pathname.includes("admin");
let userName = "";
let userSektor = null;
let sektorBtns = null;
const sektorColors = ["#ef4444","#2563eb","#facc15","#22c55e"];
let sektorNames = ["Sektor 1","Sektor 2","Sektor 3","Sektor 4"];
let barChart = null;
const FRAGEN = [
    {
        frage: "Wie viele verschiedene Plattformen mussten Eltern in der Schulzeit ihres Kindes verstehen lernen?",
        antworten: [
            "2",
            "4",
            "Niemand weiss es. Nicht mal die Schulleitung."
        ],
        richtige: 2
    },
    {
        frage: "Was war 2020 DAS Symbol für modernen Schulunterricht?",
        antworten: [
            "Whiteboard",
            "Videokonferenz",
            "Klassenbuch"
        ],
        richtige: 1
    },
    {
        frage: "Was ist der meistgenutzte Satz kurz vor Schulbeginn?",
        antworten: [
            "„Ich habe nichts zum Anziehen“",
            "„Wo ist mein Rucksack?“",
            "„Könnt ihr mich fahren?“",
            "«WAS WIR HATTEN HAUSAUFGABEN!?»"
        ],
        richtige: 3
    },
    {
        frage: "Wie viele Jahre dauert es in der Schweiz in der Regel, von der 1. Klasse bis zur Lehre?",
        antworten: [
            "10",
            "8",
            "9",
            "Kommt drauf an, in welchem Kanton man fragt"
        ],
        richtige: 0
    },
    {
        frage: "Was passiert, wenn man im Kanton Bern die Sekundarschule nicht besteht?",
        antworten: [
            "Man wird automatisch ins Gymnasium versetzt",
            "Man kann die Schule wiederholen oder auf eine andere Schulform wechseln",
            "Man bekommt Hausarrest bis zum nächsten Jahr",
            "Man darf das erste Lehrjahr überspringen"
        ],
        richtige: 1
    },
    {
        frage: "Was passiert im Lehrerzimmer wirklich?",
        antworten: [
            "Streng geheime Meetings",
            "Kaffee trinken",
            "Kurz über Schüler:inne lästern",
            "Alles – aber wir werden es nie genau erfahren"
        ],
        richtige: 3
    },
    {
        frage: "Welches ist das beliebteste Schulfach?",
        antworten: [
            "Sport",
            "Deutsch",
            "Kein Schulfach ist beliebt",
            "Es kommt auf den Lehrer darauf an"
        ],
        richtige: 0
    },
    {
        frage: "Was ist das beliebteste Schul-Event des Jahres?",
        antworten: [
            "Schul Abschlussfest",
            "Music Night",
            "Ski Lager",
            "Dress up Day"
        ],
        richtige: 0
    },
    {
        frage: "In welchem Fach schläft man am ehesten ein?",
        antworten: [
            "Deutsch",
            "Math",
            "R.Z.G",
            "BG"
        ],
        richtige: 0
    },
    {
        frage: "Welcher Schulhofbereich ist der beliebteste Treffpunkt in der Pause?",
        antworten: [
            "Ping-Pong Tisch",
            "Basketball Platz",
            "Pizza Haus",
            "WC"
        ],
        richtige: 0
    },
    {
        frage: "Welche Lehrer/innen Verschieben am meisten Teste?",
        antworten: [
            "Englisch Lehrer",
            "Mathe Lehrer",
            "Sport Lehrer",
            "Deutsch Lehrer"
        ],
        richtige: 1
    },
    {
        frage: "Was ist das häufigste Missgeschick beim Sportunterricht?",
        antworten: [
            "Kleider Vergessen",
            "Verspätung",
            "Schuhe Vergessen",
            "Fussball in die fresse"
        ],
        richtige: 0
    },
    {
        frage: "In welchem Schulraum passieren die lustigsten Gespräche?",
        antworten: [
            "Niveauraum",
            "Klassenzimmer",
            "Multiraum",
            "Schülerlabor"
        ],
        richtige: 1
    },
    {
        frage: "Welches Schulfach verstehen die Eltern am wenigsten?",
        antworten: [
            "R.Z.G",
            "MUI",
            "E.R.G",
            "W.A.H"
        ],
        richtige: 0
    }
];

// --- Admin-Funktionen ---
if (isAdmin) {
    window.setScreen = screen => socket.emit("set-screen", { screen });
    window.starteBuzzer = () => {
        const idx = document.getElementById("buzzer-frage").value;
        if (idx === "") return alert("Bitte eine Frage auswählen!");
        const frageObj = FRAGEN[idx];
        socket.emit("set-screen", { screen: "buzzer", data: { frage: frageObj.frage } });
    };
    window.starteQuiz = () => {
        const idx = document.getElementById("quiz-frage").value;
        if (idx === "") return alert("Bitte eine Frage auswählen!");
        const frageObj = FRAGEN[idx];
        const richtige = frageObj.richtige;
        const antworten = frageObj.antworten;
        const timer = Number(document.getElementById("quiz-timer").value) || 10;
        socket.emit("set-screen", { screen: "quiz", data: { frage: frageObj.frage, antworten, richtige, timer } });
    };
}
window.addEventListener("DOMContentLoaded", () => {
    if (isAdmin) {
        const buzzerSelect = document.getElementById("buzzer-frage");
        const quizSelect = document.getElementById("quiz-frage");
        FRAGEN.forEach((q, idx) => {
            const opt1 = document.createElement("option");
            opt1.value = idx;
            opt1.textContent = q.frage;
            buzzerSelect.appendChild(opt1);

            const opt2 = document.createElement("option");
            opt2.value = idx;
            opt2.textContent = q.frage;
            quizSelect.appendChild(opt2);
        });
    }
});

// --- Publikum: Name & Sektor ---
if (!isAdmin && document.getElementById("sektorBtns")) {
    sektorBtns = document.getElementById("sektorBtns");
    socket.on("update-sektoren", names => {
        sektorNames = names;
        sektorBtns.innerHTML = "";
        names.forEach((n, i) => {
            const btn = document.createElement("button");
            btn.innerText = n;
            btn.style.background = sektorColors[i];
            btn.className = "text-white font-bold py-2 px-3 rounded-xl shadow transition";
            btn.onclick = () => {
                userSektor = i;
                document.querySelectorAll("#sektorBtns button").forEach(b => b.classList.remove("ring-4", "ring-pink-300"));
                btn.classList.add("ring-4", "ring-pink-300");
                document.getElementById("startBtn").disabled = !document.getElementById("audience-name").value.trim();
            };
            sektorBtns.appendChild(btn);
        });
    });
    document.getElementById("audience-name").oninput = () => {
        document.getElementById("startBtn").disabled = !(document.getElementById("audience-name").value.trim() && userSektor !== null);
    };
    document.getElementById("startBtn").onclick = () => {
        userName = document.getElementById("audience-name").value.trim() || "Anonym";
        socket.emit("register", { name: userName, sektor: userSektor });
        document.getElementById("startArea").style.display = "none";
        document.getElementById("content").innerHTML = "<b>Bitte warten…</b>";
        socket.emit("audience-join");
    };
}

// --- Live-Screen Updates ---
socket.on("screen-update", (screen, data) => {
    if (isAdmin && document.getElementById("admin-content")) showAdmin(screen, data);
    else if (!isAdmin && document.getElementById("content")) showAudience(screen, data);
});

// --- Publikum: Anzeige ---
function showAudience(screen, data) {
    const c = document.getElementById("content");
    if (!c) return;
    c.innerHTML = "";
    if (barChart) { barChart.destroy(); barChart = null; }

    if (screen === "start") {
        c.innerHTML = `<div class="font-bold text-lg">Bitte warten…</div>`;
    }
    if (screen === "buzzer") {
        if (data.buzzerWinner) {
            c.innerHTML = `<div class="text-2xl font-bold">${data.buzzerWinner.name || data.buzzerWinner.id}</div>`;
        } else {
            c.innerHTML = `<div>${data.frage || ""}</div>
                <button onclick="socket.emit('buzzer')" class="bg-red-500 text-white py-2 px-4 rounded">BUZZER!</button>`;
        }
    }
    if (screen === "quiz") {
        let abg = data.abgestimmt || false;
        c.innerHTML = `<div class="font-bold mb-2">${data.frage}</div><div id="ans"></div>`;
        const ansDiv = document.getElementById("ans");
        if (data.antworten) {
            data.antworten.forEach((a, i) => {
                const b = document.createElement("button");
                b.innerText = a; b.className = "m-1 bg-blue-500 text-white py-2 px-3 rounded";
                if (abg) b.disabled = true;
                b.onclick = () => {
                    socket.emit("quiz-answer", i);
                    b.disabled = true;
                };
                ansDiv.appendChild(b);
            });
        }
        if (data.showSolution) {
            c.innerHTML += `<div class="mt-4 text-green-700 font-bold">Richtig: ${["A", "B", "C", "D"][data.richtige]}</div>`;
        }
    }
}

// --- Admin: Anzeige ---
function showAdmin(screen, data) {
    const c = document.getElementById("admin-content");
    if (!c) return;
    c.innerHTML = `<div class="mb-2 text-sm text-gray-600">Screen: ${screen}</div>`;
    // (wer soll angezeigt werden, analog Pub.)
}
