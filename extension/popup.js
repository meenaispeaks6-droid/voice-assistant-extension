// Popup script for Chrome Extension

let isConnected = false;
let userConfirmationRequired = true;
let autoMode = false;

// DOM elements
const connectionStatus = document.getElementById('connection-status');
const modeStatus = document.getElementById('mode-status');
const toggleConfirmation = document.getElementById('toggle-confirmation');
const toggleAuto = document.getElementById('toggle-auto');
const serverUrlInput = document.getElementById('server-url');
const btnConnect = document.getElementById('btn-connect');
const btnOpenFrontend = document.getElementById('btn-open-frontend');

// Load saved server URL
chrome.storage.local.get(['serverUrl'], (result) => {
  if (result.serverUrl) {
    serverUrlInput.value = result.serverUrl;
  }
});

// Initialize UI with current state
function initializeUI() {
  chrome.runtime.sendMessage({ type: 'get_status' }, (response) => {
    if (response) {
      isConnected = response.connected;
      userConfirmationRequired = response.userConfirmationRequired;
      autoMode = response.autoMode;
      updateUI();
    }
  });
}

// Update UI based on state
function updateUI() {
  // Connection status
  connectionStatus.textContent = isConnected ? 'Connected' : 'Disconnected';
  connectionStatus.className = `status-value ${isConnected ? 'connected' : 'disconnected'}`;
  btnConnect.textContent = isConnected ? 'Disconnect' : 'Connect to Backend';

  // Mode status
  modeStatus.textContent = autoMode ? 'Auto Mode' : 'Manual Mode';

  // Toggles
  toggleConfirmation.classList.toggle('active', userConfirmationRequired);
  toggleAuto.classList.toggle('active', autoMode);
}

// Toggle user confirmation
toggleConfirmation.addEventListener('click', () => {
  userConfirmationRequired = !userConfirmationRequired;
  chrome.runtime.sendMessage({
    type: 'toggle_confirmation',
    value: userConfirmationRequired
  });
  updateUI();
});

// Toggle auto mode
toggleAuto.addEventListener('click', () => {
  autoMode = !autoMode;
  chrome.runtime.sendMessage({
    type: 'toggle_auto_mode',
    value: autoMode
  });
  updateUI();
});

// Connect/Disconnect button
btnConnect.addEventListener('click', () => {
  const serverUrl = serverUrlInput.value.trim();
  // Save to storage
  chrome.storage.local.set({ serverUrl: serverUrl });
  chrome.runtime.sendMessage({
    type: 'connect',
    serverUrl: serverUrl
  }, (response) => {
    if (response) {
      isConnected = response.connected;
      updateUI();
    }
  });
});

// Open frontend dashboard
btnOpenFrontend.addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:5173' });
});

// Listen for status updates from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'status_update') {
    modeStatus.textContent = message.status;
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', initializeUI);
initializeUI();
