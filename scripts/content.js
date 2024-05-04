let LANGUAGES = {
	Arabic: "ara",
	"Chinese - Simplified": "chi_sim",
	"Chinese - Traditional": "chi_tra",
	German: "deu",
	English: "eng",
	French: "fra",
	Hindi: "hin",
	Italian: "ita",
	Japanese: "jpn",
	Korean: "kor",
	Portuguese: "por",
	Russian: "rus",
};

const OPTIONS = {
	formatOutput: true,
	showUploadButton: true,
	showLanguageButton: true,
	enableDirectPasting: true,
	enableDragAndDrop: true,
	useThirdPartyOCR: false,
	theme: "default-mode",
	showInitialLoadingMessage: true,
};

const CONSTANTS = {
	scriptId: "image-to-text-content-script",
	workerLanguage: ["eng"],
	textareaId: "prompt-textarea",
	uploadButtonID: "upload-button-image-to-text-extension",
	uploadButtonBGColor: "#343640",
	lightModeUploadButtonIcon: "images/upload-icon-dark.png",
	darkModeUploadButtonIcon: "images/upload-icon-light.png",
	defaultUploadButtonIcon: "images/upload-icon-default.png",
	languageButtonIcon: "images/languages-icon.png",
	flexBoxContainerId: "flexbox-container-image-to-text-extension",
};

const CONFIG = {
	debug: false, // set this to false for production
};

function log() {
	if (CONFIG.debug) {
		console.log.apply(console, arguments);
	}
}

// create an observer instance
let observer = new MutationObserver(function (mutations) {
	// mutations is an array of MutationRecords
	// we'll just check if it has any items
	if (mutations.length) {
		let textareaElement = document.getElementById(CONSTANTS.textareaId);
		let shouldInitialize = false;
		if (!textareaElement) {
			// The textArea is not found, initialize again
			shouldInitialize = true;
		}
		if (OPTIONS.enableDirectPasting && textareaElement && !textareaElement.hasPasteListener) {
			shouldInitialize = true;
		}
		if (OPTIONS.showUploadButton) {
			const hasUploadButton = document.getElementById(CONSTANTS.uploadButtonID);
			if (!hasUploadButton) {
				shouldInitialize = true;
			}
		}

		if (shouldInitialize) initialize();
	}
});

// configuration of the observer
let observerConfig = {
	childList: true, // track direct child addition or removal
	subtree: true, // also look for changes in the descendants
};

// Get data in local storage
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

// Sets data in local storage
function setStorageData(dataObj) {
	return new Promise((resolve, reject) => {
		chrome.storage.local.set(dataObj, function () {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve();
			}
		});
	});
}

//.then runs only after all promises return
Promise.all([
	getStorageData(Object.keys(OPTIONS)), // Retrieve options data
	getStorageData(["workerLanguage"]), // Retrieve worker language data
])
	.then(([optionsResult, languageResult]) => {
		// If options are not set in storage, use default values
		Object.keys(OPTIONS).forEach((optionKey) => {
			OPTIONS[optionKey] = optionsResult.hasOwnProperty(optionKey)
				? optionsResult[optionKey]
				: OPTIONS[optionKey];
		});

		// If worker language data is available, set it
		if (languageResult.workerLanguage) {
			CONSTANTS.workerLanguage = languageResult.workerLanguage;
		}

		log("Options: ", OPTIONS);
		log("Storage Worker Language: ", CONSTANTS.workerLanguage);

		// Start observing after initialization
		observer.observe(document.body, observerConfig);
	})
	.catch((error) => {
		console.error("Error getting data from storage: ", error);
	});

let initializingPromise = null;
let worker = null;
async function initialize() {
	if (initializingPromise) {
		// If initialization is already in progress, return the promise
		return initializingPromise;
	}

	initializingPromise = new Promise(async (resolve, reject) => {
		if (document.getElementById(CONSTANTS.scriptId)) {
			log("Already loaded script");
			try {
				await addExtensionElements((initial = false));
				resolve();
			} catch (error) {
				console.error("Error initializing worker: ", error);
				reject(error);
			}
		} else {
			const script = document.createElement("script");
			script.id = CONSTANTS.scriptId;
			script.src = chrome.runtime.getURL("scripts/tesseract.min.js");
			(document.head || document.documentElement).appendChild(script);

			script.onload = async function () {
				log("Loaded script");
				log(script.src);

				try {
					await addExtensionElements((initial = true));
					resolve();
				} catch (error) {
					console.error("Error initializing worker: ", error);
					reject(error);
				}
			};
		}
	}).finally(() => {
		log("finished init");
		initializingPromise = null;
	});
	return initializingPromise;
}

