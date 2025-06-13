const socket = io();
const isAdmin = window.location.pathname.includes("admin");
let userName = "";
let userSektor = null;
let sektorBtns = null;
let sektorColors = ["#ef4444", "#2563eb", "#facc15", "#22c55e"];
let sektorNames = ["Sektor 1", "Sektor 2", "Sektor 3", "Sektor 4"];
let barChart = null;

// Admin Buttons 
if (isAdmin) {
    window.setScreen = (screen) => socket.emit("set-screen", {screen});
    window.starteBuzzer = () => {
        const frage = document.getElementById("buzzer-frage").value.trim();
        socket.emit("set-screen", {screen:"buzzer", data:{frage}});
    };
    window.starteQuiz = () => {
        const frage = document.getElementById("quiz-frage").value;
        const antworten = [
            document.getElementById("quiz-a0").value,
            document.getElementById("quiz-a1").value,
            document.getElementById("quiz-a2").value,
            document.getElementById("quiz-a3").value
        ];
        const richtige = Number(document.getElementById("quiz-richtige").value);
        const timer = Number(document.getElementById("quiz-timer").value) || 10;
        socket.emit("set-screen", {screen:"quiz", data:{frage, antworten, richtige, timer}});
    };
    window.starteAkro = (nr) => {
        socket.emit("set-screen", {screen: "akro"+(nr+1)});
    };
    window.starteVote = (type, title) => {
        socket.emit("set-screen", {screen:type, data:{title}});
    };
}

// Publikum: Name/Sektor-Buttons und Start 
if (!isAdmin) {
    sektorBtns = document.getElementById("sektorBtns");
    socket.on("update-sektoren", names => {
        sektorNames = names;
        sektorBtns.innerHTML = "";
        names.forEach((n,i) => {
            const btn = document.createElement("button");
            btn.innerText = n;
            btn.style.background = sektorColors[i];
            btn.className = "text-white font-bold py-2 px-3 rounded-xl shadow transition";
            btn.onclick = () => {
                userSektor = i;
                document.querySelectorAll("#sektorBtns button").forEach(b=>b.classList.remove("ring-4","ring-pink-300"));
                btn.classList.add("ring-4","ring-pink-300");
                document.getElementById("startBtn").disabled = !document.getElementById("audience-name").value.trim();
            };
            sektorBtns.appendChild(btn);
        });
    });
    document.getElementById("audience-name").oninput = () => {
        document.getElementById("startBtn").disabled = !(document.getElementById("audience-name").value.trim() && userSektor!==null);
    };
    document.getElementById("startBtn").onclick = () => {
        userName = document.getElementById("audience-name").value.trim() || "Anonym";
        if (userSektor === null) return alert("Bitte Sektor waehlen!");
        socket.emit("register", { name: userName, sektor: userSektor });
        document.getElementById("startArea").style.display = "none";
        document.getElementById("content").innerHTML = "<b>Bitte warten…</b>";
        socket.emit("audience-join");
    };
}

// Screen Umschaltung 
socket.on("screen-update", (screen, data) => {
    if (isAdmin) showAdmin(screen, data);
    else showAudience(screen, data);
});

