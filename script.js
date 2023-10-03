document
  .querySelector(".icon-button.close")
  .addEventListener("click", () => window.close());

document.querySelector(".button").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.tabs.sendMessage(
      tab.id,
      {
        action: "request_recording",
        video: document.querySelector("#this-switch").checked,
        audio: document.querySelector("#second-switch").checked,
      },
      () => {
        if (chrome.runtime.lastError) {
          console.log("error requesting recording", chrome.runtime.lastError);
        } else {
          window.close();
        }
      }
    );
  });
});
