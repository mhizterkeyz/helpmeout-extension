var stream = null;
var paused = false;
var injected = [];
var audio = null;
var video = null;
var mixedStream = null;
var recorder = null;
var chunks = [];
var recording = false;
var cleanups = [];
var controls = `
<div class="hmo-root">
<div class="hmo-controls">
  <div class="hmo-video">
    <video src="" id="video-element" autoplay></video>
  </div>

  <div class="hmo-floating-controls">
    <div style="gap: 24px; display: flex; align-items: center">
      <div style="display: flex; align-items: center; gap: 4px">
        <div class="hmo-timer">
          <span data-hmo-timer>00:00:00</span>

          <div class="hmo-live"><span></span></div>
        </div>

        <div class="hmo-divider"></div>
      </div>

      <div class="hmo-buttons">
        <button data-hmo-pause>
          <span class="material-icons">pause</span>

          <span>Pause</span>
        </button>

        <button data-hmo-stop>
          <span class="material-icons">stop</span>

          <span>Stop</span>
        </button>

        <button data-hmo-video="off">
          <span class="material-icons">videocam_off</span>

          <span>Camera</span>
        </button>

        <button data-hmo-audio="off">
          <span class="material-icons">mic_off</span>

          <span>Mic</span>
        </button>

        <button class="trash" data-hmo-discard>
          <span class="material-icons">delete</span>
        </button>
      </div>
    </div>
  </div>
</div>
</div>
`;

function loadStylesheet(url) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = url;

  document.head.appendChild(link);
}

function injectHTML(html) {
  if (injected.includes(html)) return;
  injected.push(html);
  const div = document.createElement("div");

  div.innerHTML = html;

  document.body.append(div);
}

function toggleVideo() {
  const videoOn = !!document.querySelector('button[data-hmo-video="on"]');
  const videoElement = document.querySelector(".hmo-root #video-element");
  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      stream = null;
    }
  };
  if (videoOn) {
    stopStream();
    videoElement.parentElement.style.display = "none";
    document
      .querySelector("button[data-hmo-video]")
      .setAttribute("data-hmo-video", "off");

    document.querySelector("button[data-hmo-video] .material-icons").innerText =
      "videocam_off";
  } else {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((_stream) => {
        videoElement.parentElement.style.display = "block";
        stream = _stream;
        videoElement.srcObject = _stream;
        window.addEventListener("unload", stopStream);
        document
          .querySelector("button[data-hmo-video]")
          .setAttribute("data-hmo-video", "on");
        document.querySelector(
          "button[data-hmo-video] .material-icons"
        ).innerText = "videocam";
      })
      .catch((error) => {
        console.error("Error accessing front camera:", error);
      });
  }
}

function initMic() {
  return navigator.mediaDevices
    .getUserMedia({
      video: false,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
      },
    })
    .then((_audio) => {
      audio = _audio;
      _audio.getTracks().forEach((track) => {
        track.enabled = false;
      });
      window.addEventListener("unload", () => {
        if (audio) {
          audio.getTracks().forEach((track) => {
            track.stop();
          });
        }
      });
    })
    .catch((error) => {
      console.error("Error accessing microphone", error);
    });
}

function toggleAudio() {
  const audioOn = !!document.querySelector('button[data-hmo-audio="on"]');
  const toggleMic = (val) => {
    document
      .querySelector("button[data-hmo-audio]")
      .setAttribute("data-hmo-audio", val ? "on" : "off");
    document.querySelector("button[data-hmo-audio] .material-icons").innerText =
      val ? "mic" : "mic_off";
  };
  const toggleMicTracks = (val) => {
    audio.getTracks().forEach((track) => {
      track.enabled = val;
    });
  };

  if (audio) {
    toggleMicTracks(!audioOn);
    toggleMic(!audioOn);
  }
}

function breakSeconds(seconds) {
  const hours = Math.floor(seconds / 3600);
  const remainingSeconds = seconds % 3600;
  const minutes = Math.floor(remainingSeconds / 60);
  const remainingSecondsAfterMinutes = remainingSeconds % 60;

  return {
    hours: hours,
    minutes: minutes,
    seconds: remainingSecondsAfterMinutes,
  };
}

