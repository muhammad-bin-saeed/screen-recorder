const { ipcRenderer } = require('electron');
const { writeFile } = require('fs');

const screenBtn =  document.querySelector('.screen-btn');
const startBtn = document.querySelector('.start-btn');
const resumeBtn = document.querySelector('.resume-btn');
const stopBtn = document.querySelector('.stop-btn');
const muteBtn = document.querySelector('.mute-btn');
const videoScreen = document.querySelector('video');

let isScreenSelected = false;
let isMuted = false;
let screens, mediaRecorder;
let recordedChunks = [];

startBtn.addEventListener('click', () => {
  if(!isScreenSelected) {
    alert('Please select a screen');
    return;
  }
  mediaRecorder.start();
  startBtn.style.display = 'none';
  resumeBtn.classList.remove('d-none');
  stopBtn.classList.remove('d-none');
  resumeBtn.style.display = 'inline-block';
  stopBtn.style.display = 'inline-block';
});

resumeBtn.addEventListener('click', () => {
  if(mediaRecorder.state === "recording") {
    mediaRecorder.pause();
    resumeBtn.innerHTML = 'Resume <i class="bi bi-play-circle"></i>';
  } else if(mediaRecorder.state === "paused") {
    resumeBtn.innerHTML = 'Pause <i class="bi bi-pause-circle"></i>';
    mediaRecorder.resume();
  }
});

stopBtn.addEventListener('click', () => {
  mediaRecorder.stop();
  stopBtn.style.display = 'none'; 
  startBtn.style.display = 'inline-block'; 
  resumeBtn.style.display = 'none'; 
});

muteBtn.addEventListener('click', () => {
  if(mediaRecorder?.state === undefined || mediaRecorder?.state === "inactive") {
  isMuted ? isMuted = false : isMuted = true;
  } else {
    alert('Please stop recording');
    return;
  }

  isScreenSelected && alert("Select a screen again to mute/unmute");
  muteBtn.classList.contains('btn-success') ? ( muteBtn.classList.remove('btn-success'), muteBtn.classList.add('btn-danger') ) : ( muteBtn.classList.add('btn-success'), muteBtn.classList.remove('btn-danger') );
  muteBtn.innerHTML === 'Mute <i class="bi bi-mic"></i>' ? muteBtn.innerHTML = 'Unmute <i class="bi bi-mic-mute"></i>' : muteBtn.innerHTML = 'Mute <i class="bi bi-mic"></i>';
});

const desktopCapturer = {
  getSources: (opts) => ipcRenderer.invoke('DESKTOP_CAPTURER_GET_SOURCES', opts)
}

const getVideoScreens = async () => {
  const screenSources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
   screens = await screenSources.map(source => source);
  ipcRenderer.send('MENU_GET_SCREENS', JSON.stringify(screens));
  isScreenSelected = true;
}
screenBtn.addEventListener('click', () => {
  if(mediaRecorder?.state === undefined || mediaRecorder?.state === "inactive") {
    getVideoScreens();
  } else {
    alert('Please stop recording First');
  }
  
});

ipcRenderer.on('MENU_SELECT_SCREEN', (event, item) => {
  const firstName = item.name.split('-').length > 1 ? item.name.split('-')[0].substring(0, 13)+'...' : item.name.split('-')[0];
  const lastName = item.name.split('-').length > 1 ? item.name.split('-').pop() : '';
  screenBtn.innerHTML = `<i class="bi bi-laptop"></i> ${firstName + lastName}`;
  selectedScreen(item);
}); 

async function selectedScreen(source) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: isMuted ? false : {
      mandatory: {
        chromeMediaSource: 'desktop',
      }
    },
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        maxFrameRate: 60,
      }, 
    }
  });
  videoScreen.srcObject = stream;
  videoScreen.play();

  let options = {
    mimeType: 'video/webm;codecs=vp9',
    audioBitrate: 128000,
    videoBitrate: 2500000,
    video: {
      width: stream.getVideoTracks()[0].getSettings().width,
      height: stream.getVideoTracks()[0].getSettings().height,
      frameRate: stream.getVideoTracks()[0].getSettings().frameRate,
    }
  }
  mediaRecorder = new MediaRecorder(stream, options);

  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.onstop = handleStop;
}

handleDataAvailable = (event) => {
  if (event.data.size > 0) {
    recordedChunks.push(event.data);
  }
}

const dialog = {
  showSaveDialog: (opts) => ipcRenderer.invoke('SAVE_VIDEO', opts)
}

handleStop = async (event) => {
  const lastVideo = [recordedChunks.pop()];
  const blob = new Blob(lastVideo, { type: 'video/webm;codecs=vp9' });
  const buffer = Buffer.from(await blob.arrayBuffer());

  const { filePath } = await dialog.showSaveDialog({
    buttonLabel: 'Save Video',
    filters: [{ name: 'Video', extensions: ['webm'] }],
    defaultPath: `video-${Date.now()}.webm`
  });

  if (filePath) {
    writeFile(filePath, buffer, (err) => {
      if (err) throw err;
      alert('The file has been saved!');
    });
  }
  
}

ipcRenderer.on('START', () => {
  ipcRenderer.send('IS_SELECTED', isScreenSelected);
  startBtn.click();
});

ipcRenderer.on('PAUSE', () => {
  resumeBtn.click();
});

ipcRenderer.on('RESUME', () => {
  resumeBtn.click();
});

ipcRenderer.on('STOP', () => {
  stopBtn.click();
});
