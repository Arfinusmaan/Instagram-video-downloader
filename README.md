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

### Google Cloud Run backend (Firebase/Vercel frontend)

Firebase Hosting or Vercel can host the static frontend. The downloader backend needs a normal Node container because it runs yt-dlp and FFmpeg. Firebase Cloud Functions can allocate more memory, but it needs the Firebase Blaze plan (a Google Cloud Billing account); this project’s in-memory job registry and temporary files are a better match for one Cloud Run instance.

The Cloud Run deployment files in this repository use a 4 GiB RAM instance, a 5 GiB temporary disk, one instance, one request at a time, and continuous CPU allocation while active. The disk volume currently uses Cloud Run's Preview ephemeral-disk feature. Cloud Run's free compute quota is usage-limited; billing must be enabled, and video egress/storage can still be charged. Set billing budgets before deployment.

1. Install and authenticate the Google Cloud CLI, create a Google Cloud project, and enable billing.
2. From PowerShell, run `./deploy-cloud-run.ps1 -ProjectId YOUR_PROJECT_ID -FrontendOrigin https://YOUR_SITE.vercel.app`.
3. Copy the printed Cloud Run URL into the frontend host as `VITE_API_BASE_URL`, then rebuild/redeploy the frontend.

The API currently accepts unauthenticated requests. The configured allowed origin is a browser CORS rule, not authentication, and does not stop scripts or direct HTTP clients from using the service. Do not treat this as a public production deployment until API authentication and request-rate limits are added. Keep the Cloud Run maximum instance count at one while download-job state remains in memory.
