chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'main.html' });
});

// // Listen for messages from other parts of the extension
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === "getAuthToken") {
//       getAuthToken(message.interactive)
//           .then((token) => {
//               sendResponse({ success: true, token: token });
//           })
//           .catch((error) => {
//               console.error("Error getting auth token:", error);
//               sendResponse({ success: false, error: error.message });
//           });
//       return true; // Keep the message channel open for async response
//   } else if (message.action === "revokeAuthToken") {
//       revokeAuthToken(message.token)
//           .then(() => {
//               sendResponse({ success: true });
//           })
//           .catch((error) => {
//               console.error("Error revoking auth token:", error);
//               sendResponse({ success: false, error: error.message });
//           });
//       return true;
//   }
// });

// // Function to get OAuth token
// function getAuthToken(interactive = true) {
//   return new Promise((resolve, reject) => {
//       chrome.identity.getAuthToken({ interactive: interactive }, (token) => {
//           if (chrome.runtime.lastError || !token) {
//               reject(new Error(chrome.runtime.lastError?.message || "Failed to get auth token"));
//           } else {
//               resolve(token);
//           }
//       });
//   });
// }

// // Function to revoke OAuth token
// function revokeAuthToken(token) {
//   return new Promise((resolve, reject) => {
//       if (!token) {
//           reject(new Error("No token provided for revocation"));
//           return;
//       }

//       // Use the token to revoke access
//       fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`, {
//           method: "POST",
//           headers: {
//               "Content-Type": "application/x-www-form-urlencoded"
//           }
//       })
//           .then((response) => {
//               if (response.ok) {
//                   chrome.identity.removeCachedAuthToken({ token: token }, () => {
//                       resolve();
//                   });
//               } else {
//                   reject(new Error("Failed to revoke token"));
//               }
//           })
//           .catch((error) => {
//               reject(error);
//           });
//   });
// }

// // Handle background tasks (optional)
// chrome.runtime.onInstalled.addListener(() => {
//   console.log("Extension installed and ready to use!");
// });

// // Optionally handle updates or alarms for periodic tasks
// chrome.alarms.create("refreshToken", { delayInMinutes: 55, periodInMinutes: 55 });
// chrome.alarms.onAlarm.addListener((alarm) => {
//   if (alarm.name === "refreshToken") {
//       console.log("Refreshing token...");
//       getAuthToken(false).catch((err) => console.error("Error refreshing token:", err));
//   }
// });
