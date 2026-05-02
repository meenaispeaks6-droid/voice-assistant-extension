// AI Voice Browser Automation - Backend Server
// Express + WebSocket + OpenRouter SDK Integration

require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { OpenRouter } = require('@openrouter/sdk');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Store connected clients
const clients = new Map(); // ws -> { type: 'extension' | 'frontend', id: string }

// OpenRouter configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Initialize OpenRouter SDK
let openrouter = null;
if (OPENROUTER_API_KEY && OPENROUTER_API_KEY !== 'your_openrouter_api_key_here') {
  openrouter = new OpenRouter({
    apiKey: OPENROUTER_API_KEY
  });
}

// System prompt for AI command parsing
const SYSTEM_PROMPT = `You are an AI assistant that converts natural language commands into structured JSON actions for browser automation.

Available actions:
1. "open_url" - Open a URL. Params: { "url": "https://..." }
2. "search_google" - Search on Google. Params: { "query": "search term" }
3. "click_element" - Click element by text. Params: { "text": "button text", "selector": "optional css selector" }
4. "scroll_up" - Scroll up. Params: {}
5. "scroll_down" - Scroll down. Params: {}
6. "download_image" - Download an image. Params: { "url": "image url", "filename": "optional" }
7. "switch_tab" - Switch browser tab. Params: { "direction": "next" or "prev" }
8. "fill_input" - Fill input field. Params: { "selector": "css selector", "value": "text to fill" }

Respond ONLY with valid JSON in this format:
{
  "action": "action_name",
  "params": { ... }
}

If the command is unclear, return:
{
  "action": "unknown",
  "params": { "error": "Please be more specific" }
}

Examples:
User: "Open YouTube"
Response: {"action": "open_url", "params": {"url": "https://www.youtube.com"}}

User: "Search for JEE Advanced physics"
Response: {"action": "search_google", "params": {"query": "JEE Advanced physics"}}

User: "Click the login button"
Response: {"action": "click_element", "params": {"text": "login"}}

User: "Scroll down"
Response: {"action": "scroll_down", "params": {}}
`;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    openrouterConnected: !!openrouter,
    extensions: Array.from(clients.values()).filter(c => c.type === 'extension').length,
    frontends: Array.from(clients.values()).filter(c => c.type === 'frontend').length
  });
});

// Parse command using OpenRouter SDK
app.post('/api/parse-command', async (req, res) => {
  try {
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    if (!openrouter) {
      return res.status(500).json({ error: 'OpenRouter API key not configured' });
    }

    // Use OpenRouter SDK to parse command
    const response = await openrouter.chat.send({
      model: 'openai/gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: command }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const content = response.choices[0].message.content.trim();
    console.log('AI Response:', content);

    // Parse JSON response
    let parsedCommand;
    try {
      parsedCommand = JSON.parse(content);
    } catch (e) {
      // Try to extract JSON from response if it contains extra text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedCommand = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response from AI');
      }
    }

    res.json({ success: true, command: parsedCommand });

  } catch (error) {
    console.error('Parse command error:', error);
    res.status(500).json({
      error: 'Failed to parse command',
      details: error.message
    });
  }
});

// Execute command (send to extension via WebSocket)
app.post('/api/execute-command', async (req, res) => {
  try {
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    // Find connected extension
    const extensionClient = Array.from(clients.entries()).find(
      ([_, client]) => client.type === 'extension'
    );

    if (!extensionClient) {
      return res.status(503).json({ error: 'No extension connected' });
    }

    const [ws, _] = extensionClient;

    // Send command to extension
    ws.send(JSON.stringify({
      type: 'execute_command',
      command
    }));

    res.json({ success: true, message: 'Command sent to extension' });

  } catch (error) {
    console.error('Execute command error:', error);
    res.status(500).json({ error: 'Failed to execute command' });
  }
});

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      if (message.type === 'register') {
        // Register client type (extension or frontend)
        clients.set(ws, { type: message.clientType, id: message.id || Date.now() });
        console.log(`Client registered: ${message.clientType}`);

        // Notify frontend about extension status
        broadcastToFrontends({
          type: 'extension_status',
          connected: message.clientType === 'extension'
        });
      }

      if (message.type === 'command_result') {
        // Forward extension result to frontend
        broadcastToFrontends({
          type: 'command_result',
          result: message
        });
      }

      if (message.type === 'voice_command') {
        // Handle voice command from frontend
        handleVoiceCommand(message.command, ws);
      }

    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    const client = clients.get(ws);
    console.log(`Client disconnected: ${client?.type}`);
    clients.delete(ws);

    // Notify if extension disconnected
    if (client?.type === 'extension') {
      broadcastToFrontends({
        type: 'extension_status',
        connected: false
      });
    }
  });
});

// Handle voice command (parse with AI and execute)
async function handleVoiceCommand(command, frontendWs) {
  try {
    // Send status to frontend
    frontendWs.send(JSON.stringify({ type: 'status', status: 'processing' }));

    if (!openrouter) {
      frontendWs.send(JSON.stringify({
        type: 'error',
        error: 'OpenRouter API key not configured. Please set it in .env file.'
      }));
      return;
    }

    // Parse command with OpenRouter SDK
    const response = await openrouter.chat.send({
      model: 'openai/gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: command }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const content = response.choices[0].message.content.trim();
    let parsedCommand;
    try {
      parsedCommand = JSON.parse(content);
    } catch (e) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedCommand = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response from AI');
      }
    }

    // Send parsed command to frontend
    frontendWs.send(JSON.stringify({
      type: 'parsed_command',
      command: parsedCommand
    }));

    // Execute command via extension
    const extensionClient = Array.from(clients.entries()).find(
      ([_, client]) => client.type === 'extension'
    );

    if (extensionClient) {
      frontendWs.send(JSON.stringify({ type: 'status', status: 'executing' }));
      extensionClient[0].send(JSON.stringify({
        type: 'execute_command',
        command: parsedCommand
      }));
    } else {
      frontendWs.send(JSON.stringify({
        type: 'error',
        error: 'No extension connected. Please install and connect the Chrome extension.'
      }));
    }

  } catch (error) {
    console.error('Voice command error:', error);
    frontendWs.send(JSON.stringify({
      type: 'error',
      error: 'Failed to process command',
      details: error.message
    }));
  }
}

// Broadcast message to all frontend clients
function broadcastToFrontends(message) {
  clients.forEach((client, ws) => {
    if (client.type === 'frontend' && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

// Start server
const PORT = process.env.PORT || 7860; // Hugging Face uses PORT env var (default 7860)
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  if (!openrouter) {
    console.log('⚠️  OpenRouter SDK NOT configured - set OPENROUTER_API_KEY in environment');
  } else {
    console.log('✅ OpenRouter SDK configured');
  }
});
