window.addEventListener(
    "message",
    function (event) {
        // We only accept messages from ourselves
        if (event.source != window) return;
        if (event.data.type && event.data.type == "OCR_PROGRESS") {
            console.log("OCR progress:", event.data.progress);
        }
        if (event.data.type && event.data.type == "OCR_RESULT") {
            console.log("OCR result:", event.data.result);
        }
    },
    false
);

// Post a message to the webpage to start OCR (replace 'image.png' with the actual image data)
window.postMessage({ type: "START_TESSERACT", imageUrl: "image.png" }, "*");