async function addExtensionElements(initial = true) {
	log("initial: ", initial);
	log("initial worker: ", worker);
	if (initial) {
		worker = await createWorker();
	} else {
		if (typeof worker === "undefined" || worker === null) {
			log("Worker is undefined or null");
			worker = await createWorker();
		}
	}
	log("post adding worker: ", worker);
	if (OPTIONS.showUploadButton) addUploadButton();
	if (OPTIONS.showLanguageButton) addLanguageSelectButton();
	if (OPTIONS.enableDirectPasting) addPasteListener();
	if (OPTIONS.enableDragAndDrop) addDragAndDrop();
	if (OPTIONS.useThirdPartyOCR) addThirdPartyOptionalEngine();
}

function addThirdPartyOptionalEngine() {
	// get the textarea element
	let textarea = document.getElementById(CONSTANTS.textareaId);

	// check if the textarea exists
	if (textarea) {
		// get the parent of the textarea
		let parent = textarea.parentNode;

		// create the iframe element
		let iframe = document.createElement("iframe");
		iframe.id = "third-party-ocr-iframe";
		iframe.width = "100%";
		iframe.height = "500px";
		iframe.src = "https://code-from-screenshot-lmuw6mcn3q-uc.a.run.app/";
		iframe.frameborder = "0";
		iframe.allow = "clipboard-read; clipboard-write";

		// create the button element
		let button = getToggleIframeButton(iframe);

		// insert the button before the iframe
		parent.insertBefore(button, textarea);

		// insert the iframe after the button
		parent.insertBefore(iframe, button.nextSibling);
	} else {
		log("Textarea not found.");
	}
}

function getToggleIframeButton(iframe) {
	let button = document.createElement("button");
	button.id = "toggle-iframe";
	button.innerText = "Toggle iFrame";

	button.addEventListener("click", function () {
		log("clicked");
		log(iframe);
		// If the iframe is not null, toggle its visibility
		if (iframe) {
			if (iframe.style.display === "none") {
				iframe.style.display = "block";
			} else {
				iframe.style.display = "none";
			}
		}
	});
	return button;
}

function handlePaste(e) {
	let clipboardData = e.clipboardData || window.clipboardData;
	if (clipboardData) {
		let items = clipboardData.items;
		for (let i = 0; i < items.length; i++) {
			if (items[i].type.indexOf("image") !== -1) {
				// We need to call preventDefault to stop the image being pasted into the textarea
				e.preventDefault();
				let file = items[i].getAsFile();
				log(file);
				// file is selected, handle it
				handleFile(file, worker);
			}
		}
	}
}

function addPasteListener() {
	// get the textarea element
	let textarea = document.getElementById(CONSTANTS.textareaId);

	// add paste event listener to textarea
	if (textarea) {
		textarea.addEventListener("paste", handlePaste);
		textarea.hasPasteListener = true;
	}
}

function addDragAndDrop() {
	let body = document.body;
	let overlay = document.createElement("div");
	overlay.id = "img-to-text-drag-and-drop-overlay";

	overlay.style.position = "fixed";
	overlay.style.top = "0";
	overlay.style.left = "0";
	overlay.style.width = "100%";
	overlay.style.height = "100%";
	overlay.style.zIndex = "1000";
	overlay.style.display = "none";
	overlay.style.backgroundColor = "rgba(70,130,180,0.3)"; // semi-transparent blue

	body.appendChild(overlay);

	// Add the drag and drop event listeners to the overlay of the page
	overlay.addEventListener("dragenter", dragEnterHandler, false);
	overlay.addEventListener("dragover", dragOverHandler, false);
	overlay.addEventListener("drop", dropHandler, false);
	overlay.addEventListener("dragleave", dragLeaveHandler, false);

	// Show the overlay when the user starts dragging a file over the body
	document.body.addEventListener(
		"dragenter",
		function (e) {
			e.preventDefault();
			overlay.style.display = "block";
			log("drag enter");
		},
		false
	);
}

function dragEnterHandler(e) {
	e.preventDefault();
	let overlay = document.querySelector("#img-to-text-drag-and-drop-overlay");
	overlay.style.display = "block"; // Show the overlay when dragging over
	log("drag enter");
}

function dragOverHandler(e) {
	e.preventDefault();
	log("drag over");
}

