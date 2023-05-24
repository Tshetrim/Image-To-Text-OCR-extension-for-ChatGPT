// let worker = await createWorker();
// console.log("worker created", worker);
// window.addEventListener('message', (event) => {
//     if (event.source != window) return;
//     if (event.data.type && (event.data.type == 'START_TESSERACT')) {
//         worker
//             .recognize(event.data.imageUrl)
//             .progress((p) => {
//                 window.postMessage({ type: 'OCR_PROGRESS', progress: p }, '*');
//             })
//             .then((result) => {
//                 window.postMessage({ type: 'OCR_RESULT', result: result }, '*');
//             });
//     }
// }, false);