// Publikum-View 
function showAudience(screen, data) {
    const content = document.getElementById("content");
    content.innerHTML = "";
    if(barChart && barChart.destroy) { barChart.destroy(); barChart = null; }

    if (screen === "start") {
        content.innerHTML = `<div class="font-bold text-lg mb-4">Bitte warten Sie.<br>Die Show beginnt gleich.<br><span class="text-gray-400 text-sm">Schliessen Sie nicht den Browser!</span></div>`;
    }

    if (screen === "buzzer") {
        if (data.buzzerWinner) {
            const farbe = sektorColors[data.buzzerWinner.sektor];
            const isYou = (data.buzzerWinner.deinId === true);
            content.innerHTML = `<div class="mb-4 text-2xl font-bold">
                <span style="color:${farbe};">${data.buzzerWinner.name} (${sektorNames[data.buzzerWinner.sektor]})</span> war am schnellsten!<br>
                ${isYou ? "<div class='text-green-700 font-bold mt-2 animate-bounce flex items-center gap-1'><svg class='w-6 h-6 inline' fill='none' stroke='currentColor' stroke-width='2' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' d='M5 13l4 4L19 7'></path></svg>Du warst am schnellsten!</div>" : ""}
            </div>`;
        } else {
            content.innerHTML = `<div class="text-xl font-semibold mb-4">${data.frage || ""}</div>
            <button id="buzzerBtn" class="bg-red-500 text-white text-3xl font-bold w-40 h-40 rounded-full shadow-2xl mb-4 hover:scale-105 transition-all ring-4 ring-pink-200">Buzzer!</button>
            <div id="buzzerResult"></div>`;
            document.getElementById("buzzerBtn").onclick = () => {
                socket.emit("buzzer");
                document.getElementById("buzzerResult").innerHTML =
                    `<div class="text-green-700 font-bold flex items-center gap-2 mt-3">
                        <svg class="w-6 h-6 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
                        </svg>Dein Buzzer wurde gewertet!
                    </div>`;
            };
        }
    }

    if (screen === "quiz") {
        let antwortAbgegeben = data.abgestimmt || false;
        let countdown = data.countdown || 10;
        content.innerHTML = `
        <div class="font-bold text-xl mb-2">${data.frage}</div>
        <div id="antworten" class="grid grid-cols-2 gap-2 mb-2"></div>
        <div class="my-2 text-base"><span id="quiz-timer" class="font-mono text-pink-600">${countdown}</span> Sekunden verbleibend</div>
        <div id="quizResult" class="mb-2"></div>
        `;
        const antwortenDiv = document.getElementById("antworten");
        ["A","B","C","D"].forEach((buchst,i)=>{
            const btn = document.createElement("button");
            btn.innerText = `${buchst}: ${data.antworten[i]}`;
            btn.className = "bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-2 rounded-xl shadow text-lg";
            if(data.abgestimmt) btn.disabled = true;
            btn.onclick = () => {
                if(antwortAbgegeben) return;
                antwortAbgegeben = true;
                socket.emit("quiz-answer", i);
                btn.disabled = true;
                btn.classList.add("opacity-60");
                document.getElementById("quizResult").innerHTML =
                    `<div class="text-green-700 font-bold flex items-center gap-2">
                        <svg class="w-6 h-6 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
                        </svg>Antwort gespeichert!
                    </div>`;
                Array.from(antwortenDiv.children).forEach(b=>b.disabled=true);
            };
            antwortenDiv.appendChild(btn);
        });
        // Countdown
        if(data.countdown) {
            let t = countdown;
            let quizTimer = setInterval(()=>{
                t--;
                if(document.getElementById("quiz-timer")) document.getElementById("quiz-timer").innerText = t;
                if(t <= 0) clearInterval(quizTimer);
            }, 1000);
        }
        if(data.showSolution) {
            content.innerHTML += `<div class="my-3 font-bold text-green-700">Richtige Antwort: ${["A","B","C","D"][data.richtige]}: ${data.antworten[data.richtige]}</div>`;
            content.innerHTML += `<div class="mb-2">Sektor mit den meisten richtigen: <span class="font-bold">${data.siegerSektor!==undefined ? sektorNames[data.siegerSektor] : "-"}</span></div>`;
            content.innerHTML += `<div class="mt-4 font-mono bg-gray-100 rounded p-2 text-xs">Richtige pro Sektor: ${data.antwortCounts ? data.antwortCounts.join(" / ") : "--"}</div>`;
        }
    }

    // Akrobatik Show (Show 1–3)
    if (screen.startsWith("akro")) {
        const showNr = parseInt(screen.replace("akro", ""), 10);
        content.innerHTML = `<div class="mb-2 font-bold text-xl">Akrobatik Show ${showNr} – Bewertung</div>
            <div id="akroBewertung" class="mb-3 flex justify-center"></div>
            <div id="akroResult" class="mt-4 text-2xl font-mono">
                Durchschnitt: <span class="font-bold text-yellow-700">${data.chart?data.chart.values[0]:"-"}</span>
            </div>`;
        const akroDiv = document.createElement("div");
        akroDiv.className = "grid grid-cols-5 gap-3 justify-center mb-2";
        if(!data.abgestimmt) {
            for (let i=1;i<=10;i++) {
                const btn = document.createElement("button");
                btn.innerText = i;
                btn.className = "bg-yellow-400 hover:bg-yellow-500 px-4 py-3 rounded-xl shadow text-lg font-bold transition-all";
                btn.onclick = () => {
                    socket.emit("akro-bewerten", { show: showNr, wertung: i });
                    document.getElementById("akroBewertung").innerHTML =
                        `<span class="text-green-700 font-bold flex items-center gap-2">
                            <svg class="w-6 h-6 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
                            </svg>Deine Bewertung wurde gespeichert!
                        </span>`;
                };
                akroDiv.appendChild(btn);
            }
            document.getElementById("akroBewertung").appendChild(akroDiv);
        } else {
            document.getElementById("akroBewertung").innerHTML =
                `<span class="text-green-700 font-bold flex items-center gap-2">
                    <svg class="w-6 h-6 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
                    </svg>Du hast bereits abgestimmt!
                </span>`;
        }
    }

    // Säulendiagramm für Voting 
    if (["murder","komplize","hobby"].includes(screen)) {
        content.innerHTML = `<div class="mb-2 font-bold text-lg">${data.title || ""}</div>
            <div id="voteField" class="mb-4"></div>
            <div class="h-60 w-full flex justify-center items-center"><canvas id="barChart" class="w-full"></canvas></div>`;
        if(!data.abgestimmt) {
            data.namen.forEach((name,idx)=>{
                const btn = document.createElement("button");
                btn.innerText = name;
                btn.className = "bg-purple-400 hover:bg-purple-600 text-white font-bold py-2 px-4 m-1 rounded-xl shadow";
                btn.onclick = () => {
                    socket.emit(screen+"-vote", idx);
                    document.getElementById("voteField").innerHTML =
                        `<span class="text-green-700 font-bold flex items-center gap-2">
                            <svg class="w-6 h-6 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
                            </svg>Danke fuer deine Stimme!
                        </span>`;
                };
                document.getElementById("voteField").appendChild(btn);
            });
        } else {
            document.getElementById("voteField").innerHTML =
                `<span class="text-green-700 font-bold flex items-center gap-2">
                    <svg class="w-6 h-6 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
                    </svg>Du hast bereits abgestimmt!
                </span>`;
        }
        if(data.chart) updateChart(data.chart.labels, data.chart.values);
    }
}

