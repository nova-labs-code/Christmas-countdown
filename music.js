// ================== Countdown ==================
function updateCountdown(){
    const now=new Date();
    const year=now.getFullYear();
    let christmas=new Date(year,11,25);
    if(now>christmas) christmas=new Date(year+1,11,25);
    const diff=christmas-now;
    const d=Math.floor(diff/(1000*60*60*24));
    const h=Math.floor((diff%(1000*60*60*24))/(1000*60*60));
    const m=Math.floor((diff%(1000*60*60))/(1000*60));
    const s=Math.floor((diff%(1000*60))/1000);
    document.getElementById("countdown").textContent=`${d}d ${h<10?'0'+h:h}h ${m<10?'0'+m:m}m ${s<10?'0'+s:s}s`;
}
setInterval(updateCountdown,1000);
updateCountdown();

// ================== Snow Effect ==================
setInterval(()=>{
    const s=document.createElement("div");
    s.className="snowflake"; s.textContent="❄";
    s.style.left=Math.random()*window.innerWidth+"px";
    s.style.opacity=Math.random();
    s.style.fontSize=(Math.random()*20+10)+"px";
    s.style.animationDuration=(Math.random()*3+4)+"s";
    document.body.appendChild(s);
    setTimeout(()=>s.remove(),7000);
},200);

// ================== Playlist ==================
const playlist = [
    "Music Now, Trap Music Now, Dance Music Now - All I Want For Christmas Is You (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Baby It's Cold Outside (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Blue Christmas (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Carol Of The Bells (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Christmas (Baby Please Come Home) (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Christmas Canon (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Dance Of The Sugar Plum Fairy (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Deck The Halls (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Do You Want To Build A Snowman (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Feliz Navidad (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Frosty The Snowman (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - God Rest Ye Merry Gentlemen (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Hallelujah (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Here Comes Santa Claus (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Holly Jolly Christmas (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - I Want A Hippopotamus For Christmas (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - It's Beginning To Look A Lot Like Christmas (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - It's The Most Wonderful Time Of The Year (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Jingle Bell Rock (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Jingle Bells (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Last Christmas (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Let It Snow! Let It Snow! (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Little Drummer Boy (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Mistletoe (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - O Christmas Tree (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Rockin Around The Christmas Tree (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Rudolph The Red-Nosed Reindeer (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Santa Baby (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Santa Claus Is Comin' To Town (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Silent Night (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Sleigh Ride (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - The Christmas Song (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - The Nutcracker March (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Up On The Housetop (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - We Wish You A Merry Christmas (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - White Christmas (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Winter Wonderland (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - Wonderful Christmastime (SPOTISAVER).mp3",
    "Music Now, Trap Music Now, Dance Music Now - You're A Mean One Mr.Grinch!(SPOTISAVER).mp3"
];

// ================== Music Setup ==================
const GLOBAL_START_TIME = Date.now();
const FADE_TIME = 2;
const audio = new Audio();
let audioCtx, analyser, gainNode, source;
let started = false, currentIdx = 0;
const visualLayer = document.getElementById("visual-layer");

// Insert speech.mp3 between every song
const fullPlaylist = [];
for(let i=0;i<playlist.length;i++){
    fullPlaylist.push(playlist[i]);
    fullPlaylist.push("speech.mp3");
}

let trackDurations=[], cumulativeDurations=[];

async function preloadDurations(){
    const promises = fullPlaylist.map(f=>{
        return new Promise(res=>{
            const a = new Audio();
            a.src = f.includes("speech")?f:"songs/"+f;
            a.addEventListener("loadedmetadata", ()=>res(a.duration));
            a.addEventListener("error", ()=>res(180));
        });
    });
    trackDurations = await Promise.all(promises);
    cumulativeDurations = [0];
    for(let i=0;i<trackDurations.length;i++) cumulativeDurations.push(cumulativeDurations[i]+trackDurations[i]);
}