function dropHandler(e) {
	e.preventDefault();
	let overlay = document.querySelector("#img-to-text-drag-and-drop-overlay");
	overlay.style.display = "none"; // Hide the overlay when dragging leaves

	if (e.dataTransfer.items) {
		// Use DataTransferItemList interface to access the file(s)
		for (let i = 0; i < e.dataTransfer.items.length; i++) {
			// If dropped items aren't files, reject them
			if (e.dataTransfer.items[i].kind === "file") {
				let file = e.dataTransfer.items[i].getAsFile();

				// Check if the file is an image
				if (file.type.startsWith("image/")) {
					handleFile(file, worker);
				} else {
					log("File is not an image. Please drop an image file.");
				}
			}
		}
	} else {
		// Use DataTransfer interface to access the file(s)
		for (let i = 0; i < e.dataTransfer.files.length; i++) {
			let file = e.dataTransfer.files[i];

			// Check if the file is an image
			if (file.type.startsWith("image/")) {
				handleFile(file, worker);
			} else {
				log("File is not an image. Please drop an image file.");
			}
		}
	}
}

function dragLeaveHandler(e) {
	e.preventDefault();
	let overlay = document.querySelector("#img-to-text-drag-and-drop-overlay");
	overlay.style.display = "none"; // Hide the overlay when dragging leaves
	log("drag leave");
}

function addUploadButton() {
	let textarea = document.getElementById(CONSTANTS.textareaId);

	// create a new button element
	let btn = document.createElement("button");
	btn.id = CONSTANTS.uploadButtonID;

	// set button's icon as an image
	let btnIcon = document.createElement("img");

	if (OPTIONS.theme === "light-mode") {
		btnIcon.src = chrome.runtime.getURL(CONSTANTS.lightModeUploadButtonIcon);
	} else if (OPTIONS.theme === "dark-mode") {
		btnIcon.src = chrome.runtime.getURL(CONSTANTS.darkModeUploadButtonIcon);
	} else {
		btnIcon.src = chrome.runtime.getURL(CONSTANTS.defaultUploadButtonIcon);
	}

	btnIcon.alt = "Upload image";
	btnIcon.style.height = "24px";
	btnIcon.style.width = "24px";
	btn.appendChild(btnIcon);

	// style the button
	btn.style.backgroundColor = "transparent";
	btn.style.border = "none";
	btn.style.cursor = "pointer";
	btn.style.outline = "none";
	btn.style.padding = "5px";
	btn.style.marginRight = "10px"; // add some margin to separate from the textarea
	btn.style.zIndex = "1";
	btn.style.height = textarea.height;
	btn.style.maxHeight = "40px";

	// create a hidden file input
	let hiddenFileInputButton = document.createElement("input");
	hiddenFileInputButton.type = "file";
	hiddenFileInputButton.style.display = "none";
	hiddenFileInputButton.accept = "image/*"; // accept only image files
	hiddenFileInputButton.id = "hidden-file-input";

	// add an event listener to the button
	btn.addEventListener("click", function () {
		// trigger file input click when button is clicked
		hiddenFileInputButton.click();
	});

	// add event listener to file input
	hiddenFileInputButton.addEventListener("change", function () {
		log("file selected");
		if (this.files && this.files[0]) {
			// file is selected, handle it
			handleFile(this.files[0], worker);

			// reset the input field after file processing
			this.value = null;
		}
	});

	// check if the textarea exists and add button
	if (textarea) {
		addButtonToDOM(btn);
		addButtonToDOM(hiddenFileInputButton);
	} else {
		log("Textarea not found.");
	}
}

function addButtonToDOM(btn) {
	let textarea = document.getElementById(CONSTANTS.textareaId);

	// get the parent of the textarea
	let parent = textarea.parentNode;

	//get the textarea's parent's parent
	let parent2 = parent.parentNode;

	let container = parent2;

	container.insertBefore(btn, parent);
	// recenterButton(btn);
}

function recenterButton(btn) {
	let textarea = document.getElementById(CONSTANTS.textareaId);
	// let btn = document.getElementById(CONSTANTS.uploadButtonID);
	// get the parent of the textarea
	if (textarea && btn) {
		let parent = textarea.parentNode;
		let parent2 = parent?.parentNode;
		let parent3 = parent2?.parentNode;
		let container = parent3;
		if (container) {
			btn.style.marginTop = container.offsetHeight - textarea.parentNode.offsetHeight + "px"; //40px
			log("offset height", container.offsetHeight - textarea.parentNode.offsetHeight);
			log("Container height", container.offsetHeight);
			log("textarea height", textarea.parentNode.offsetHeight);
		}
	}
}

