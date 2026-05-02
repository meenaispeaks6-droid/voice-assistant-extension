// Background service worker for Chrome Extension
// Handles WebSocket connection and command execution

let ws = null;
// Default to localhost, but can be changed via popup or storage
let serverUrl = 'ws://localhost:3001';
let isConnected = false;
let autoMode = false;
let userConfirmationRequired = true;
let reconnectInterval = null;

// Load saved server URL from storage
chrome.storage.local.get(['serverUrl'], (result) => {
  if (result.serverUrl) {
    serverUrl = result.serverUrl;
  }
});

// Connect to WebSocket server
function connectWebSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  ws = new WebSocket(serverUrl);

  ws.onopen = () => {
    console.log('Extension connected to backend');
    isConnected = true;
    clearInterval(reconnectInterval);
    updateIcon(true);
  };

  ws.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    console.log('Extension received:', message);

    if (message.type === 'execute_command') {
      await handleCommand(message.command);
    } else if (message.type === 'status_update') {
      // Forward status updates to content script
      broadcastToTabs({ type: 'status', status: message.status });
    }
  };

  ws.onclose = () => {
    console.log('Extension disconnected from backend');
    isConnected = false;
    updateIcon(false);
    // Attempt to reconnect
    if (!reconnectInterval) {
      reconnectInterval = setInterval(connectWebSocket, 3000);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

// Execute browser automation commands
async function handleCommand(command) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      console.error('No active tab found');
      return;
    }

    // Check user confirmation if required
    if (userConfirmationRequired && !autoMode) {
      const confirmed = await requestUserConfirmation(command);
      if (!confirmed) {
        sendToBackend({ type: 'command_result', success: false, error: 'User denied execution' });
        return;
      }
    }

    const action = command.action;
    const params = command.params || {};

    switch (action) {
      case 'open_url':
        await chrome.tabs.update(tab.id, { url: params.url });
        break;

      case 'search_google':
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(params.query)}`;
        await chrome.tabs.update(tab.id, { url: searchUrl });
        break;

      case 'click_element':
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: clickElementByText,
          args: [params.text, params.selector]
        });
        break;

      case 'scroll_up':
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.scrollBy(0, -500)
        });
        break;

      case 'scroll_down':
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.scrollBy(0, 500)
        });
        break;

      case 'download_image':
        await downloadImage(params.url, params.filename);
        break;

      case 'switch_tab':
        await switchTab(params.direction || 'next');
        break;

      case 'fill_input':
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: fillInput,
          args: [params.selector, params.value]
        });
        break;

      default:
        console.error('Unknown action:', action);
    }

    sendToBackend({ type: 'command_result', success: true, action });
  } catch (error) {
    console.error('Command execution error:', error);
    sendToBackend({ type: 'command_result', success: false, error: error.message });
  }
}

// Helper: Click element by text content
function clickElementByText(text, selector) {
  const elements = selector
    ? document.querySelectorAll(selector)
    : document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');

  for (const el of elements) {
    if (el.textContent.toLowerCase().includes(text.toLowerCase())) {
      el.click();
      return true;
    }
  }
  return false;
}

// Helper: Fill input field
function fillInput(selector, value) {
  const input = document.querySelector(selector);
  if (input) {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  return false;
}

// Helper: Download image
async function downloadImage(url, filename) {
  try {
    await chrome.downloads.download({
      url: url,
      filename: filename || 'downloaded_image.jpg',
      saveAs: false
    });
  } catch (error) {
    console.error('Download failed:', error);
  }
}

// Helper: Switch tab
async function switchTab(direction) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const activeTab = tabs.find(tab => tab.active);
  const currentIndex = tabs.indexOf(activeTab);

  let nextIndex;
  if (direction === 'next') {
    nextIndex = (currentIndex + 1) % tabs.length;
  } else {
    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  }

  await chrome.tabs.update(tabs[nextIndex].id, { active: true });
}

// Request user confirmation via notification
function requestUserConfirmation(command) {
  return new Promise((resolve) => {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Confirm Action',
      message: `Execute: ${command.action}?`,
      buttons: [{ title: 'Allow' }, { title: 'Deny' }]
    }, (notificationId) => {
      const handleButtonClick = (clickedId, buttonIndex) => {
        if (clickedId === notificationId) {
          chrome.notifications.onButtonClicked.removeListener(handleButtonClick);
          resolve(buttonIndex === 0);
        }
      };
      chrome.notifications.onButtonClicked.addListener(handleButtonClick);

      // Auto-deny after 10 seconds
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
        chrome.notifications.onButtonClicked.removeListener(handleButtonClick);
        resolve(false);
      }, 10000);
    });
  });
}

// Send message to backend
function sendToBackend(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Broadcast to all tabs with content script
function broadcastToTabs(message) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    });
  });
}

// Update extension icon based on connection status
function updateIcon(connected) {
  const iconPath = connected ? 'icons/icon48.png' : 'icons/icon48_gray.png';
  chrome.action.setIcon({ path: iconPath });
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'connect') {
    serverUrl = message.serverUrl || serverUrl;
    connectWebSocket();
    sendResponse({ connected: isConnected });
  } else if (message.type === 'toggle_confirmation') {
    userConfirmationRequired = message.value;
    sendResponse({ userConfirmationRequired });
  } else if (message.type === 'toggle_auto_mode') {
    autoMode = message.value;
    sendResponse({ autoMode });
  } else if (message.type === 'get_status') {
    sendResponse({
      connected: isConnected,
      autoMode,
      userConfirmationRequired
    });
  }
});

// Initialize connection on startup
connectWebSocket();
