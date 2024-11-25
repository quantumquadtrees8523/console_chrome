chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'main.html' });
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("Service worker loaded!");
});