// adding with flexbox broke after ChatGPT updated UI to add some sort of element before the textarea
function addFlexBox() {
	// create a new div for flexbox container
	let container = document.createElement("div");
	container.style.display = "flex";
	container.style.alignItems = "center";
	container.id = CONSTANTS.flexBoxContainerId;
	return container;
}

function addButtonWithFlexBox(btn, hiddenFileInputButton) {
	let container = document.getElementById(CONSTANTS.flexBoxContainerId) || addFlexBox();
	let textarea = document.getElementById(CONSTANTS.textareaId);

	// get the parent of the textarea
	let parent = textarea.parentNode;
	let parent2 = parent.parentNode;

	// insert the flexbox container into the parent before the textarea
	parent2.insertBefore(container, parent);

	// add the button and the hidden file input to the flexbox container
	container.appendChild(btn);
	container.appendChild(hiddenFileInputButton);

	// move the textarea into the flexbox container
	container.appendChild(parent);
}

async function createWorker() {
	const worker = await Tesseract.createWorker(getSelectedLanguageCodes(), 1, {
		workerPath: chrome.runtime.getURL("scripts/tesseract.js@v5.0.4_dist_worker.min.js"),
		corePath: chrome.runtime.getURL("scripts/"),
		langPath: chrome.runtime.getURL("scripts/languages/"),
		logger: (m) => {
			log(m);
			if (m.status === "recognizing text") {
				// Update progress bar width and text to display loading status and progress
				progressBar = document.getElementById("image-to-text-progress-bar");
				if (progressBar) {
					progressBar.style.width = `${m.progress * 100}%`;
					let percentage = Math.round(m.progress * 100);
					progressBar.textContent = `${percentage}% - ${m.status}`;

					// change the color of the progress bar based on the progress
					let red = 255 - Math.round((255 * percentage) / 100); // decrease red color
					let green = Math.round((255 * percentage) / 100); // increase green color
					progressBar.style.backgroundColor = `rgb(${red}, ${green}, 0)`; // change background color

					if (m.progress === 1) {
						progressBar.textContent = "Finished"; // Update the progress text to "Finished"
						setTimeout(function () {
							// remove the progress bar after 5 seconds
							progressBar.parentElement.remove();
						}, 800);
					}
				}
			} else {
				let message = document.getElementById("loadingMessage");
				if (
					OPTIONS.showInitialLoadingMessage &&
					!message &&
					m.status == "loading tesseract core" &&
					m.progress === 0
				) {
					insertLoadingMessage("Initializing Image to Text Engine Please wait...");
				}

				updateLoadingMessage(
					m.status,
					m.progress,
					"Please wait... Grabbing language files... This could take a while."
				);

				if (m.status === "initializing api" && m.progress === 1) {
					removeLoadingMessage();
				}
			}
		},
	});
	await worker.setParameters({
		preserve_interword_spaces: OPTIONS.formatOutput ? "1" : "0",
	});
	return worker;
}

function getSelectedLanguageCodes() {
	let selectedLanguageCodes = "";
	CONSTANTS.workerLanguage.forEach((languageCode) => {
		selectedLanguageCodes += languageCode + "+";
	});
	selectedLanguageCodes = selectedLanguageCodes.slice(0, -1);
	log(selectedLanguageCodes);
	return selectedLanguageCodes;
}

async function handleFile(file, worker) {
	// log("handling the file");

	let textareaContainer = document.getElementById(CONSTANTS.textareaId).parentElement;
	log(textareaContainer);
	// Get the textarea element
	let textarea = document.getElementById("prompt-textarea");

	// check if the textarea exists
	if (!textarea) {
		log("Textarea not found.");
		return;
	}

	// get the parent of the container
	let parent = textareaContainer.parentNode;

	// create progress bar and insert it before the button
	let progressBarContainer = document.createElement("div");
	progressBarContainer.style.backgroundColor = "#f3f3f3"; // light grey
	progressBarContainer.style.borderRadius = "5px"; // rounded corners
	progressBarContainer.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)"; // some box shadow
	progressBarContainer.style.height = "25px"; // height of the progress bar
	progressBarContainer.style.marginBottom = "10px"; // space below the progress bar
	progressBarContainer.style.overflow = "hidden"; // ensures inner bar stays within bounds

	let progressBar = document.createElement("div");
	progressBar.id = "image-to-text-progress-bar";
	progressBar.style.height = "100%"; // make sure it fills up the entire container
	progressBar.style.width = "0%"; // initial width of the progress bar (0% because no progress has been made yet)
	progressBar.style.textAlign = "center"; // center the progress text
	progressBar.style.transition = "width 0.5s ease-in-out"; // smooth width transition
	progressBar.textContent = ""; // initial progress text (empty because no progress has been made yet)

	progressBarContainer.appendChild(progressBar); // add the progress bar to the container
	parent.insertBefore(progressBarContainer, textareaContainer);

	(async () => {
		// log(worker);
		let text = "";
		if (OPTIONS.formatOutput) {
			const { data } = await worker.recognize(file, { rectangle: true });
			text = calculateIndentation(data);
		} else {
			const { data } = await worker.recognize(file);
			text = data.text;
		}
		log(text);

		// Get the textarea element
		let textarea = document.getElementById(CONSTANTS.textareaId);

		// If the textarea exists, set its value to the recognized text
		if (textarea) {
			textarea.value = textarea.value + text;

			textarea.style.height = ""; // Reset the height
			textarea.style.height = textarea.scrollHeight + "px"; // Set it to match the total content height

			// Set cursor position at the end of the text
			textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
		} else {
			log("Textarea not found.");
		}
	})();
}

