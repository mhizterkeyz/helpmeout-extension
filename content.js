console.log("Content script injected");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  let recorder = null;
  if (message.action === "request_recording") {
    sendResponse(`processed: ${message.action}`);

    if (recorder) return;
    navigator.mediaDevices
      .getDisplayMedia({
        audio: true,
        video: {
          width: 99999999999999,
          height: 9999999999999,
        },
      })
      .then((stream) => {
        recorder = new MediaRecorder(stream);

        recorder.start();

        recorder.onstop = () => {
          stream.getTracks().forEach((track) => {
            if (track.readyState === "live") {
              track.stop();
            }
          });
        };

        recorder.ondataavailable = (event) => {
          const url = URL.createObjectURL(event.data);
          const a = document.createElement("a");

          a.style.display = "none";
          a.href = url;
          a.download = "screen_recording.webm";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        };
      });
  }
});
