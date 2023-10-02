// document
//   .querySelector(".icon-button.close")
//   .addEventListener("click", () => window.close());

// document.querySelector(".button").addEventListener("click", () => {
//   chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
//     chrome.tabs.sendMessage(tab.id, { action: "request_recording" }, () => {
//       if (chrome.runtime.lastError) {
//         console.log("error requesting recording", chrome.runtime.lastError);
//       }
//     });
//   });
// });

const videoElement = document.querySelector("#video-element");

let stream;
navigator.mediaDevices
  .getUserMedia({ video: { facingMode: "user" }, audio: false })
  .then((_stream) => {
    stream = _stream;
    videoElement.srcObject = _stream;
  })
  .catch((error) => {
    console.error("Error accessing front camera:", error);
  });

window.addEventListener("unload", () => {
  if (stream) {
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
});
