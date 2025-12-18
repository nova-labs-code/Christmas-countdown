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

let currentIdx = 0;
const audio = new Audio();
let audioCtx, analyser, dataArray, source, gainNode;
const visualLayer = document.getElementById('visual-layer');
const FADE_TIME = 2; // Fade in/out time in seconds

const btn = document.createElement("button");
btn.id = "start-audio-btn";
btn.innerHTML = "START Music";
document.body.appendChild(btn);

function initVisualizer() {
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        gainNode = audioCtx.createGain(); // For smooth fading
        
        source = audioCtx.createMediaElementSource(audio);
        source.connect(gainNode);
        gainNode.connect(analyser);
        analyser.connect(audioCtx.destination);
        
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        renderFrame();
    } catch(e) { console.warn("Audio Context init failed."); }
}

function renderFrame() {
    requestAnimationFrame(renderFrame);
    if (!analyser) return;
    analyser.getByteFrequencyData(dataArray);
    
    let bass = dataArray[2]; 
    let mid = dataArray[15];
    let time = Date.now() * 0.003;
    
    let shiftX = (Math.sin(time) * 10) + (mid / 20); 
    let scale = 1.05 + (bass / 600);
    let bright = 1 + (bass / 350);
    let rotation = Math.sin(time) * (bass / 200);

    if(visualLayer) {
        visualLayer.style.transform = `scale(${scale}) translateX(${shiftX}px) rotate(${rotation}deg)`;
        visualLayer.style.filter = `brightness(${bright})`;
    }

    // Auto-Fade Out logic near end of song
    if (audio.duration && audio.currentTime > audio.duration - FADE_TIME) {
        fadeVolume(0, FADE_TIME);
    }
}

function fadeVolume(target, duration) {
    if (gainNode) {
        gainNode.gain.linearRampToValueAtTime(target, audioCtx.currentTime + duration);
    }
}

function playTrack(i) {
    if (i >= playlist.length) i = 0;
    if (i < 0) i = playlist.length - 1;
    currentIdx = i;

    const filename = playlist[currentIdx];
    audio.src = encodeURI("songs/" + filename);
    
    let cleanTitle = filename
        .replace("Music Now, Trap Music Now, Dance Music Now - ", "")
        .replace("(SPOTISAVER).mp3", "")
        .trim();

    // Start track with volume at 0, then fade in
    if (gainNode) gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

    audio.play().then(() => {
        fadeVolume(1, FADE_TIME); // Smoothly fade in to full volume
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: cleanTitle,
                artist: "Christmas Countdown"
            });
        }
    }).catch(() => setTimeout(() => playTrack(currentIdx + 1), 500));
}

// Media Keys
if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => audio.play());
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    navigator.mediaSession.setActionHandler('nexttrack', () => {
        fadeVolume(0, 0.5); // Fast fade out on skip
        setTimeout(() => playTrack(currentIdx + 1), 500);
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
        fadeVolume(0, 0.5);
        setTimeout(() => playTrack(currentIdx - 1), 500);
    });
}

audio.onended = () => playTrack(currentIdx + 1);

btn.onclick = () => {
    initVisualizer();
    playTrack(0);
    btn.remove();
};