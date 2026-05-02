# 🎙️ AI Voice Browser Automation

A full-stack AI-powered browser automation app with voice control. Control your browser using natural language commands powered by OpenRouter AI.

## ✨ Features

- **Voice Input**: Use Web Speech API for speech-to-text conversion
- **AI Command Parser**: Converts voice commands to structured JSON using OpenRouter API
- **Browser Automation**: Chrome Extension executes actions in your browser
- **Supported Actions**:
  - `open_url` - Open any URL
  - `search_google` - Search on Google
  - `click_element` - Click elements by text
  - `scroll_up` / `scroll_down` - Scroll the page
  - `download_image` - Download images
  - `switch_tab` - Switch browser tabs
  - `fill_input` - Fill input fields
- **Gen-Z Style UI**: Beautiful gradient UI with animations
- **Auto Mode**: Continuous listening mode
- **Command History**: Track all your voice commands
- **Command Suggestions**: Get inspired with example commands

## 🏗️ Architecture

```
┌─────────────────┐     WebSocket     ┌──────────────────┐
│   React Frontend │ ←────────────→   │  Node.js Backend │
│   (Port 5173)   │                  │  (Port 3001)     │
└─────────────────┘                  └──────────────────┘
         ↑                                      ↑
         │                                      │
         │ Web Speech API                        │ OpenRouter API
         │                                      │
         └──────────────────────────────────────┘
                           ↓
                ┌──────────────────┐
                │ Chrome Extension │
                │   (Manifest V3)  │
                └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js or Bun installed
- Chrome/Chromium browser
- OpenRouter API key (get from https://openrouter.ai)

### 1. Clone & Install

```bash
# Backend dependencies
cd backend
bun install  # or npm install

# Frontend dependencies
cd ../frontend
bun install  # or npm install
```

### 2. Configure Environment

Create `backend/.env` file:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
PORT=3001
FRONTEND_URL=http://localhost:5173
```

Get your API key from: https://openrouter.ai/keys

### 3. Load Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `extension/` folder
5. The extension icon should appear in your toolbar

### 4. Start the Backend

```bash
cd backend
bun start  # or npm start
```

You should see:
```
🚀 Server running on http://localhost:3001
📡 WebSocket server ready
```

### 5. Start the Frontend

```bash
cd frontend
bun dev  # or npm run dev
```

Open http://localhost:5173 in your browser.

### 6. Connect Everything

1. Click the extension icon in Chrome toolbar
2. Click "Connect to Backend" (if not auto-connected)
3. Make sure both backend and extension show as "Connected"
4. Start using voice commands!

## 🎯 Usage

### Voice Commands

Click the mic button and try saying:

- **"Open YouTube"** → Opens YouTube
- **"Search for JEE Advanced physics"** → Searches Google
- **"Click the login button"** → Clicks element with "login" text
- **"Scroll down"** → Scrolls page down
- **"Open GitHub"** → Opens GitHub
- **"Switch to next tab"** → Switches browser tab

### Security Features

- **User Confirmation**: Toggle "User Confirmation" in extension popup to require approval for each action
- **Auto Mode**: Enable for continuous listening (shows suggestions but still respects confirmation setting)

## 📁 Project Structure

```
.
├── backend/              # Node.js + Express backend
│   ├── server.js        # Main server with WebSocket + OpenRouter
│   ├── package.json
│   └── .env             # Environment variables (create this)
│
├── frontend/             # React + Vite + Tailwind frontend
│   ├── src/
│   │   ├── App.jsx      # Main React component
│   │   ├── main.jsx
│   │   └── index.css    # Tailwind + custom styles
│   ├── index.html
│   └── package.json
│
└── extension/            # Chrome Extension (Manifest V3)
    ├── manifest.json    # Extension config
    ├── background.js    # Background service worker
    ├── content.js       # Content script for DOM access
    ├── popup.html       # Extension popup UI
    ├── popup.js         # Popup logic
    └── icons/           # Extension icons
```

## 🔧 Configuration

### OpenRouter Models

You can change the AI model in `backend/server.js`:

```javascript
model: 'openai/gpt-3.5-turbo'  // Default - fast and cheap
// or try:
// 'openai/gpt-4-turbo'        // More capable
// 'anthropic/claude-3-haiku'  // Alternative
```

See available models: https://openrouter.ai/models

### WebSocket URLs

- Frontend connects to: `ws://localhost:3001`
- Extension connects to: `ws://localhost:3001`

Change in:
- `frontend/src/App.jsx` (line with `new WebSocket`)
- `extension/background.js` (variable `serverUrl`)

## 🐛 Troubleshooting

### "OpenRouter API key not configured"
- Make sure you created `backend/.env` with your API key
- Restart the backend after adding the key

### "No extension connected"
- Load the extension in Chrome (see step 3)
- Click "Connect to Backend" in extension popup
- Check extension icon shows "Connected"

### "Speech recognition not supported"
- Use Chrome/Edge browser (Web Speech API required)
- Allow microphone access when prompted

### Backend won't start
- Check if port 3001 is already in use
- Try changing PORT in `.env`

## 📝 Notes

- The extension needs "User Confirmation" toggle if you want to approve each action
- Auto Mode enables continuous listening but still respects confirmation settings
- All commands are processed by AI, so results may vary
- Make sure to grant microphone permissions to the frontend

## 🛠️ Development

### Running in development mode

Backend (with auto-reload):
```bash
cd backend
bun dev  # or npm run dev (with nodemon)
```

Frontend (with HMR):
```bash
cd frontend
bun dev  # or npm run dev
```

## 🚀 Deploy to Vercel

The project includes a `vercel.json` configuration for easy deployment to Vercel. Note that Vercel only supports deploying the **frontend** (React app) since the backend uses WebSockets which aren't supported on Vercel's serverless platform.

### Frontend Deployment (Vercel)

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Go to [Vercel](https://vercel.com) and click "New Project"
3. Import your repository
4. Configure environment variables:
   - `VITE_BACKEND_WS_URL`: Your deployed backend's WebSocket URL (e.g., `wss://your-backend.onrender.com`)
5. Click "Deploy"

The frontend will be available at `https://your-project.vercel.app` after deployment.

### Backend Deployment (WebSocket Required)

Since Vercel doesn't support WebSockets, deploy the backend to a service that supports them:
- **Railway**: Connects to your Git repo, supports Node.js with WebSockets
- **Render**: Free tier available, supports WebSockets
- **Fly.io**: Global deployment, supports WebSockets

Remember to:
1. Set `OPENROUTER_API_KEY` environment variable on your backend host
2. Update the extension's `background.js` to point to your deployed backend URL
3. Update the frontend's `VITE_BACKEND_WS_URL` in Vercel to match your backend URL

## 📄 License

MIT

## 🤝 Contributing

Feel free to open issues or PRs to improve the project!

---

Built with ❤️ using React, Node.js, and AI