function calculateIndentation(data) {
	let indentedText = "";

	for (const block of data.blocks) {
		for (const paragraph of block.paragraphs) {
			for (const line of paragraph.lines) {
				// Check if line ends with a newline and if so, remove it
				let text = line.text;
				if (text.endsWith("\n")) {
					text = text.slice(0, -1);
				}
				let numChars = text.replace(/\s/g, "").length; // count number of non-space characters in the line
				let bboxWidth = line.bbox.x1 - line.bbox.x0; // calculate the width of the bounding box
				let charWidth = numChars > 0 ? bboxWidth / numChars : 0; // calculate the average character width, avoid divide by zero

				let indentation = line.bbox.x0; // x0 gives the x-coordinate of the left edge of the bounding box
				let spaces = charWidth > 0 ? Math.floor(indentation / charWidth) : 0; // calculate number of spaces for indentation, avoid divide by zero
				indentedText += " ".repeat(spaces) + text + "\n"; // add a newline after each line of text
			}
		}
	}

	return indentedText;
}

function addLanguageModal() {
	let body = document.body;

	// Create the modal
	let languageModal = document.createElement("div");
	languageModal.id = "languageModal";
	languageModal.style.display = "none"; // Initially hidden
	languageModal.style.position = "fixed"; // Stay in place
	languageModal.style.zIndex = "1"; // Sit on top
	languageModal.style.left = "0";
	languageModal.style.top = "0";
	languageModal.style.width = "100%"; // Full width
	languageModal.style.height = "100%"; // Full height
	languageModal.style.overflow = "auto"; // Enable scroll
	languageModal.style.backgroundColor = "rgb(0,0,0)"; // Black fallback
	languageModal.style.backgroundColor = "rgba(0,0,0,0.4)"; // Black with opacity
	body.appendChild(languageModal);

	// Create the modal content container
	let modalContent = document.createElement("div");
	modalContent.style.color = "#000"; // Change text color to black
	modalContent.style.backgroundColor = "#fefefe";
	modalContent.style.margin = "15% auto"; // 15% from the top and centered
	modalContent.style.padding = "20px";
	modalContent.style.border = "1px solid #888";
	modalContent.style.width = "80%"; // 80% width
	languageModal.appendChild(modalContent);

	// Create the close button
	let closeButton = document.createElement("span");
	closeButton.style.color = "#aaaaaa";
	closeButton.style.float = "right";
	closeButton.style.fontSize = "28px";
	closeButton.style.fontWeight = "bold";
	closeButton.innerHTML = "&times;";
	closeButton.style.cursor = "pointer";
	closeButton.style.marginLeft = "5px"; // Space out the close button
	closeButton.addEventListener("click", function () {
		languageModal.style.display = "none";
	});
	modalContent.appendChild(closeButton);

	// Create an information text node with a hyperlink regarding CSP policy change
	let informationText = document.createElement("p");
	informationText.innerHTML =
		"<a target='_blank' rel='noopener noreferrer' href='https://github.com/Tshetrim/Image-To-Text-OCR-extension-for-ChatGPT#important-note-due-to-csp-restrictions-and-regarding-language-support'>🙇‍♂️ Due to reasons outside my control, languages had to be reduced from 100+ to 12 most used languages. Click here to read why.</a>";
	informationText.style.color = "#0b2754";
	modalContent.appendChild(informationText);

	// Create the title
	let title = document.createElement("h2");
	title.style.color = "#000";
	title.textContent = "Select Languages";
	modalContent.appendChild(title);

	// Create the selected languages display
	let selectedLanguagesDiv = document.createElement("div");
	selectedLanguagesDiv.style.marginBottom = "10px"; // Add some space below the div
	modalContent.appendChild(selectedLanguagesDiv);

	let selectedLangLabel = document.createElement("span");
	selectedLangLabel.textContent = "Currently selected: ";
	selectedLanguagesDiv.appendChild(selectedLangLabel);

	// Display the currently selected languages
	CONSTANTS.workerLanguage.forEach(function (langCode) {
		let selectedLanguage = document.createElement("span");
		selectedLanguage.textContent = getKeyByValue(LANGUAGES, langCode);
		selectedLanguage.style.backgroundColor = "#ddd"; // Apply a grey background color
		selectedLanguage.style.padding = "2px 10px"; // Add a little padding
		selectedLanguage.style.marginRight = "5px"; // Add some space to the right of each tag
		selectedLanguage.style.borderRadius = "5px"; // Add rounded corners to the tag
		selectedLanguagesDiv.appendChild(selectedLanguage);
	});

	// Create the container for the checkboxes
	let optionsDiv = document.createElement("div");
	optionsDiv.style.width = "100%"; // Make the container take up the full width of the modal
	optionsDiv.style.height = "200px"; // Set a height for the container
	optionsDiv.style.overflowY = "scroll"; // Add a vertical scrollbar
	optionsDiv.style.border = "1px solid #888"; // Add a border around the container
	optionsDiv.style.padding = "10px"; // Add some padding for aesthetic purposes
	optionsDiv.style.marginBottom = "20px"; // Add some space below the container
	modalContent.appendChild(optionsDiv);

	// Function to get key by its value
	function getKeyByValue(object, value) {
		return Object.keys(object).find((key) => object[key] === value);
	}

	// add the search bar
	addSearchBar(modalContent, optionsDiv);
	// Loop through languages to create checkboxes
	Object.keys(LANGUAGES).forEach(function (key) {
		let checkboxWrapper = document.createElement("div");
		checkboxWrapper.style.padding = "5px";
		checkboxWrapper.style.marginBottom = "2px";
		checkboxWrapper.style.cursor = "pointer"; // Change the cursor when hovering over the div
		// checkboxWrapper.style.border = "1px solid lightblue"; // Add a light blue border

		let checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.name = key;
		checkbox.value = LANGUAGES[key];
		checkbox.id = "id_" + key;
		checkbox.style.marginRight = "10px";
		checkbox.style.display = "none"; // Hide the checkbox

		// Check if this language is preselected
		if (CONSTANTS.workerLanguage.includes(LANGUAGES[key])) {
			checkbox.checked = true;
			checkboxWrapper.style.backgroundColor = "#ccc"; // Highlight the div
		}

		let label = document.createElement("label");
		label.htmlFor = "id_" + key;
		label.appendChild(document.createTextNode(key));
		label.style.pointerEvents = "none"; // Prevent label from interfering with pointer events

		checkboxWrapper.appendChild(checkbox);
		checkboxWrapper.appendChild(label);

		checkboxWrapper.addEventListener("click", function () {
			checkbox.checked = !checkbox.checked;
			checkboxWrapper.style.backgroundColor = checkbox.checked ? "#ccc" : "";

			// Update the selected languages display
			if (checkbox.checked) {
				let selectedLanguage = document.createElement("span");
				selectedLanguage.textContent = key;
				selectedLanguagesDiv.appendChild(selectedLanguage);
				selectedLanguage.style.backgroundColor = "#ddd"; // Apply a grey background color
				selectedLanguage.style.padding = "2px 10px"; // Add a little padding
				selectedLanguage.style.marginRight = "5px"; // Add some space to the right of each tag
				selectedLanguage.style.borderRadius = "5px"; // Add rounded corners to the tag
			} else {
				let selectedLanguages = Array.from(selectedLanguagesDiv.children);
				let langToRemove = selectedLanguages.find((span) => span.textContent.includes(key));
				if (langToRemove) selectedLanguagesDiv.removeChild(langToRemove);
			}
		});

		optionsDiv.appendChild(checkboxWrapper);
	});

	// Create the save button
	let saveButton = document.createElement("button");

	saveButton.id = "languageSaveButton";
	saveButton.textContent = "Save";
	saveButton.style.color = "#fff"; // Change the button text color to white
	saveButton.style.backgroundColor = "#000"; // Change the button background color to black
	saveButton.style.border = "none"; // Remove the default button border
	saveButton.style.cursor = "pointer"; // Change the cursor when hovering over the button
	saveButton.style.padding = "10px 20px"; // Add some padding to the button
	saveButton.style.textAlign = "center"; // Center the button text
	saveButton.style.textDecoration = "none"; // Remove the default button text decoration
	saveButton.style.display = "inline-block"; // Make the button inline-block to apply the above styles
	saveButton.style.fontSize = "16px"; // Increase the button text size
	saveButton.style.margin = "4px 2px"; // Add some margin to the button
	saveButton.style.transitionDuration = "0.4s"; // Add a transition effect when hovering over the button
	saveButton.textContent = "Save";
	modalContent.appendChild(saveButton);

	// Save button hover effect
	saveButton.onmouseover = function () {
		saveButton.style.backgroundColor = "#fff";
		saveButton.style.color = "#000";
	};
	saveButton.onmouseout = function () {
		saveButton.style.backgroundColor = "#000";
		saveButton.style.color = "#fff";
	};

	// When the user clicks anywhere outside of the modal, close it
	window.addEventListener("click", function (event) {
		if (event.target == languageModal) {
			languageModal.style.display = "none";
		}
	});

	// Close button event
	closeButton.addEventListener("click", function () {
		languageModal.style.display = "none";
	});

	// Save button click event to store the selected languages
	saveButton.addEventListener("click", async function () {
		let selectedCheckboxes = optionsDiv.querySelectorAll("input[type='checkbox']:checked");
		selectedLanguages = Array.from(selectedCheckboxes, (checkbox) => checkbox.value);
		languageModal.style.display = "none";

		CONSTANTS.workerLanguage = selectedLanguages;
		setStorageData({ workerLanguage: selectedLanguages });
		log(selectedLanguages);

		insertLoadingMessage("Reinitializing Engine Please wait...");
		await worker.reinitialize(getSelectedLanguageCodes(), 1);
		removeLoadingMessage();
		log("worker after new languages", worker);
	});

	// Create a text node
	let disclaimerText = document.createElement("p");
	disclaimerText.textContent = "⚠ Multiple languages can be picked at once though accuracy may decrease.";
	disclaimerText.style.display = "inline"; // Display text in the same line
	disclaimerText.style.marginLeft = "10px"; // Add some space to the left of the text
	modalContent.appendChild(disclaimerText);

	return [languageModal, modalContent, closeButton];
}

