My computer tends to run low on disk space over time. 

First things first, check what kind of system I have. Am I on a Mac, PC?

Most of the low hanging fruit to delete files to free space probably sit within my HOME directory. I want you to create a beautiful web application that will allow me to visually understand how large my Home folder is in relative to disk space in the entire system. 

I want to be able to drill down to things and get insights on how big files and folders are with risk analysis in deleting these files. 

I have an LLM listening at http://192.168.1.236:8000/v1 called Qwen3.8-27B which you can use to also do some creative/private analysis. Please: Trust the LLM. It is a thinker, so don't lean on token limit for the LLM. If you must, just allocate a 32K max token limit. Reasoning tokens are emitted before content, so we must allow for headroom.

For design, you have web search and scrape tools to look for the latest web design trends in 2026. If you need easy inspiration you can git clone the following repo for a variety of starter templates/design prototypes: https://github.com/MiaAI-Lab/Claude-Opus-5.5-100-HTML-Files. 

This repo has 100 HTML files with their thumbnails for preview. I highly encourage you clone the repo and look through the assets. Research as much as possible to do the right things. Web search and scrape tools are your friends. 

For tools related to testing, you may install headless browser if necessary to take screenshots and analyze. You may also install Playwright to create tests to ensure functionality. 

For backend, Node JS or Python works fine. If you choose Node JS, we already have node installed. If you choose Python, ensure you work within a virtual directory if you need to install dependencies. Your web server port should be something not taken like: 4567.

You may also create a proper project structure if it helps. Test often for stable software. I am only interested in Home directory analysis.

WOW ME! WOW others. Do not stop until you achieve an amazing user experience and UI. Do your best and I allow you to be creative. Text should be written to avoid LLM slop-like language/Claudisms/Colorful verbs. UI design should avoid cues that signal AI Slop such as excessive use of loud glassmorphism, gradients and dark themes. Make it look very professional and elegant but yet color for data visualization. 

Warning: I will let you work autonomously, so do not do silly things like spin up many threads ending up with deadlock, recursively delete files and folders in composed commands (delete one command a time), etc. Be careful.

CRITICAL: DO NOT KILL YOUR OWN PROCESS TREE! Do not chain commands together that result in killing the root process in which live in.

When you are done, point me to the URL which I can view the final product.