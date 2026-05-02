# 🚀 Deployment Guide - AI Voice Browser Automation

## Overview
This project has three deployable components:
1. **Backend** → Hugging Face Spaces (Docker)
2. **Frontend** → Vercel (Static)
3. **Extension** → Chrome Web Store (Manual)

---

## 1️⃣ Deploy Backend to Hugging Face Spaces

### Prerequisites
- Hugging Face account: https://huggingface.co/join
- OpenRouter API key: https://openrouter.ai/keys

### Steps:
1. Go to https://huggingface.co/spaces
2. Click "Create new Space"
3. Choose **Docker** as the SDK
4. Set visibility to **Public** (or Private if preferred)
5. Upload these files from `/home/user/app/backend/`:
   - `Dockerfile`
   - `README.md` (contains Hugging Face config)
   - `server.js`
   - `package.json`
   - `bun.lockb` (if using Bun) or `package-lock.json`

6. After creation, go to Settings → **Variables and Secrets**
7. Add secret:
   - Name: `OPENROUTER_API_KEY`
   - Value: `sk-or-v1-...` (your actual key)

8. Wait for build to complete (~2-3 minutes)

9. Your WebSocket URL will be:
   ```
   wss://<your-space-name>-<your-username>.hf.space
   ```

---

## 2️⃣ Deploy Frontend to Vercel

### Steps:
1. Push code to GitHub/GitLab/Bitbucket
2. Go to https://vercel.com/new
3. Import your repository
4. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `bun run build`
   - **Output Directory**: `dist`

5. Add Environment Variable:
   - Name: `VITE_BACKEND_WS_URL`
   - Value: `wss://<your-space-name>-<your-username>.hf.space`

6. Click **Deploy**

7. Your frontend will be at: `https://your-project.vercel.app`

---

## 3️⃣ Load Chrome Extension

### Local Development:
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → Select `/home/user/app/extension/` folder

### Configure Extension:
1. Click the extension icon
2. Enter your backend URL: `wss://<your-space-name>-<your-username>.hf.space`
3. Click "Connect to Backend"

### Chrome Web Store (Optional):
1. Zip the `extension/` folder
2. Go to https://chrome.google.com/webstore/devconsole/
3. Pay $5 developer fee
4. Upload zip and publish

---

## 🔗 Final URLs

After deployment, you'll have:
- **Frontend**: `https://your-project.vercel.app`
- **Backend**: `wss://your-space.hf.space`
- **Extension**: Loaded in Chrome

---

## 🧪 Testing

1. Open the frontend dashboard
2. Load the Chrome extension
3. Connect extension to backend
4. Say: *"Open YouTube"*
5. Watch the magic happen! ✨

---

## 🚨 Important Notes

### WebSocket Limitations:
- **Vercel**: Does NOT support WebSocket connections
- **Hugging Face Spaces**: Supports WebSocket via Docker SDK
- **Alternative backends**: Railway, Render, Fly.io also work

### CORS Configuration:
The backend allows all origins for development. For production, update the CORS config in `server.js`:
```javascript
app.use(cors({
  origin: ['https://your-project.vercel.app'],
  credentials: true
}));
```

### Environment Variables Recap:

| Service | Variable | Value |
|---------|-----------|-------|
| HF Spaces | `OPENROUTER_API_KEY` | `sk-or-v1-...` |
| Vercel | `VITE_BACKEND_WS_URL` | `wss://...hf.space` |
| Extension | (manual input) | `wss://...hf.space` |

---

## 📝 Quick Command Reference

```bash
# Local development
cd /home/user/app
bun run dev  # Starts both frontend + backend

# Build frontend only
cd frontend && bun run build

# Test backend locally
cd backend && bun server.js

# Deploy to Vercel CLI
vercel deploy

# Docker build test (if docker available)
cd backend && docker build -t ai-voice-backend .
```

---

**Need help?** Check the main `README.md` for more details!
