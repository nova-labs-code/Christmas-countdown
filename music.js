// ===============================
// CONFIG
// ===============================
const GLOBAL_START_TIME = Date.UTC(2025, 11, 1, 0, 0, 0); // Dec 1 UTC
const FADE_TIME = 2; // seconds

// ===============================
// PLAYLIST
// ===============================
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

// ===============================
// AUDIO SETUP
// ===============================
const audio = new Audio();
audio.preload = "metadata";
let audioCtx, analyser, gainNode, source;
let started = false;
let currentIdx = 0;
const visualLayer = document.getElementById("visual-layer");
const songLabel = document.getElementById("current-song");

// Start button
const btn = document.createElement("button");
btn.id = "start-audio-btn";
btn.textContent = "START MUSIC";
document.body.appendChild(btn);

// ===============================
// VISUALIZER
// ===============================
function initVisualizer() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();

    analyser = audioCtx.createAnalyser();
    gainNode = audioCtx.createGain();

    source = audioCtx.createMediaElementSource(audio);
    source.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(audioCtx.destination);

    analyser.fftSize = 256;
    gainNode.gain.value = 0;

    renderFrame();
}

function renderFrame() {
    requestAnimationFrame(renderFrame);
    if (!analyser) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    const bass = data[2] || 0;
    const t = Date.now() * 0.003;

    if (visualLayer) {
        visualLayer.style.transform = `scale(${1.05+bass/600}) translateX(${Math.sin(t)*10}px)`;
        visualLayer.style.filter = `brightness(${1+bass/350})`;
    }

    if(audio.duration && audio.currentTime > audio.duration-FADE_TIME){
        fadeVolume(0, FADE_TIME);
    }
}

function fadeVolume(target,duration){
    gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(target,audioCtx.currentTime+duration);
}

// ===============================
// LIVE SYNC
// ===============================
function preloadDurations() {
    return Promise.all(playlist.map(filename => {
        return new Promise(res=>{
            const a = new Audio();
            a.src = "songs/"+filename;
            a.addEventListener("loadedmetadata",()=>res(a.duration));
            a.addEventListener("error",()=>res(180)); // fallback
        });
    }));
}

let trackDurations = [];
function getLiveTrackAndOffset(){
    const now = Date.now();
    let elapsed = (now-GLOBAL_START_TIME)/1000;
    let idx = 0;
    while(true){
        const dur = trackDurations[idx]||180;
        if(elapsed < dur) return {trackIndex: idx, offset: elapsed};
        elapsed -= dur;
        idx = (idx+1)%playlist.length;
    }
}

function updateSongLabel(){
    const filename = playlist[currentIdx];
    const cleanName = filename.replace("Music Now, Trap Music Now, Dance Music Now - ","")
                              .replace("(SPOTISAVER).mp3","")
                              .trim();
    if(songLabel) songLabel.textContent = cleanName;
}

// ===============================
// PLAYBACK
// ===============================
function playLiveTrack(){
    const {trackIndex, offset} = getLiveTrackAndOffset();
    currentIdx = trackIndex;
    audio.src = encodeURI("songs/"+playlist[currentIdx]);
    audio.onloadedmetadata = ()=>{
        audio.currentTime = offset;
        audio.play();
        fadeVolume(1,FADE_TIME);
        updateSongLabel();
    };
    audio.onended = playLiveTrack;
}

audio.addEventListener("play",()=>{
    if(!started || !audio.duration) return;
    const {offset} = getLiveTrackAndOffset();
    audio.currentTime = offset;
    updateSongLabel();
});

// Disable skip/prev
if("mediaSession" in navigator){
    navigator.mediaSession.setActionHandler("nexttrack",null);
    navigator.mediaSession.setActionHandler("previoustrack",null);
}

// ===============================
// START BUTTON CLICK
// ===============================
btn.onclick = async ()=>{
    if(started) return;
    started=true;
    initVisualizer();
    trackDurations = await preloadDurations();
    playLiveTrack();
    btn.remove();
};
