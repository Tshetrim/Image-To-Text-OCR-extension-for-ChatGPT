// Get references to the form elements
const imageFileInput = document.getElementById("image-file");
const resultTextarea = document.getElementById("result");
const submitButton = document.getElementById("submit-button");

// Add event listener for the file input
imageFileInput.addEventListener("change", (event) => {
	// Get the selected file
	const selectedFile = event.target.files[0];

	// Check that a file was selected
	if (selectedFile) {
		// Update the textarea with the file name
		resultTextarea.value = `Selected file: ${selectedFile.name}`;
	} else {
		// Clear the textarea if no file was selected
		resultTextarea.value = "";
	}
});

// Add event listener for the submit button
submitButton.addEventListener("click", () => {
	// Check that a file was selected
	if (imageFileInput.files.length > 0) {
		// Get the selected file
		const selectedFile = imageFileInput.files[0];

		// Use Tesseract.js to process the selected image and extract the text
		doOCR(selectedFile, resultTextarea);
	} else {
		// Show error message if no file was selected
		resultTextarea.value = "Please select an image file.";
	}
});

const doOCR = async (image, result) => {
	const { createWorker } = Tesseract;
	const worker = createWorker({
		workerPath: chrome.runtime.getURL("js/worker.min.js"),
		langPath: chrome.runtime.getURL("traineddata"),
		corePath: chrome.runtime.getURL("js/tesseract-core.wasm.js"),
	});

	await worker.load();
	await worker.loadLanguage("eng");
	await worker.initialize("eng");
	const {
		data: { text },
	} = await worker.recognize(image);
	console.log(text);
	result.innerHTML = `<p>OCR Result:</p><p>${text}</p>`;
	await worker.terminate();
};
