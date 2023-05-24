// // background.js
// chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
// 	// Check if the URL has been updated to a new page
// 	if (tab.status === "complete" && tab.url !== undefined) {
//         console.log(tab.url);
// 		if (tab.url.includes("https://chat.openai.com")) {
// 			// Inject your content script into the page
// 			chrome.scripting.executeScript({
// 				target: { tabId: tab.id },
// 				files: ["scripts/content.js"],
// 			});
// 			console.log("Executed");
// 		}
// 	}
// });
