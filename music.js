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
let audioCtx, analyser, dataArray, source;

const btn = document.createElement("button");
btn.id = "start-audio-btn";
btn.innerHTML = "PLAY AUDIO";
document.body.appendChild(btn);

function initVisualizer() {
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        source = audioCtx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        analyser.fftSize = 64; 
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        renderFrame();
    } catch(e) { console.warn("AudioContext blocked."); }
}

function renderFrame() {
    requestAnimationFrame(renderFrame);
    if (!analyser) return;
    analyser.getByteFrequencyData(dataArray);
    let avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
    
    // SCALE (Pulse) and ROTATION (Twist)
    let scale = 1 + (avg / 600); 
    let rotation = (avg / 20); // Background rotates based on loudness
    let bright = 1 + (avg / 300);

    // Apply base scale 1.2 to hide edges during rotation
    document.body.style.transform = `scale(${scale + 0.1}) rotate(${rotation}deg)`;
    document.body.style.filter = `brightness(${bright})`;
}

function playTrack(i) {
    if (i >= playlist.length) i = 0;
    currentIdx = i;
    const folder = "songs/";
    const filename = playlist[currentIdx];
    
    audio.src = encodeURI(folder + filename);
    
    audio.play().then(() => {
        if ('mediaSession' in navigator) {
            let cleanTitle = filename.replace("Music Now, Trap Music Now, Dance Music Now - ", "").replace("(SPOTISAVER).mp3", "").trim();
            navigator.mediaSession.metadata = new MediaMetadata({ 
                title: cleanTitle,
                artist: "Christmas Countdown"
            });
        }
    }).catch(err => {
        console.error("Path Error:", audio.src);
        setTimeout(() => playTrack(currentIdx + 1), 1000);
    });
}

audio.onended = () => playTrack(currentIdx + 1);

if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('nexttrack', () => playTrack(currentIdx + 1));
    navigator.mediaSession.setActionHandler('previoustrack', () => playTrack(currentIdx - 1));
}

btn.onclick = () => {
    initVisualizer();
    playTrack(0);
    btn.remove();
};