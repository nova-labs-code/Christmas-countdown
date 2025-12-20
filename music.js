document.title = "Christmas Countdown (Radio)";
const audio = new Audio();

// Playlist + speech
const songs = [
    "All I Want For Christmas Is You",
    "Baby It's Cold Outside",
    "Blue Christmas",
    "Carol Of The Bells",
    "Christmas (Baby Please Come Home)",
    "Christmas Canon",
    "Dance Of The Sugar Plum Fairy",
    "Deck The Halls",
    "Do You Want To Build A Snowman",
    "Feliz Navidad",
    "Frosty The Snowman",
    "God Rest Ye Merry Gentlemen",
    "Hallelujah",
    "Here Comes Santa Claus",
    "Holly Jolly Christmas",
    "I Want A Hippopotamus For Christmas",
    "It's Beginning To Look A Lot Like Christmas",
    "It's The Most Wonderful Time Of The Year",
    "Jingle Bell Rock",
    "Jingle Bells",
    "Last Christmas",
    "Let It Snow! Let It Snow!",
    "Little Drummer Boy",
    "Mistletoe",
    "O Christmas Tree",
    "Rockin Around The Christmas Tree",
    "Rudolph The Red-Nosed Reindeer",
    "Santa Baby",
    "Santa Claus Is Comin' To Town",
    "Silent Night",
    "Sleigh Ride",
    "The Christmas Song",
    "The Nutcracker March",
    "Up On The Housetop",
    "We Wish You A Merry Christmas",
    "White Christmas",
    "Winter Wonderland",
    "Wonderful Christmastime",
    "You're A Mean One Mr.Grinch!"
];

const playlist = [];
for (let song of songs){
    playlist.push({
        name: song,
        src: `songs/Music Now, Trap Music Now, Dance Music Now - ${song} (SPOTISAVER).mp3`
    });
    playlist.push({name:"Speech", src:"songs/speech.mp3"});
}

// Placeholder durations for sync (in seconds)
const songDurations = playlist.map(()=>180);

// Live radio start: Dec 1, 2025
const serverStartTime = new Date("Dec 1, 2025 00:00:00 UTC").getTime();

function getCurrentSongIndexAndOffset(){
    const now = Date.now();
    const elapsed = (now-serverStartTime)/1000;
    const totalDuration = songDurations.reduce((a,b)=>a+b,0);
    let time = elapsed % totalDuration;

    for(let i=0;i<playlist.length;i++){
        if(time<songDurations[i]) return {index:i, offset:time};
        time -= songDurations[i];
    }
    return {index:0, offset:0};
}

// AudioContext for visual effects
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let analyser;
let dataArray;

function setupAudioContext(){
    const track = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    track.connect(analyser);
    analyser.connect(audioCtx.destination);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
}

function animateEffects(){
    requestAnimationFrame(animateEffects);
    if(!analyser) return;
    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a,b)=>a+b,0)/dataArray.length;
    document.querySelectorAll('.snowflake').forEach((flake,i)=>{
        flake.style.transform = `translateY(${Math.sin(Date.now()/1000 + i)*5 + avg/15}px)`;
        flake.style.opacity = 0.5 + avg/512;
    });
}

// Play synchronized music
function playSync(){
    const {index, offset} = getCurrentSongIndexAndOffset();
    audio.src = playlist[index].src;
    audio.currentTime = offset;
    audio.play().catch(()=>{});

    if('mediaSession' in navigator){
        navigator.mediaSession.metadata = new MediaMetadata({
            title: playlist[index].name,
            artist: 'Christmas Countdown',
            album: 'Live Radio',
            artwork: [{src:'favicon.ico', sizes:'64x64', type:'image/png'}]
        });
    }

    const remaining = songDurations[index]-offset;
    setTimeout(playSync, remaining*1000);
}

// Start music + PiP of page
async function startMusic(){
    if(audioCtx.state==='suspended') await audioCtx.resume();
    setupAudioContext();
    animateEffects();
    playSync();

    try{
        const bodyStream = document.body.captureStream(30); // 30fps
        const video = document.createElement('video');
        video.srcObject = bodyStream;
        video.muted = true;
        video.style.display='none';
        document.body.appendChild(video);
        await video.play();
        await video.requestPictureInPicture();
    }catch(err){
        console.error("PiP setup failed:", err);
    }
}