function addSearchBar(modalContent, optionsDiv) {
	// Create the search bar
	let searchBar = document.createElement("input");
	searchBar.type = "text";
	searchBar.id = "searchBar";
	searchBar.placeholder = "Search languages...";
	searchBar.style.marginBottom = "10px";
	searchBar.style.width = "100%";

	// Add an input event listener to filter the language checkboxes
	searchBar.addEventListener("input", function () {
		filterLanguages(optionsDiv, searchBar.value);
	});

	// Add the search bar to the modal content
	modalContent.insertBefore(searchBar, optionsDiv);
}

function filterLanguages(optionsDiv, query) {
	// Get all checkbox wrappers
	let checkboxWrappers = optionsDiv.children;

	// Loop through each checkbox wrapper
	for (let i = 0; i < checkboxWrappers.length; i++) {
		// Get the label text (i.e., the language name)
		let languageName = checkboxWrappers[i].children[1].innerText;

		// If the query is not in the language name, hide the checkbox wrapper, else show it
		if (!languageName.toLowerCase().includes(query.toLowerCase())) {
			checkboxWrappers[i].style.display = "none";
		} else {
			checkboxWrappers[i].style.display = "";
		}
	}
}

// Function to create and inject the language selection button and modal
function addLanguageSelectButton() {
	let textarea = document.getElementById(CONSTANTS.textareaId);

	// Create the button
	let languageButton = document.createElement("button");
	languageButton.id = "languageButton";

	// set button's icon as an image
	let btnIcon = document.createElement("img");
	btnIcon.src = chrome.runtime.getURL(CONSTANTS.languageButtonIcon);
	btnIcon.alt = "Upload image";
	btnIcon.style.height = "24px";
	btnIcon.style.width = "24px";
	languageButton.appendChild(btnIcon);

	// style the button
	languageButton.style.backgroundColor = "transparent";
	languageButton.style.border = "none";
	languageButton.style.cursor = "pointer";
	languageButton.style.outline = "none";
	languageButton.style.padding = "5px";
	languageButton.style.marginRight = "10px"; // add some margin to separate from the textarea
	languageButton.style.zIndex = "1";
	languageButton.style.height = textarea.height;
	languageButton.style.maxHeight = "40px";

	const [languageModal, modalContent, closeButton] = addLanguageModal();

	// Button click event to open modal
	languageButton.addEventListener("click", function () {
		languageModal.style.display = "block";
	});

	// check if the textarea exists and add button
	if (textarea) {
		addButtonToDOM(languageButton);
	} else {
		log("Textarea not found.");
	}
}

