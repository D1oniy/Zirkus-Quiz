const socket = io();
const isAdmin = window.location.pathname.includes('admin');
let userName = '';
let userSektor = null;
const sektorColors = ['#ef4444','#2563eb','#22c55e','#facc15'];
let sektorNames = ['Rot','Blau','Grün','Gelb'];

// Admin-Funktionen
if(isAdmin) {
  window.setScreen = (screen) => socket.emit('set-screen',{screen});
  window.starteBuzzer = () => {
    const frage = document.getElementById('buzzer-frage').value.trim();
    socket.emit('set-screen',{screen:'buzzer', data:{frage}});
  };
  window.starteQuiz = () => {
    const frage = document.getElementById('quiz-frage').value;
    const antworten = [
      document.getElementById('quiz-a0').value,
      document.getElementById('quiz-a1').value,
      document.getElementById('quiz-a2').value,
      document.getElementById('quiz-a3').value
    ];
    const richtige = Number(document.getElementById('quiz-richtige').value);
    socket.emit('set-screen',{screen:'quiz', data:{frage, antworten, richtige}});
  };
}

// Publikum: Name & Sektor
if(!isAdmin) {
  const sektorBtns = document.getElementById('sektorBtns');
  socket.on('update-sektoren', names => sektorNames=names.map((n,i)=>n));
  document.getElementById('audience-name').oninput = () => {
    document.getElementById('startBtn').disabled = !document.getElementById('audience-name').value.trim() || userSektor===null;
  };
  ['Rot','Blau','Grün','Gelb'].forEach((name,i)=>{
    const btn = document.createElement('button');
    btn.innerText = name;
    btn.style.background = sektorColors[i];
    btn.className='text-white font-bold py-2 px-3 rounded';
    btn.onclick = () => { userSektor=i; document.getElementById('startBtn').disabled = !document.getElementById('audience-name').value.trim(); };
    sektorBtns.appendChild(btn);
  });
  document.getElementById('startBtn').onclick = () => {
    userName = document.getElementById('audience-name').value.trim();
    socket.emit('register',{name:userName,sektor:userSektor});
    document.getElementById('startArea').style.display='none';
    document.getElementById('content').innerHTML='<b>Bitte warten…</b>';
    socket.emit('audience-join');
  };
}

// Screen-Updates
socket.on('screen-update',(screen,data)=>{
  if(isAdmin) showAdmin(screen,data); else showAudience(screen,data);
});

function showAudience(screen,data){
  const c=document.getElementById('content'); c.innerHTML='';
  if(screen==='start'){ c.innerHTML='<b>Bitte warten, Show beginnt gleich</b>'; return; }
  if(screen==='buzzer'){
    if(data.buzzerWinner){
      c.innerHTML=`<b>${data.buzzerWinner.name}</b> war am schnellsten!`;
    } else {
      c.innerHTML=`<div>${data.frage||''}</div><button onclick="socket.emit('buzzer')" class="bg-red-500 text-white py-2 px-4 rounded">BUZZER!</button>`;
    }
  }
  if(screen==='quiz'){
    const out=document.createElement('div');
    out.innerHTML=`<div>${data.frage}</div>`;
    data.antworten.forEach((a,i)=>{
      const b=document.createElement('button');
      b.innerText=a; b.className='m-1 bg-blue-500 text-white py-2 px-3 rounded';
      b.onclick=()=>{ socket.emit('quiz-answer',i); b.disabled=true; };
      out.appendChild(b);
    });
    c.appendChild(out);
  }
}

function showAdmin(screen,data){
  const c=document.querySelector('#main')||document.body;
  console.log('Admin:',screen,data);
}
