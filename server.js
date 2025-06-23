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
let quizState={};
let akroVotes={1:[],2:[],3:[]};
let akroVoted={};

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
    if(screen.startsWith("akro")){
      let n=Number(screen.replace("akro",""));
      akroVotes[n]=[];
      for(let id in akroVoted) akroVoted[id][n-1]=false;
      io.emit("screen-update",screen,getData());
    }
    if(screen==="murder"||screen==="komplize"){
      io.emit("screen-update",screen,getData());
    }
  });

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

  sock.on("akro-bewerten",({show,wertung})=>{
    if(currentScreen==="akro"+show&&!akroVoted[sock.id][show-1]){
      akroVotes[show].push(wertung);
      akroVoted[sock.id][show-1]=true;
      io.emit("screen-update","akro"+show,getData());
    }
  });
});

function getData(sockid){
  if(currentScreen.startsWith("akro")){
    let n=Number(currentScreen.replace("akro",""));
    let arr=akroVotes[n];
    let avg=arr.length?(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2):"0";
    return {chart:{labels:["Durchschnitt"],values:[avg]},abgestimmt:akroVoted[sockid][n-1]};
  }
  if(currentScreen==="murder"||currentScreen==="komplize"){
    let votes=currentScreen==="murder"?{}: {};
    // hier deine Logik, analog quiz
    return {title: currentScreen==="murder"?"Wer ist der Mörder?":"Wer ist der Komplize?", chart:{labels:THEATER_NAMES,values:Array(THEATER_NAMES.length).fill(0)}};
  }
  return {};
}

http.listen(5500);