function addLanguageSelectButtonToDOM(btn) {
	let textarea = document.getElementById(CONSTANTS.textareaId);

	// get the parent of the textarea
	let parent = textarea.parentNode;
	let parent2 = parent.parentNode;
	let parent3 = parent2.parentNode;

	let container = parent3;
	container.insertBefore(btn, parent2);
	recenterButton(btn);
}

function insertLoadingMessage(text) {
	// Create the message element
	let message = document.createElement("div");
	message.id = "loadingMessage";
	message.style.position = "fixed";
	message.style.top = "50%";
	message.style.left = "50%";
	message.style.transform = "translate(-50%, -50%)";
	message.style.padding = "20px";
	message.style.backgroundColor = "#f8f9fa"; // Neutral gray
	message.style.color = "#212529"; // Dark gray
	message.style.borderRadius = "10px";
	message.style.zIndex = "10000";
	message.style.width = "300px";
	message.style.textAlign = "center";
	message.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.1)";
	message.style.border = "1px solid #e3e6f0"; // Border color

	// Create the close button
	let closeButton = document.createElement("button");
	closeButton.textContent = "X";
	closeButton.style.position = "absolute";
	closeButton.style.top = "10px";
	closeButton.style.right = "10px";
	closeButton.style.border = "none";
	closeButton.style.background = "transparent";
	closeButton.style.fontSize = "20px";
	closeButton.style.cursor = "pointer";
	closeButton.addEventListener("click", removeLoadingMessage);

	// Create the header node
	let headerNode = document.createElement("h2");
	headerNode.id = "loadingMessageHeader";
	headerNode.textContent = "Image to Text Extension";
	headerNode.style.marginBottom = "10px";

	// Create the pretext node
	let preTextNode = document.createElement("div");
	preTextNode.id = "loadingMessagePreText";

	// Create the text node
	let textNode = document.createElement("div");
	textNode.id = "loadingMessageText";
	textNode.textContent = text;
	textNode.style.marginTop = "10px";

	// Create the progress element
	let progress = document.createElement("div");
	progress.id = "loadingMessageProgress";
	progress.style.marginTop = "10px";
	progress.style.fontWeight = "bold"; // Bold progress text

	// Create the loading spinner
	let loader = document.createElement("div");
	loader.style.border = "16px solid #f3f3f3";
	loader.style.borderTop = "16px solid #3498db";
	loader.style.borderRadius = "50%";
	loader.style.width = "60px";
	loader.style.height = "60px";
	loader.style.position = "relative";
	loader.style.margin = "0 auto"; // Center the spinner

	// Initialize the degree
	let degree = 0;

	// Use setInterval function for rotation
	let spinner = setInterval(function () {
		loader.style.transform = `rotate(${degree}deg)`;
		degree = (degree + 1) % 360; // Increase the degree
	}, 10); // Update every 10 milliseconds

	message.appendChild(loader); // Add loader spinner to message

	// Create the info node
	let infoNode = document.createElement("div");
	infoNode.id = "loadingMessageInfo";
	infoNode.textContent = "Note: To permanently disable this loading screen, check the extension options.";
	infoNode.style.marginTop = "20px";
	infoNode.style.fontSize = "12px"; // Smaller font for info message
	infoNode.style.color = "#6c757d"; // Gray color for info message

	// Append the close button, text node and progress element to the message
	message.appendChild(closeButton);
	message.appendChild(headerNode);
	message.appendChild(preTextNode);
	message.appendChild(textNode);
	message.appendChild(progress);
	message.appendChild(loader);
	message.appendChild(infoNode);

	// Add the message to the body
	document.body.appendChild(message);
}

function updateLoadingMessage(status, progress, pretext) {
	let preTextNode = document.getElementById("loadingMessagePreText");
	let textNode = document.getElementById("loadingMessageText");
	let progressNode = document.getElementById("loadingMessageProgress");

	if (preTextNode && textNode && progressNode) {
		if (pretext) preTextNode.textContent = pretext;
		textNode.textContent = status;
		progressNode.textContent = `Progress: ${Math.round(progress * 100)}%`;
	}
}

function removeLoadingMessage() {
	let message = document.getElementById("loadingMessage");
	if (message) {
		message.parentNode.removeChild(message);
	}
}
