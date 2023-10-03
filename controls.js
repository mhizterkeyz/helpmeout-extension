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
