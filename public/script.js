const socket = io();
const isAdmin = location.pathname.includes("admin");
let myName, mySektor;

// Liste der Fragen für Admin-Dropdowns
const fragen = [
  "Wie viele verschiedene Plattformen ...", 
  "Was war 2020 DAS Symbol ...",
  /* hier alle 14 Fragen in gleicher Reihenfolge wie im server.js */
];

// --- ADMIN ---
if (isAdmin) {
  const buz = document.getElementById("buzzerSel");
  const mcq = document.getElementById("quizSel");
  fragen.forEach((f,i)=>{
    buz.append(new Option(f,i));
    mcq.append(new Option(f,i));
  });
  window.setScreen = mode => socket.emit("admin-set",{mode});
  window.startBuzzer = () => {
    socket.emit("admin-set",{mode:"buzzer",questionIdx:+buz.value});
  };
  window.startQuiz = () => {
    socket.emit("admin-set",{mode:"quiz",questionIdx:+mcq.value,timer:+timer.value});
  };
}

// --- PUBLIKUM ---
else {
  // Sektoren rendern
  socket.on("sektoren", arr=>{
    const cont = document.getElementById("sektoren");
    arr.forEach((s,i)=>{
      const b = document.createElement("button");
      b.innerText = s;
      b.className = "px-3 py-1 font-bold text-white rounded";
      b.style.background = ["#ef4444","#2563eb","#22c55e","#facc15"][i];
      b.onclick = ()=>{
        mySektor = i;
        Array.from(cont.children).forEach(x=>x.classList.remove("ring-4","ring-pink-300"));
        b.classList.add("ring-4","ring-pink-300");
        join.disabled = !(nameInput.value.trim() && mySektor!=null);
      };
      cont.append(b);
    });
  });

  // Name & Join
  const nameInput = document.getElementById("name");
  const join = document.getElementById("join");
  nameInput.oninput = ()=>{ join.disabled = !(nameInput.value.trim() && mySektor!=null); };
  join.onclick = ()=>{
    myName = nameInput.value.trim()||"Anonym";
    socket.emit("register",{name:myName,sektor:mySektor});
  };
  socket.on("registered",()=>{
    document.getElementById("start").classList.add("hidden");
    document.getElementById("wait").classList.remove("hidden");
    socket.emit("audience-join");
  });

  // Anzeige wechseln
  socket.on("update",(mode,data)=>{
    ["wait","buzzer","quiz"].forEach(id=>document.getElementById(id).classList.add("hidden"));
    if(mode==="start") document.getElementById("wait").classList.remove("hidden");
    if(mode==="buzzer") showBuzzer(data);
    if(mode==="quiz")   showQuiz(data);
  });

  function showBuzzer({frage,buzzerWinner}){
    document.getElementById("bfrage").innerText=frage;
    document.getElementById("buzzRes").innerText=buzzerWinner||"";
    const btn = document.getElementById("buzzBtn");
    btn.disabled = !!buzzerWinner;
    btn.onclick = ()=>{ socket.emit("buzz"); btn.disabled=true; };
    document.getElementById("buzzer").classList.remove("hidden");
  }
  function showQuiz({frage,antworten,richtige,showSolution=false}){
    document.getElementById("qfrage").innerText=frage;
    const cont = document.getElementById("answers");
    cont.innerHTML="";
    antworten.forEach((a,i)=>{
      if(!a) return;
      const b=document.createElement("button");
      b.innerText=a; b.className="bg-blue-500 text-white py-2 px-4 rounded w-full";
      b.onclick=()=>{ socket.emit("answer",i); Array.from(cont.children).forEach(x=>x.disabled=true); };
      cont.append(b);
    });
    document.getElementById("feedback").innerText = showSolution ? "Richtige Antwort: "+["A","B","C","D"][richtige] : "";
    document.getElementById("quiz").classList.remove("hidden");
  }
}
