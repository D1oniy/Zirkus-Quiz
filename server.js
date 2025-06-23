const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let audience={}; let screen='start';
let buzzerFrage=''; let buzzerWinner=null;
let quiz={frage:'',antworten:[],richtige:0,done:false};

io.on('connection',sock=>{
  sock.emit('update-sektoren',['Rot','Blau','Grün','Gelb']);
  sock.on('register',d=>audience[sock.id]=d);
  sock.on('audience-join',()=>sock.emit('screen-update',screen,getData(sock.id)));
  sock.on('buzzer',()=>{
    if(screen==='buzzer'&&!buzzerWinner&&audience[sock.id]){
      buzzerWinner=sock.id;
      io.emit('screen-update','buzzer',{buzzerWinner:audience[sock.id]});
    }
  });
  sock.on('quiz-answer',(i)=>{
    if(screen==='quiz'&&!quiz.done&&audience[sock.id]){
      // handle count
      quiz.done=true;
      io.emit('screen-update','quiz',quiz);
    }
  });
  sock.on('set-screen',({screen:s,data})=>{ screen=s;
    if(s==='buzzer') { buzzerWinner=null; buzzerFrage=s.data?.frage||''; }
    if(s==='quiz'){ quiz={...s.data,done:false}; }
    io.emit('screen-update',s,getData());
  });
});

function getData(){ if(screen==='buzzer') return {frage:buzzerFrage,buzzerWinner:buzzerWinner?audience[buzzerWinner]:null};
  if(screen==='quiz') return quiz; return {};
}

http.listen(5500);
