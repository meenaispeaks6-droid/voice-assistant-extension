// Content script for Chrome Extension
// Handles communication with background script and DOM manipulation

let isListening = false;
let status = 'idle'; // idle, listening, processing, executing

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'status') {
    updateStatus(message.status);
  } else if (message.type === 'execute_dom_action') {
    executeDomAction(message.action, message.params);
  }
  return true;
});

// Update UI status indicator
function updateStatus(newStatus) {
  status = newStatus;
  const indicator = document.getElementById('voice-status-indicator');
  if (indicator) {
    indicator.className = `status-${status}`;
    indicator.textContent = status.charAt(0).toUpperCase() + status.slice(1);
  }
}

// DOM actions that need to be executed in page context
function executeDomAction(action, params) {
  switch (action) {
    case 'highlight_element':
      highlightElement(params.selector || params.text);
      break;
    case 'show_overlay':
      showOverlay(params.message);
      break;
  }
}

// Highlight an element on the page
function highlightElement(selectorOrText) {
  // Remove previous highlights
  document.querySelectorAll('.ai-highlight').forEach(el => {
    el.classList.remove('ai-highlight');
    el.style.outline = '';
  });

  // Find element by selector or text
  let element = null;
  if (selectorOrText.startsWith('.')) {
    element = document.querySelector(selectorOrText);
  } else {
    const allElements = document.querySelectorAll('button, a, input, [onclick]');
    for (const el of allElements) {
      if (el.textContent.includes(selectorOrText)) {
        element = el;
        break;
      }
    }
  }

  if (element) {
    element.classList.add('ai-highlight');
    element.style.outline = '3px solid #6366f1';
    element.style.outlineOffset = '2px';
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Remove highlight after 3 seconds
    setTimeout(() => {
      element.classList.remove('ai-highlight');
      element.style.outline = '';
    }, 3000);
  }
}

// Show overlay message
function showOverlay(message) {
  const overlay = document.createElement('div');
  overlay.id = 'ai-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease;
  `;
  overlay.textContent = message;

  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(overlay);

  setTimeout(() => overlay.remove(), 3000);
}

// Inject status indicator into page
function injectStatusIndicator() {
  if (document.getElementById('voice-status-indicator')) return;

  const indicator = document.createElement('div');
  indicator.id = 'voice-status-indicator';
  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 12px;
    z-index: 999999;
    display: none;
    backdrop-filter: blur(10px);
  `;
  indicator.textContent = 'Idle';
  document.body.appendChild(indicator);
}

// Initialize
injectStatusIndicator();
console.log('AI Voice Browser Automation content script loaded');
