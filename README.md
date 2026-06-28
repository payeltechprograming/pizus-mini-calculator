# Pizus Mini Calculator

Pizus Mini Calculator is a mobile-first, installable PWA built with HTML5, CSS3, and vanilla JavaScript. It includes basic and scientific calculator modes, memory tools, unlimited local history, search, copy and paste, keyboard support, dark/light themes, and offline support.

## Files

```text
/
├── index.html
├── style.css
├── script.js
├── manifest.json
├── service-worker.js
├── README.md
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    └── favicon.png
```

## Run Locally

Because this app uses a service worker, run it from a local server instead of opening the HTML file directly.

```bash
python3 -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## GitHub Pages Deployment

1. Create a GitHub repository and push these files to the repository root.
2. Open the repository on GitHub.
3. Go to **Settings**.
4. Open **Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select the `main` branch and `/root`.
7. Click **Save**.
8. After GitHub finishes deployment, open the published Pages URL.

## PWA Installation

On Android Chrome or desktop Chrome/Edge, open the deployed site and choose **Install app** from the browser menu or address bar. The calculator works offline after the first successful load.

## Features

- Addition, subtraction, multiplication, division, percentage, decimal, clear, delete, plus/minus, and brackets.
- Scientific functions: square, power, square root, cube root, sin, cos, tan, log, ln, pi, Euler's number, and factorial.
- Memory controls: MC, MR, M+, M-, and MS.
- Unlimited history saved with LocalStorage.
- Search and delete history.
- Dark, light, and system theme modes.
- Copy result and paste number.
- Keyboard support.
- Offline PWA support with app manifest and service worker.