// Admin-View 
function showAdmin(screen, data) {
    const content = document.getElementById("admin-content");
    content.innerHTML = "";
    if(barChart && barChart.destroy) { barChart.destroy(); barChart = null; }

    let html = `<div class="p-2 mb-3 rounded-xl bg-yellow-50 text-gray-600 text-sm">Aktueller Screen: <b class="text-black">${screen}</b></div>`;
    if (screen === "start") html += `<b>Startbildschirm (Publikum wartet)</b>`;
    if (screen === "buzzer") {
        html += `<div class="text-lg font-semibold mb-2">${data.frage || ""}</div>`;
        if (data.buzzerWinner)
            html += `<div class="mb-3 text-2xl font-bold"><span style="color:${sektorColors[data.buzzerWinner.sektor]};">${data.buzzerWinner.name} (${sektorNames[data.buzzerWinner.sektor]})</span> war am schnellsten! ${data.buzzerWinner.deinId?"<span class='ml-2 text-green-600 font-bold'>Du warst am schnellsten!</span>":""}</div>`;
        else
            html += `<div class="mb-2">Buzzer läuft... Wer ist am schnellsten?</div>`;
    }
    if (screen === "quiz") {
        html += `<b>Quiz:</b> <span class="text-green-700 font-bold">${data.frage}</span><br>`;
        html += `<span>Countdown: <span class="font-mono">${data.countdown || 0}</span> s</span><br>`;
        html += `<div>Antworten: ${["A","B","C","D"].map((b,i)=>b+": "+data.antworten[i]).join(" / ")}</div>`;
        if(data.showSolution) {
            html += `<div class="font-bold my-2">Richtige Antwort: ${["A","B","C","D"][data.richtige]}: ${data.antworten[data.richtige]}</div>`;
            html += `<div>Sektor mit den meisten richtigen: <b>${data.siegerSektor!==undefined ? sektorNames[data.siegerSektor] : "-"}</b></div>`;
            html += `<div class="mt-2 mb-2 font-mono">Richtige pro Sektor: <b>${data.antwortCounts ? data.antwortCounts.join(" / ") : "--"}</b></div>`;
        }
    }
    if (screen.startsWith("akro")) {
        const showNr = parseInt(screen.replace("akro", ""), 10);
        html += `<div class="mb-2 font-bold text-xl">Akrobatik Show ${showNr} – Bewertung</div>
                 <div class="mt-4 mb-3 text-3xl font-mono text-yellow-700">Durchschnitt: <span class="font-bold">${data.chart?data.chart.values[0]:"-"}</span></div>`;
    }
    if (["murder","komplize","hobby"].includes(screen)) {
        html += `<div class="mb-2 font-bold text-lg">${data.title || ""}</div>
            <div class="h-60 w-full flex justify-center items-center"><canvas id="barChart" class="w-full"></canvas></div>`;
        if(data.chart) setTimeout(()=>updateChart(data.chart.labels, data.chart.values), 50);
    }
    content.innerHTML = html;
}

// Chart.js  
function updateChart(labels, counts) {
    if (!document.getElementById("barChart")) return;
    if (barChart) {
        barChart.data.labels = labels;
        barChart.data.datasets[0].data = counts;
        barChart.update();
    } else {
        const ctx = document.getElementById("barChart").getContext('2d');
        barChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Stimmen',
                    data: counts,
                    backgroundColor: '#fb7185'
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false }},
                animation: { duration: 900, easing: 'easeInOutQuart' },
                scales: {
                    y: { beginAtZero: true, ticks: { precision:0 } }
                }
            }
        });
    }
}
