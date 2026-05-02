---
title: AI Voice Browser Automation Backend
emoji: 🤖
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
---

# AI Voice Browser Automation Backend

This is the backend server for the AI Voice Browser Automation Chrome extension.

## Environment Variables

Set the following secret in your Hugging Face Space settings:

- `OPENROUTER_API_KEY`: Your OpenRouter API key (get it from https://openrouter.ai/keys)

## WebSocket Endpoint

Once deployed, the WebSocket endpoint will be:
```
wss://<your-space-name>-<your-username>.hf.space
```

## API Endpoints

- `GET /health` - Health check
- `POST /api/parse-command` - Parse voice commands using AI
- `WebSocket /` - Real-time communication with extension/frontend
