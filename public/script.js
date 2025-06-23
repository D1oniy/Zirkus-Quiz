const socket = io();
const isAdmin = window.location.pathname.includes("admin");
let userName = "";
let userSektor = null;
let sektorBtns = null;
const sektorColors = ["#ef4444","#2563eb","#facc15","#22c55e"];
let sektorNames = ["Sektor 1","Sektor 2","Sektor 3","Sektor 4"];
let barChart = null;

// --- Admin-Funktionen ---
if (isAdmin) {
    window.setScreen = screen => socket.emit("set-screen",{screen});
    window.starteBuzzer = () => {
        const frage = document.getElementById("buzzer-frage").value.trim();
        socket.emit("set-screen",{screen:"buzzer",data:{frage}});
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
        const timer = Number(document.getElementById("quiz-timer").value)||10;
        socket.emit("set-screen",{screen:"quiz",data:{frage,antworten,richtige,timer}});
    };
    window.starteAkro = screen => socket.emit("set-screen",{screen});
    window.starteVote = (type,title) => socket.emit("set-screen",{screen:type,data:{title}});
}

// --- Publikum: Name & Sektor ---
if (!isAdmin) {
    sektorBtns = document.getElementById("sektorBtns");
    socket.on("update-sektoren", names => {
        sektorNames = names;
        sektorBtns.innerHTML = "";
        names.forEach((n,i)=>{
            const btn = document.createElement("button");
            btn.innerText = n;
            btn.style.background = sektorColors[i];
            btn.className = "text-white font-bold py-2 px-3 rounded-xl shadow transition";
            btn.onclick = ()=>{
                userSektor = i;
                document.querySelectorAll("#sektorBtns button").forEach(b=>b.classList.remove("ring-4","ring-pink-300"));
                btn.classList.add("ring-4","ring-pink-300");
                document.getElementById("startBtn").disabled = !document.getElementById("audience-name").value.trim();
            };
            sektorBtns.appendChild(btn);
        });
    });
    document.getElementById("audience-name").oninput = ()=>{
        document.getElementById("startBtn").disabled = !(document.getElementById("audience-name").value.trim() && userSektor!==null);
    };
    document.getElementById("startBtn").onclick = ()=>{
        userName = document.getElementById("audience-name").value.trim()||"Anonym";
        socket.emit("register",{name:userName,sektor:userSektor});
        document.getElementById("startArea").style.display="none";
        document.getElementById("content").innerHTML="<b>Bitte warten…</b>";
        socket.emit("audience-join");
    };
}

// --- Live-Screen Updates ---
socket.on("screen-update",(screen,data)=>{
    if (isAdmin) showAdmin(screen,data);
    else showAudience(screen,data);
});

// --- Publikum: Anzeige ---
function showAudience(screen,data){
    const c=document.getElementById("content");
    c.innerHTML="";
    if(barChart){ barChart.destroy(); barChart=null; }

    if(screen==="start"){
        c.innerHTML=`<div class="font-bold text-lg">Bitte warten…</div>`;
    }
    if(screen==="buzzer"){
        if(data.buzzerWinner){
            c.innerHTML=`<div class="text-2xl font-bold">${data.buzzerWinner.name}</div>`;
        } else {
            c.innerHTML=`<div>${data.frage||""}</div>
                <button onclick="socket.emit('buzzer')" class="bg-red-500 text-white py-2 px-4 rounded">BUZZER!</button>`;
        }
    }
    if(screen==="quiz"){
        let abg=data.abgestimmt||false;
        c.innerHTML=`<div class="font-bold mb-2">${data.frage}</div><div id="ans"></div>`;
        const ansDiv=document.getElementById("ans");
        data.antworten.forEach((a,i)=>{
            const b=document.createElement("button");
            b.innerText=a; b.className="m-1 bg-blue-500 text-white py-2 px-3 rounded";
            if(abg) b.disabled=true;
            b.onclick=()=>{
                socket.emit("quiz-answer",i);
                b.disabled=true;
            };
            ansDiv.appendChild(b);
        });
        if(data.showSolution){
            c.innerHTML+=`<div class="mt-4 text-green-700 font-bold">Richtig: ${["A","B","C","D"][data.richtige]}</div>`;
        }
    }
    if(screen.startsWith("akro")){
        const nr=parseInt(screen.replace("akro",""),10);
        c.innerHTML=`<div class="font-bold mb-2">Akro Show ${nr}</div>
            <div id="akro"></div>
            <div class="mt-4">Durchschnitt: <b>${data.chart.values[0]}</b></div>`;
        const akroDiv=document.getElementById("akro");
        if(!data.abgestimmt){
            for(let i=1;i<=10;i++){
                const b=document.createElement("button");
                b.innerText=i; b.className="m-1 bg-yellow-400 hover:bg-yellow-500 py-2 px-3 rounded";
                b.onclick=()=>{ socket.emit("akro-bewerten",{show:nr,wertung:i}); };
                akroDiv.appendChild(b);
            }
        }
    }
    if(["murder","komplize"].includes(screen)){
        c.innerHTML=`<div class="font-bold mb-2">${data.title}</div>
            <canvas id="barChart"></canvas>`;
        setTimeout(()=>updateChart(data.chart.labels,data.chart.values),50);
    }
}

// --- Admin: Anzeige ---
function showAdmin(screen,data){
    const c=document.getElementById("admin-content");
    c.innerHTML=`<div class="mb-2 text-sm text-gray-600">Screen: ${screen}</div>`;
    // (wer soll angezeigt werden, analog Pub.)
}

// --- Chart.js Helper ---
function updateChart(labels,values){
    const ctx=document.getElementById("barChart").getContext("2d");
    barChart=new Chart(ctx,{type:"bar",data:{labels, datasets:[{data:values,backgroundColor:"#fb7185"}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
}
