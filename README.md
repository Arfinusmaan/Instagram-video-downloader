# OmniStream Downloader

## Run on this PC

Install Node.js, then run `npm install` once. Start the backend and frontend in separate PowerShell windows:

```powershell
npm run server
```

```powershell
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173/`.

The backend needs yt-dlp and FFmpeg. This workspace can use `.tools/yt-dlp.exe`; that local executable is intentionally excluded from source control. On another machine, install yt-dlp and either add it to `PATH` or set `YT_DLP_PATH` to its executable before starting the backend.

## Try it on a phone on the same Wi-Fi

Run the backend with `npm run server` and the frontend with:

```powershell
npm run dev:lan
```

Open `http://<PC-LAN-IP>:5173/` on the phone, replacing `<PC-LAN-IP>` with the computer's local IPv4 address. The phone and computer must be on the same network. The Vite development server proxies `/api` requests to the backend on the computer, so only port 5173 needs to be reachable from the phone. Set `VITE_API_BASE_URL` only if the API is hosted at a different address.

## Deployment status

This app is suitable for local use and same-network phone testing. It is not ready to expose as a public service: the API accepts arbitrary URLs, allows cross-origin requests from any site, and has no authentication, rate or concurrency limits, or download timeouts. Add those protections and configure HTTPS and an explicit allowed web origin before public deployment. Install yt-dlp and FFmpeg on the deployment host; the local Windows executable is not portable to Linux hosting.