function getLiveTrackAndOffset(){
    const elapsed = (Date.now()-GLOBAL_START_TIME)/1000;
    const total = cumulativeDurations[cumulativeDurations.length-1];
    const modTime = elapsed%total;
    let left=0,right=cumulativeDurations.length-1;
    while(left<right-1){ const mid=Math.floor((left+right)/2); if(cumulativeDurations[mid]<=modTime) left=mid; else right=mid; }
    const trackIndex = left;
    const offset = modTime - cumulativeDurations[trackIndex];
    return {trackIndex, offset};
}

function updateMediaSessionTitle(filename){
    const cleanName = filename.replace("Music Now, Trap Music Now, Dance Music Now - ","").replace("(SPOTISAVER).mp3","").trim();
    if(cleanName==="speech") document.title="Speech";
    else document.title=cleanName;
    if('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({title: cleanName, artist:"Christmas Countdown"});
}

function playLiveTrack(){
    const {trackIndex, offset} = getLiveTrackAndOffset();
    currentIdx = trackIndex;
    const track = fullPlaylist[currentIdx].includes("speech") ? "speech.mp3" : "songs/"+fullPlaylist[currentIdx];
    audio.src = track;
    audio.onloadedmetadata = ()=>{
        audio.currentTime = offset;
        audio.play();
        fadeVolume(fullPlaylist[currentIdx].includes("speech")?1:0, FADE_TIME);
        updateMediaSessionTitle(fullPlaylist[currentIdx]);
    };
    audio.onended = playLiveTrack;
}

function fadeVolume(target,duration){
    if(gainNode){
        gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(target, audioCtx.currentTime+duration);
    }
}

function initVisualizer(){
    audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    audioCtx.resume();
    analyser = audioCtx.createAnalyser();
    gainNode = audioCtx.createGain();
    source = audioCtx.createMediaElementSource(audio);
    source.connect(gainNode); gainNode.connect(analyser); analyser.connect(audioCtx.destination);
    analyser.fftSize = 256;
    gainNode.gain.value = 0;
    renderFrame();
}

function renderFrame(){
    requestAnimationFrame(renderFrame);
    if(!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const bass = data[2]||0;
    const t = Date.now()*0.003;
    if(visualLayer) visualLayer.style.transform = `scale(${1.05+bass/600}) translateX(${Math.sin(t)*10}px)`;
    if(visualLayer) visualLayer.style.filter = `brightness(${1+bass/350})`;
    if(audio.duration && audio.currentTime>audio.duration-FADE_TIME && !fullPlaylist[currentIdx].includes("speech")) fadeVolume(0,FADE_TIME);
}

audio.addEventListener("play", ()=>{
    if(!started||!audio.duration) return;
    const {offset} = getLiveTrackAndOffset();
    audio.currentTime = offset;
    updateMediaSessionTitle(fullPlaylist[currentIdx]);
});

if('mediaSession' in navigator){
    navigator.mediaSession.setActionHandler('nexttrack', null);
    navigator.mediaSession.setActionHandler('previoustrack', null);
}

// ================== PiP ALT+P ==================
async function setupPiP(){
    const canvas = document.createElement("canvas");
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    const video = document.getElementById("pip-video");
    const stream = canvas.captureStream(30);
    const audioTrack = audio.captureStream().getAudioTracks()[0];
    stream.addTrack(audioTrack);
    video.srcObject = stream; video.play();

    function drawFrame(){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(document.getElementById("visual-layer"),0,0,canvas.width,canvas.height);
        requestAnimationFrame(drawFrame);
    }
    drawFrame();

    document.addEventListener("keydown", async (e)=>{
        if(e.altKey && e.key.toLowerCase()==='p'){
            e.preventDefault();
            if(video!==document.pictureInPictureElement){
                try{ await video.requestPictureInPicture(); } catch(err){ console.warn(err); }
            } else await document.exitPictureInPicture();
        }
    });
}

// ================== Start Button ==================
document.getElementById("start-audio-btn").onclick=async ()=>{
    if(started) return; started=true;
    initVisualizer();
    await preloadDurations();
    playLiveTrack();
    setupPiP();
    document.getElementById("start-audio-btn").remove();
};