function updateTimer(secondsElasped) {
  const { hours, minutes, seconds } = breakSeconds(secondsElasped);

  document.querySelector("span[data-hmo-timer]").innerText = `${
    hours < 10 ? `0${hours}` : hours
  } : ${minutes < 10 ? `0${minutes}` : minutes} : ${
    seconds < 10 ? `0${seconds}` : seconds
  }`;

  setTimeout(updateTimer, 1000, secondsElasped + (paused ? 0 : 1));
}

function cleanUp() {
  cleanups.forEach((func, i) => {
    if (func) {
      func();
      cleanups[i] = null;
    }
  });

  cleanups = cleanups.filter((el) => !!el);
}

loadStylesheet("https://fonts.googleapis.com/icon?family=Material+Icons");
injectHTML(controls);

chrome.runtime.onMessage.addListener(function handleRuntimeMessage(
  message,
  _sender_,
  sendResponse
) {
  const { action, video: shouldVideo, audio: shouldAudio } = message;
  if (action === "request_recording") {
    sendResponse(`processed: ${message.action}`);
    if (recording) return;
    recording = true;

    initMic().finally(() => {
      document.querySelector(".hmo-root").style.display = "block";
      document
        .querySelector("button[data-hmo-video]")
        .addEventListener("click", toggleVideo);
      document
        .querySelector("button[data-hmo-audio]")
        .addEventListener("click", toggleAudio);
      document
        .querySelector("button[data-hmo-stop]")
        .addEventListener("click", () => {
          if (recorder && recorder.stop) {
            recorder.stop();
          }
        });
      document
        .querySelector("button[data-hmo-pause]")
        .addEventListener("click", () => {
          paused = !paused;
          if (paused) {
            document.querySelector(
              "button[data-hmo-pause] .material-icons"
            ).innerText = "play_arrow";
            document.querySelector(
              "button[data-hmo-pause] span:not(.material-icons)"
            ).innerText = "Play";
            if (recorder && recorder.pause) {
              recorder.pause();
            }
          } else {
            document.querySelector(
              "button[data-hmo-pause] .material-icons"
            ).innerText = "pause";
            document.querySelector(
              "button[data-hmo-pause] span:not(.material-icons)"
            ).innerText = "Pause";
            if (recorder && recorder.resume) {
              recorder.resume();
            }
          }
        });

      if (shouldVideo) {
        document.querySelector("button[data-hmo-video]").click();
      }
      if (shouldAudio) {
        document.querySelector("button[data-hmo-audio]").click();
      }

      navigator.mediaDevices
        .getDisplayMedia({ video: true })
        .then((_video) => {
          video = _video;
          mixedStream = new MediaStream([
            ..._video.getTracks(),
            ...(audio ? audio.getTracks() : []),
          ]);
          recorder = new MediaRecorder(mixedStream);

          recorder.start(200);
          updateTimer(0);

          recorder.onstop = () => {
            if (recorder) {
              recorder.stream.getTracks().forEach((track) => {
                if (track.readyState === "live") {
                  track.stop();
                }
              });

              const blob = new Blob(chunks, { type: "video/mp4 " });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");

              a.style.display = "none";
              a.href = url;
              a.download = "screen_recording.mp4";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              cleanUp();
            }
          };

          recorder.ondataavailable = (event) => {
            chunks.push(event.data);
          };

          document
            .querySelector("button[data-hmo-discard]")
            .addEventListener("click", cleanUp);

          cleanups.push(() => {
            document.querySelector(".hmo-root").style.display = "none";
            [mixedStream, stream, audio, video].forEach((stream) => {
              if (stream && stream.getTracks) {
                stream.getTracks().forEach((track) => {
                  track.stop();
                });
              }
            });

            mixedStream = null;
            stream = null;
            audio = null;
            paused = false;
            recorder = null;
            video = null;
            chunks = [];
            recording = false;
            injected = [];

            document.querySelector(".hmo-root").remove();

            injectHTML(controls);
          });
        })
        .catch((error) => {
          console.log("Could not record screen", error);
        });
    });
  }
});
