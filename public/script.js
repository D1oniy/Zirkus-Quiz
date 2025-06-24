const socket = io();
const isAdmin = window.location.pathname.includes("admin");
let userName = "";
let userSektor = null;
let sektorBtns = null;
const sektorColors = ["#ef4444","#2563eb","#facc15","#22c55e"];
let sektorNames = ["Sektor 1","Sektor 2","Sektor 3","Sektor 4"];
let barChart = null;
let registered = false;

const buttonColors = [
    "bg-blue-500 hover:bg-blue-600",   // A
    "bg-yellow-400 hover:bg-yellow-500 text-black", // B
    "bg-green-500 hover:bg-green-600", // C
    "bg-pink-500 hover:bg-pink-600"    // D
];

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
        const antwortDiv = document.createElement("div");
        antwortDiv.id = "quiz-antworten";
        quizSelect.parentNode.insertBefore(antwortDiv, quizSelect.nextSibling);

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

        quizSelect.addEventListener("change", () => {
            antwortDiv.innerHTML = "";
            const idx = quizSelect.value;
            if (idx !== "" && FRAGEN[idx]) {
                antwortDiv.innerHTML = FRAGEN[idx].antworten.map(
                    (a, i) => `<div class="mb-1"><b>${String.fromCharCode(65 + i)}:</b> ${a}</div>`
                ).join("");
            }
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
        registered = true;
        socket.emit("audience-join");
    };
}

// --- Live-Screen Updates ---
socket.on("screen-update", (screen, data) => {
    if (!isAdmin && !registered) return;
    if (isAdmin && document.getElementById("admin-content")) showAdmin(screen, data);
    else if (!isAdmin && document.getElementById("content")) showAudience(screen, data);
});

// --- Timer-Anzeige ---
function showTimer(endTime, parent) {
    if (!endTime) return;
    let timerDiv = document.createElement("div");
    timerDiv.className = "font-bold text-lg mb-2";
    parent.appendChild(timerDiv);
    function update() {
        const left = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        timerDiv.textContent = `Zeit: ${left}s`;
        if (left > 0) setTimeout(update, 250);
    }
    update();
}

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
            if (socket.id === data.buzzerWinner.id) {
                c.innerHTML = `
                    <div class="text-2xl font-bold text-green-600 mb-4 animate-bounce">Du warst am schnellsten am Buzzer!<br>Stehe auf und sage die Antwort!</div>
                    <canvas id="confetti-canvas" class="fixed inset-0 pointer-events-none"></canvas>
                `;
                startConfetti();
            } else {
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
            showTimer(data.endTime, c);
            c.innerHTML += `
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
        let abg = data.abgestimmt || false;
        c.innerHTML = "";
        showTimer(data.endTime, c);

        if (data.antworten) {
            c.innerHTML += `<div class="font-bold mb-2">${data.frage}</div>
            <div id="ans" class="grid grid-cols-2 gap-2 mb-2"></div>
            <div id="feedback"></div>`;
            const ansDiv = document.getElementById("ans");
            const feedbackDiv = document.getElementById("feedback");
            data.antworten.forEach((a, i) => {
                const b = document.createElement("button");
                b.innerHTML = `<b>${String.fromCharCode(65 + i)}:</b> ${a}`;
                b.className = buttonColors[i % buttonColors.length] + " py-2 px-3 rounded text-left font-bold";
                if (abg) b.disabled = true;
                b.onclick = () => {
                    socket.emit("quiz-answer", i);
                    b.disabled = true;
                    feedbackDiv.innerHTML = `<div class="mt-2 text-green-700 font-bold">Eure Antwort wurde gewertet!</div>`;
                    setTimeout(() => feedbackDiv.innerHTML = "", 1500);
                };
                ansDiv.appendChild(b);
            });
        }
        if (data.showSolution && data.sektorCorrect) {
            c.innerHTML += `<div class="mt-4 font-bold">Korrekte Antworten pro Sektor:</div>`;
            data.sektorCorrect.forEach((count, idx) => {
                c.innerHTML += `<div style="color:${sektorColors[idx]};font-weight:bold">${sektorNames[idx]}: ${count}</div>`;
            });
            const max = Math.max(...data.sektorCorrect);
            const sieger = data.sektorCorrect.map((v, i) => v === max ? sektorNames[i] : null).filter(Boolean);
            if (max > 0) {
                c.innerHTML += `<div class="mt-2 text-green-700 font-bold">Sieger-Sektor: ${sieger.join(", ")}</div>`;
            }
        }
    }
}

// --- Admin: Anzeige ---
function showAdmin(screen, data) {
    const c = document.getElementById("admin-content");
    if (!c) return;
    c.innerHTML = `<div class="mb-2 text-sm text-gray-600">Screen: ${screen}</div>`;

    if (screen === "buzzer") {
        if (data.buzzerWinner) {
            const sektorIdx = data.buzzerWinner.sektor ?? 0;
            const sektorColor = sektorColors[sektorIdx] || "#888";
            c.innerHTML += `
                <div class="mt-2 text-green-700 font-bold">Buzzer-Gewinner: <span style="color:${sektorColor}">${data.buzzerWinner.name} [${sektorNames[sektorIdx]}]</span></div>
            `;
        } else {
            c.innerHTML += `<div class="mt-2">Noch kein Gewinner</div>`;
        }
        showTimer(data.endTime, c);
    }
    if (screen === "quiz") {
        if (data.sektorCorrect) {
            c.innerHTML += `<div class="mt-2 font-bold">Korrekte Antworten pro Sektor:</div>`;
            data.sektorCorrect.forEach((count, idx) => {
                c.innerHTML += `<div style="color:${sektorColors[idx]};font-weight:bold">${sektorNames[idx]}: ${count}</div>`;
            });
            const max = Math.max(...data.sektorCorrect);
            const sieger = data.sektorCorrect.map((v, i) => v === max ? sektorNames[i] : null).filter(Boolean);
            if (max > 0) {
                c.innerHTML += `<div class="mt-2 text-green-700 font-bold">Sieger-Sektor: ${sieger.join(", ")}</div>`;
            }
        }
        if (!data.showSolution) showTimer(data.endTime, c);
    }
}

function startConfetti() {
    const canvas = document.getElementById("confetti-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let pieces = Array.from({length: 120}, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 6 + 4,
        c: `hsl(${Math.random()*360},90%,60%)`,
        s: Math.random() * 2 + 2
    }));
    let frame = 0;
    function draw() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        for (const p of pieces) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
            ctx.fillStyle = p.c;
            ctx.fill();
            p.y += p.s;
            if (p.y > canvas.height) p.y = -10;
        }
        frame++;
        if (frame < 120) requestAnimationFrame(draw);
        else ctx.clearRect(0,0,canvas.width,canvas.height);
    }
    draw();  
}
