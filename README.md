# Image-To-Text-OCR-extension-for-ChatGPT
Currently out now on the Chrome Extension Store and Firefox! 

[![Chrome Download Badge](https://github-production-user-asset-6210df.s3.amazonaws.com/49722313/263314841-d42bdf5a-5c75-4a84-80d3-344a97b36978.png)](https://chrome.google.com/webstore/detail/image-to-text-for-chatgpt/kihikabndlcbnpbgjapkhlonoddholga)
[![Firefox Download Badge](https://extensionworkshop.com/assets/img/documentation/publish/get-the-addon-178x60px.dad84b42.png)](https://addons.mozilla.org/en-US/firefox/addon/image-to-text-chatgpt/)

Chrome Link: https://chrome.google.com/webstore/detail/image-to-text-for-chatgpt/kihikabndlcbnpbgjapkhlonoddholga?hl=en&authuser=0

Firefox Link: https://addons.mozilla.org/en-US/firefox/addon/image-to-text-chatgpt/


# Demo-Video:
[https://www.youtube.com/watch?v=r524G5Vjrz4](https://www.youtube.com/watch?v=KzUO-dU4-n0)

# Tutorial-Video: 
https://www.youtube.com/watch?v=zob0us4bPc8

# Discord:
https://discord.gg/8hnkBhwTJ5

# Notes Regarding Code: 
- The content.js file is the content script that has all of the actual logic of the extension in terms of loading and initializing the tesseract worker, injecting the buttons and other UI elements into the ChatGPT page, etc. 
- The popup.js file connects to the popup.html for configuring the options and saving it to the chrome local storage for the content.js to later retrieve. 
- The tesseract.min.js file is from Tesseract.js and contains all the code related to the Tesseract engine itself. 
- As noted in their API, the [Worker.loadLanguage(langs, jobId): Promise
]([url](https://github.com/naptha/tesseract.js/blob/master/docs/api.md#worker-load-language)) method fetches the trainedData files from their CDNs if its not already in cache and saves it into Chrome's IndexedDB storage. This makes it convienient for users loading languages, but it also means featching and downloading it can take a while for some languages. 
- The content.js and tesseract.min.js file are specified as content scripts in the manifest v3 file and get auto injected on page refesh by chrome. 

# Product-Description
Update: Now supports 100+ Languages! 
Full Tutorial Video: https://www.youtube.com/watch?v=zob0us4bPc8

This extension was born out of a need for a fast, quick and intuitive way to get text from images into the textbox for ChatGPT. This extension accomplishes this with a great degree of accuracy and average speeds of ~5 seconds or less. 

Now, you don't have to switch between multiple tools just for Optical Character Recognition (OCR). With this extension, you can easily upload an image file or drag and drop it for conversion into text, which will automatically populate your ChatGPT textbox. 

Additionally, if you have a screenshot in your clipboard, you can directly paste (Ctrl+V) it into the textbox. Quick, hassle-free, and highly efficient - this extension is built with a focus on speed, user-friendliness, and most importantly, privacy.

For the Tech Savvy:
Powered by Tesseract.js, this extension runs OCR directly in your browser, keeping your data secure as none of your information leaves your device. All the OCR work is performed locally, ensuring maximum privacy.

But we understand that sometimes, you may need an extra level of precision or need to retain the original format of the image, especially when dealing with content like Python code. For such instances, we provide an option to enable an embedded third-party solution created by Pieces.app. Check out their service at: https://www.codefromscreenshot.com/

All source code for complete transparency can be found on GitHub at: 
https://github.com/Tshetrim/Image-To-Text-OCR-extension-for-ChatGPT

Join the Discord to share feedback, errors, or just chat:
https://discord.gg/8hnkBhwTJ5

Disclaimer: Please note, if you opt to use the third-party embedded option, your privacy and data handling will be subject to their policy as this extension is not affiliated with them.

Invest in your productivity today with our Chrome GPT extension, and experience the future of text transcription!

