"use-strict"

// Section Elements
const startBtn = document.querySelector("body > div > section.section.section--loading.--flex.--column > div > div.container.container--btn > button");
const permissionsBtn = document.querySelector("body > div > section.section.section--permissions.--flex.--column > div > div.container.container--btn > button");
const videoStatusH1 = document.querySelector("body > div > section.section.section--application > div > div > div.container.container--text.--flex > h1");
const liveDotDiv = document.querySelector("body > div > section.section.section--application > div > div > div.container.container--text.--flex > div");
const videoFeedVid = document.querySelector("body > div > section.section.section--application > div > div > div.container.container--video > video");
const displayDiv = document.querySelector("body > div > section.section.section--application > div > div > div.container.container--results.--flex.--column > div > div");

// Control & Other Variables
let videoHeight, videoWidth;
let ctx1, ctx2, cv1, cv2;
let motionTimer;
// Creating the section object to manipulate it from our javascript code
const allSections = document.querySelectorAll(".section");
const sectionNames = {};
allSections.forEach(sectionEl => sectionNames[`${sectionEl.getAttribute("data-jsname")}`] = sectionEl);


// Custom Events
const videoStopedEvent = new CustomEvent("videostoped", {
    detail: {},
    bubbles: false,
    cancelable: true,
    composed: false
});

// Functions

function goToSection(name, e=undefined) {
    let i = 2
    allSections.forEach(section => {
        if(section === sectionNames[name]) {
            section.style.filter = "opacity(1)";
            document.documentElement.style.setProperty(section.getAttribute("data-index"), `3`);        
        } else {
            section.style.filter = "opacity(0)";
            document.documentElement.style.setProperty(section.getAttribute("data-index"), `${i}`);
            i--;        
        }
    })
    e?.target.removeEventListener("touchend", goToSection);
    e?.target.removeEventListener("click", goToSection);

    return sectionNames[name];
}

function allowVoice(e=undefined) {
    const lecture = new SpeechSynthesisUtterance('hello');
    lecture.volume = 0;
    speechSynthesis.speak(lecture);
    e?.target.removeEventListener("touchend", allowVoice);
    e?.target.removeEventListener("click", allowVoice);
    return lecture;
}


async function grantVideo(e=undefined) {
    await navigator.mediaDevices.getUserMedia({audio: false, video: {facingMode: "environment", width: { min: 400, ideal: 500, max: 600 }, height: { min: 400, ideal: 500, max: 600 }}})
    .then(media => {
        videoFeedVid.srcObject = media;
        // defining outter control variables
        ({videoHeight, videoWidth} = videoFeedVid);
        const getVideoSize = (resolve) => {
                setTimeout(() => {
                    if(videoHeight > 0 && videoWidth > 0) {
                        resolve();
                    } else {
                        ({videoHeight, videoWidth} = videoFeedVid);
                        getVideoSize(resolve);
                    
                    }
                }, 200);
        } 
        return new Promise(getVideoSize);
    }).then(() => {
        //creating the contexts
        const cvs = [undefined,undefined]
        .map((_) => document.createElement("canvas"));
        [cv1, cv2] = cvs;
        [ctx1, ctx2] = cvs
        .map((canva) => {
            canva.height = videoHeight;
            canva.width = videoWidth;
            return canva;
        })
        .map((canva) => {
            return canva.getContext("2d", {willReadFrequently: true});
        });
    });
    e?.target.removeEventListener("touchend",grantVideo);
    e?.target.removeEventListener("click",grantVideo);
}

// --- SECTION: LOADING ---

function start(e) {
    allowVoice(e);

    // Adding tesseract
    const script = document.createElement("script");
    script.src = "./tesseract.min.js";
    document.head.appendChild(script);
    
    if(localStorage.getItem("permissionGranted") === "true") {
        goToSection("application");
    } else {
        goToSection("permissions");
    }
}

startBtn.addEventListener("touchend", start);
startBtn.addEventListener("click", start);

// --- SECTION: PERMISSIONS ---

