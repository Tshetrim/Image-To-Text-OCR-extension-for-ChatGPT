function getStorageData(keys) {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get(keys, function (result) {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve(result);
			}
		});
	});
}

const options = {
	formatOutput: true,
	showUploadButton: true,
	enableDirectPasting: true,
	useThirdPartyOCR: false,
};

getStorageData(Object.keys(options))
	.then((result) => {
		// If options are not set in storage, use default values
		Object.keys(options).forEach((optionKey) => {
			options[optionKey] = result.hasOwnProperty(optionKey) ? result[optionKey] : options[optionKey];
			// Set checkbox state
			document.getElementById(optionKey).checked = options[optionKey];
		});
	})
	.catch((error) => {
		console.error("Error getting data from storage: ", error);
	});

document.getElementById("save-button").addEventListener("click", function () {
	// Get current checkbox states
	Object.keys(options).forEach((optionKey) => {
		options[optionKey] = document.getElementById(optionKey).checked;
	});

	// Save options to chrome's local storage
	chrome.storage.local.set(options, function () {
		console.log("Options saved");

		// Notify user that options are saved
		let notification = document.getElementById("notification");
		notification.style.display = "block";
		notification.innerHTML = "<p>Options saved! Please refresh the page to apply the settings.</p>";
		// Remove the notification after some time
		setTimeout(function () {
			notification.style.display = "none";
			notification.innerHTML = "";
		}, 3000);
	});
});
