const constants = {
	scriptId: "image-to-text-content-script",
	workerLanguage: "eng",
	textareaId: "prompt-textarea",
	uploadButtonID: "upload-button-image-to-text-extension",
	uploadButtonBGColor: "#343640",
  };

// create an observer instance
let observer = new MutationObserver(function (mutations) {
	// mutations is an array of MutationRecords
	// we'll just check if it has any items
	if (mutations.length) {
		if (!document.getElementById(constants.uploadButtonID)) {
			// The button is not found, initialize again
			initialize();
		}
	}
});

// configuration of the observer
let config = {
	childList: true, // track direct child addition or removal
	subtree: true, // also look for changes in the descendants
};

// pass in the target node (body in this case), as well as the observer options
observer.observe(document.body, config);

let initializingPromise = null;
let worker = null;
async function initialize() {
	if (initializingPromise) {
		// If initialization is already in progress, return the promise
		return initializingPromise;
	}

	initializingPromise = new Promise(async (resolve, reject) => {
		if (document.getElementById(constants.scriptId)) {
			// console.log("Already loaded script");
			try {
				if (typeof worker === "undefined" || worker === null) {
					// console.log("Worker is undefined or null");
					worker = await createWorker();
				}
				addUploadButton();
				addPasteListener();
				resolve();
			} catch (error) {
				console.error("Error initializing worker: ", error);
				reject(error);
			}
		} else {
			const script = document.createElement("script");
			script.id = constants.scriptId;
			script.src = chrome.runtime.getURL("scripts/tesseract.min.js");
			(document.head || document.documentElement).appendChild(script);

			script.onload = async function () {
				// console.log("Loaded script");
				// console.log(script.src);
				try {
					worker = await createWorker();
					addUploadButton();
					addPasteListener();
					resolve();
				} catch (error) {
					console.error("Error initializing worker: ", error);
					reject(error);
				}
			};
		}
	}).finally(() => {
		// console.log("finished init");
		initializingPromise = null;
	});
	return initializingPromise;
}


function addCodeIframe() {
	// get the textarea element
	let textarea = document.getElementById(constants.textareaId);

	// check if the textarea exists
	if (textarea) {
		// get the parent of the textarea
		let parent = textarea.parentNode;

		// create the iframe element
		let iframe = document.createElement("iframe");
		iframe.width = "100%";
		iframe.height = "500px";
		iframe.src = "https://code-from-screenshot-lmuw6mcn3q-uc.a.run.app/";
		iframe.frameborder = "0";
		iframe.allow = "clipboard-read; clipboard-write";

		// insert the iframe before the textarea
		parent.insertBefore(iframe, textarea);
	} else {
		// console.log("Textarea not found.");
	}
}

function addPasteListener() {
	// get the textarea element
	let textarea = document.getElementById(constants.textareaId);

	// add paste event listener to textarea
	if (textarea) {
		textarea.addEventListener("paste", function (e) {
			let clipboardData = e.clipboardData || window.clipboardData;
			if (clipboardData) {
				let items = clipboardData.items;
				for (let i = 0; i < items.length; i++) {
					if (items[i].type.indexOf("image") !== -1) {
						// We need to call preventDefault to stop the image being pasted into the textarea
						e.preventDefault();
						let file = items[i].getAsFile();
						// console.log(file);
						// file is selected, handle it
						handleFile(file, worker);
					}
				}
			}
		});
	}
}

function addUploadButton() {
	// create a new div for flexbox container
	let container = document.createElement("div");
	container.style.display = "flex";
	container.style.alignItems = "center";
	container.id = "flexbox-container-image-to-text-extension";

	// create a new button element
	let btn = document.createElement("button");
	btn.id = constants.uploadButtonID;

	// set button's icon as an image
	let btnIcon = document.createElement("img");
	btnIcon.src = "chrome-extension://ifdljnflelndiehjmknfkeimhcfoadeo/images/upload-icon-light.png"; // change to your image path
	btnIcon.alt = "Upload image";
	btnIcon.style.height = "24px";
	btnIcon.style.width = "24px";
	btn.appendChild(btnIcon);

	// style the button
	btn.style.backgroundColor = constants.uploadButtonBGColor; // dark blue background
	btn.style.border = "none";
	btn.style.cursor = "pointer";
	btn.style.outline = "none";
	btn.style.padding = "5px";
	btn.style.marginRight = "10px"; // add some margin to separate from the textarea
	btn.style.zIndex = "1";

	// create a hidden file input
	let fileInput = document.createElement("input");
	fileInput.type = "file";
	fileInput.style.display = "none";
	fileInput.accept = "image/*"; // accept only image files
	fileInput.id = "hidden-file-input";

	// add an event listener to the button
	btn.addEventListener("click", function () {
		// trigger file input click when button is clicked
		fileInput.click();
	});

	// add event listener to file input
	fileInput.addEventListener("change", function () {
		if (this.files && this.files[0]) {
			// file is selected, handle it
			handleFile(this.files[0], worker);
		}
	});

	// get the textarea element
	let textarea = document.getElementById(constants.textareaId);

	// check if the textarea exists
	if (textarea) {
		// get the parent of the textarea
		let parent = textarea.parentNode;
		let parent2 = parent.parentNode;

		// insert the flexbox container into the parent before the textarea
		parent2.insertBefore(container, parent);

		// add the button and the hidden file input to the flexbox container
		container.appendChild(btn);
		container.appendChild(fileInput);

		// move the textarea into the flexbox container
		container.appendChild(parent);
	} else {
		// console.log("Textarea not found.");
	}
}

async function createWorker() {
	const worker = await Tesseract.createWorker({
		logger: (m) => {
			console.log(m);
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
			}
		},
	});
	await worker.loadLanguage(constants.workerLanguage);
	await worker.initialize(constants.workerLanguage);
	await worker.setParameters({
		preserve_interword_spaces: "1",
	});
	// console.log(worker);
	return worker;
}

async function handleFile(file, worker) {
	// console.log("handling the file");

	let textareaContainer = document.getElementById("flexbox-container-image-to-text-extension");

	// Get the textarea element
	let textarea = document.getElementById("prompt-textarea");

	// check if the textarea exists
	if (!textarea) {
		// console.log("Textarea not found.");
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
		console.log(worker);
		const { data } = await worker.recognize(file, { rectangle: true });
		const text = calculateIndentation(data);
		// console.log(data);

		// Get the textarea element
		let textarea = document.getElementById(constants.textareaId);

		// If the textarea exists, set its value to the recognized text
		if (textarea) {
			textarea.value = textarea.value + text;

			textarea.style.height = ""; // Reset the height
			textarea.style.height = textarea.scrollHeight + "px"; // Set it to match the total content height

			// Set cursor position at the end of the text
			textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
		} else {
			// console.log("Textarea not found.");
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
