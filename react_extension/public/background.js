chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'main.html' });
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("Service worker loaded!");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(12345);
  if (message.action === "getOAuthToken") {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
          if (chrome.runtime.lastError || !token) {
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
              sendResponse({ success: true, token });
          }
      });
      return true; // Required to send an asynchronous response
  }
});
