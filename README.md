# QuickLink Scraper Extension

A lightweight developer utility that extracts all page links in one click. Built for speed, simplicity, and privacy—no tracking, no bloat.

---

## Features

- **One-Click Extraction** — Instantly pull every `http/https` link from the active tab
- **Clean Results Panel** — Copy all links to clipboard with a single button
- **Usage Counter** — Track your free extractions at a glance
- **Premium Upgrade** — Unlock unlimited extractions via Lemon Squeezy

---

## Installation (Chrome Developer Mode)

1. **Download** the extension ZIP file from this repository
2. **Unzip** the folder to a permanent location on your computer
3. **Open** `chrome://extensions/` in your browser
4. **Enable** "Developer mode" (top-right toggle)
5. **Click** "Load unpacked" and select the unzipped folder

> The extension will appear in your toolbar immediately—no restart required.

---

## Usage Limits

| Tier | Extractions | Cost |
|------|-------------|------|
| **Free** | 5 total uses | Free forever |
| **Premium** | Unlimited | One-time purchase |

After 5 free extractions, the extension displays a sleek **Premium Lock Screen** with two options:

- **Get Premium Activation Key** — Opens the Lemon Squeezy checkout page
- **Enter Premium Key** — Activate a license key instantly

---

## Premium Activation

1. Click **"Get Premium Activation Key"** on the lock screen
2. Complete checkout on Lemon Squeezy
3. Receive your license key via email
4. Paste the key into **"Enter Premium Key"** and click **Activate**

Your Premium status is stored locally and persists across browser sessions.

---

## Permissions

- `storage` — Save usage count and Premium status locally
- `activeTab` — Access the current tab's DOM for link extraction
- `scripting` — Inject the extraction script into the active page

No external network requests are made except when opening the Lemon Squeezy checkout page.

---

## Privacy

- Zero analytics, zero tracking, zero external data collection
- All data (usage count, Premium status) stays in your browser's `chrome.storage.local`
- License verification happens entirely client-side

---

## License

MIT License — free to use, modify, and distribute.