async function askPermissions(e) {
    grantVideo(e);
    goToSection("application");
    // document.querySelector(".section--application .container.container--video").style.filter = "opacity(0)"
}

permissionsBtn.addEventListener("touchend", askPermissions);
permissionsBtn.addEventListener("click", askPermissions);

//CAMERA LOGIC

// Canvas Elements

const checkInterval = 200;
const maxTimeSecs = 1;
const times = maxTimeSecs*1000/checkInterval; 
let count = 0;
videoFeedVid.addEventListener("videostoped", () => console.log("Stopped"));

function getVoices() {
    let voices = speechSynthesis.getVoices();
    if(!voices.length) {
        let utterance = new SpeechSynthesisUtterance(" ");
        speechSynthesis.speak(utterance);
        voices = speechSynthesis.getVoices();
    }
    return voices;
}

function speak(text, voice, rate, pitch, volume){
    let speakData = new SpeechSynthesisUtterance();
    speakData.text = text;
    speakData.voice = voice;
    speakData.rate = rate;
    speakData.pitch = pitch;
    speakData.volume = volume;
    speakData.lang = "pt-br"

    speechSynthesis.speak(speakData);
    return speakData;
}

function checkForMotion(){
    if(ctx1 && ctx2) {
        ctx1.clearRect(0, 0, videoWidth, videoHeight);
        ctx2.clearRect(0, 0, videoWidth, videoHeight);
        
        
        ctx1.drawImage(videoFeedVid, 0, 0, videoWidth, videoHeight);
        try {
            setTimeout(() => {
                ctx2.drawImage(videoFeedVid, 0, 0, videoWidth, videoHeight);
                
                let imageScore = 0;
                
                const imgData1 = ctx1.getImageData(0, 0, videoWidth, videoHeight);
                const imgData2 = ctx2.getImageData(0, 0, videoWidth, videoHeight);
                
                for(let i = 0; i<imgData1.data.length; i+=4) {
                    let r = Math.abs(imgData1.data[i] - imgData2.data[i])*3;
                    let g = Math.abs(imgData1.data[i+1] - imgData2.data[i+1])*3;
                    let b = Math.abs(imgData1.data[i+2] - imgData2.data[i+2])*3;
                    
                    const pixelScore = (r+g+b)/3;
                    if(pixelScore>200) {
                        imageScore++;
                    }
                }


                addResult((imageScore <= 4000? "Parado": "Movimento")+" "+imageScore);
                if(imageScore <= 4000) {
                    count++;
                    if(count===times){
                        clearInterval(motionTimer);
                        let voices = getVoices().find(voice => voice.lang === "pt-BR");
                        Tesseract.recognize(cv1, "por")
                        .then(textObj => {
                            const result = `${textObj.data.text}`;
                            addResult(textObj.data.text);
                            return new Promise((resolve, reject) => {
                                if(result.match(/[A-Za-zÀ-ÿ]{3,}/g)?.length > 2) {
                                    let text = result.match(/[A-Za-zÀ-ÿ]{1,}/g).join(" "); 
                                    let speaker = speak(text, voices, 0.5, 4, 1);
                                    speaker.addEventListener("end", () => {
                                        resolve();
                                    })
                                    speaker.addEventListener("error", () => {
                                        addResult("Algum erro aconteceu....");
                                        resolve();
                                    })
                                } else {
                                    addResult("Não é um texto");
                                    resolve();
                                }
                            })
                        })
                        .then(() => {
                            motionTimer = setInterval(checkForMotion, checkInterval);
                            count=0;
                        })
                    }
                } else {
                    count=0;
                }




            }, 50);
        } catch {
            console.error("Some error occurred inside of the checkForMotion()");
        }
    }
}

motionTimer = setInterval(checkForMotion, checkInterval);

//Results Section
function addResult(text) {
    const p = document.createElement("p");
    p.innerText = `${text}`;
    displayDiv.appendChild(p);
    p.scrollIntoView();
    return p;
}
