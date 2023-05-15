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
let ctx1, ctx2;

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
})




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
        [ctx1, ctx2] = [undefined,undefined]
        .map((_) => document.createElement("canvas"))
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

videoFeedVid.addEventListener("videostoped", () => console.log("Stopped"));

function checkForMotion(){
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
                let r = Math.abs(imgData1.data[i] - imgData2.data[i])*10;
                let g = Math.abs(imgData1.data[i+1] - imgData2.data[i+1])*10;
                let b = Math.abs(imgData1.data[i+2] - imgData2.data[i+2])*10;
    
                        const pixelScore = (r+g+b)/3;
                        if(pixelScore>250) {
                            imageScore++;
                        }
            }
            addResult(imageScore);
        }, 50);
    } catch {
        console.error("Some error occurred inside of the checkForMotion()");
    }
}

//Results Section
function addResult(text) {
    const p = document.createElement("p");
    p.innerText = `${text}`;
    displayDiv.appendChild(p);
    p.scrollIntoView();
    return p;
}

let motionTimer = setInterval(checkForMotion, 200);