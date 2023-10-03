chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && /^http/.test(tab.url)) {
    chrome.scripting
      .executeScript({
        target: { tabId },
        files: ["./content.js"],
      })
      .catch((error) =>
        console.log("error injecting HelpMeOut scripts", error)
      );

    chrome.scripting
      .insertCSS({
        target: { tabId },
        files: ["./controls.css"],
      })
      .catch((error) => console.log("error injecting HelpMeOut CSS", error));
  }
});
