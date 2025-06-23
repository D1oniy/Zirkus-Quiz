const express=require("express");
const app=express();
const http=require("http").createServer(app);
const io=require("socket.io")(http);

app.use(express.static("public"));

const SEKTOR_NAMES=["Rot","Blau","Grün","Gelb"];
const THEATER_NAMES=["P1","P2","P3","P4","P5","P6","P7"];

let currentScreen="start";
let questions=[ /* …deine Fragen… */ ];
let currentIdx=null;
let buzzerWinnerId=null;

io.on("connection",sock=>{
  sock.emit("update-sektoren",SEKTOR_NAMES);
  sock.on("register",d=>{ if(!akroVoted[sock.id]) akroVoted[sock.id]=[false,false,false];});
  sock.on("audience-join",()=>sock.emit("screen-update",currentScreen,getData(sock.id)));

  sock.on("set-screen",({screen,d})=>{
    currentScreen=screen;
    if(screen==="buzzer"){ buzzerWinnerId=null; currentIdx=d; io.emit("screen-update","buzzer",{frage:questions[d].frage}); }
    if(screen==="quiz"){
      currentIdx=d; quizState={answers:{},done:false};
      io.emit("screen-update","quiz",{frage:questions[d].frage,antworten:questions[d].antworten});
      setTimeout(()=>{
        quizState.done=true;
        io.emit("screen-update","quiz",{...getData()});
      },20000);
    }
    }

    );

  sock.on("buzzer",()=>{
    if(currentScreen==="buzzer"&&!buzzerWinnerId){
      buzzerWinnerId=sock.id;
      io.emit("screen-update","buzzer",{frage:questions[currentIdx].frage,buzzerWinner:{id:sock.id}});
    }
  });

  sock.on("quiz-answer",i=>{
    if(currentScreen==="quiz"&&!quizState.done){
      quizState.answers[sock.id]=i;
      // kein weiteres Handling hier
    }
  });

  
    }
  );
;


http.listen(5500);
