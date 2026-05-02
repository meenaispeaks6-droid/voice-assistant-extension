import { useState, useEffect, useRef, useCallback } from 'react';

// Command suggestions
const COMMAND_SUGGESTIONS = [
  "Open YouTube",
  "Search for JEE Advanced physics",
  "Click the login button",
  "Scroll down",
  "Open GitHub",
  "Search Google for React tutorials",
  "Click submit",
  "Download this image",
  "Fill the email field with test@example.com",
  "Switch to next tab"
];

function App() {
  // State
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, listening, processing, executing, error
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [autoMode, setAutoMode] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [parsedCommand, setParsedCommand] = useState(null);
  const [error, setError] = useState('');

  // Refs
  const wsRef = useRef(null);
  const recognitionRef = useRef(null);

  // WebSocket connection
  useEffect(() => {
    // For Hugging Face Spaces: wss://<space-name>-<username>.hf.space
    // For local development: ws://localhost:3001
    const backendWsUrl = import.meta.env.VITE_BACKEND_WS_URL || 'ws://localhost:3001';
    const ws = new WebSocket(backendWsUrl);

    ws.onopen = () => {
      console.log('Connected to backend');
      setWsConnected(true);
      ws.send(JSON.stringify({ type: 'register', clientType: 'frontend' }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Received:', message);

      switch (message.type) {
        case 'status':
          setStatus(message.status);
          break;
        case 'parsed_command':
          setParsedCommand(message.command);
          setStatus('executing');
          break;
        case 'command_result':
          setStatus('idle');
          addToHistory(command, message.result);
          break;
        case 'extension_status':
          setExtensionConnected(message.connected);
          break;
        case 'error':
          setError(message.error);
          setStatus('error');
          setTimeout(() => setError(''), 5000);
          break;
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from backend');
      setWsConnected(false);
      // Attempt to reconnect
      setTimeout(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          wsRef.current = new WebSocket(backendWsUrl);
        }
      }, 3000);
    };

    wsRef.current = ws;

    return () => ws.close();
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = autoMode;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setStatus('listening');
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(interimTranscript || finalTranscript);

      if (finalTranscript) {
        setCommand(finalTranscript.trim());
        handleVoiceCommand(finalTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access.');
      }
      setIsListening(false);
      setStatus('idle');
    };

    recognition.onend = () => {
      setIsListening(false);
      if (autoMode && status === 'listening') {
        // Restart in auto mode
        setTimeout(() => recognition.start(), 1000);
      } else {
        setStatus('idle');
      }
    };

    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, [autoMode]);

  // Handle voice command
  const handleVoiceCommand = useCallback((cmd) => {
    if (!cmd || status === 'processing' || status === 'executing') return;

    setStatus('processing');
    setCommand(cmd);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'voice_command',
        command: cmd
      }));
    } else {
      setError('Not connected to backend. Please start the backend server.');
      setStatus('error');
    }
  }, [status]);

  // Toggle listening
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setStatus('idle');
    } else {
      setError('');
      setParsedCommand(null);
      recognitionRef.current?.start();
    }
  };

  // Toggle auto mode
  const toggleAutoMode = () => {
    const newMode = !autoMode;
    setAutoMode(newMode);
    if (recognitionRef.current) {
      recognitionRef.current.continuous = newMode;
    }
  };

  // Add to command history
  const addToHistory = (cmd, result) => {
    const entry = {
      id: Date.now(),
      command: cmd,
      result: result,
      timestamp: new Date().toLocaleTimeString()
    };
    setCommandHistory(prev => [entry, ...prev].slice(0, 50)); // Keep last 50
  };

  // Execute text command
  const executeTextCommand = () => {
    if (command.trim()) {
      handleVoiceCommand(command.trim());
      setCommand('');
    }
  };

  // Use suggestion
  const useSuggestion = (suggestion) => {
    setCommand(suggestion);
  };

  // Status display
  const getStatusColor = () => {
    switch (status) {
      case 'listening': return 'text-green-300';
      case 'processing': return 'text-yellow-300';
      case 'executing': return 'text-blue-300';
      case 'error': return 'text-red-300';
      default: return 'text-white/70';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'listening': return '🎙️ Listening...';
      case 'processing': return '🤔 Processing...';
      case 'executing': return '⚡ Executing...';
      case 'error': return '❌ Error';
      default: return 'Ready';
    }
  };

  return (
    <div className="min-h-screen animated-bg p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-2 drop-shadow-lg">
            AI Voice Control 🎙️
          </h1>
          <p className="text-xl text-white/80 font-light">
            Control your browser with voice commands
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
            <div className="text-white/60 text-xs uppercase tracking-wide mb-1">Backend</div>
            <div className={`text-lg font-bold ${wsConnected ? 'text-green-300' : 'text-red-300'}`}>
              {wsConnected ? '🟢 Online' : '🔴 Offline'}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
            <div className="text-white/60 text-xs uppercase tracking-wide mb-1">Extension</div>
            <div className={`text-lg font-bold ${extensionConnected ? 'text-green-300' : 'text-red-300'}`}>
              {extensionConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
            <div className="text-white/60 text-xs uppercase tracking-wide mb-1">Status</div>
            <div className={`text-lg font-bold ${getStatusColor()}`}>
              {getStatusText()}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
            <div className="text-white/60 text-xs uppercase tracking-wide mb-1">Mode</div>
            <div className="text-lg font-bold text-white">
              {autoMode ? '🔄 Auto' : '👆 Manual'}
            </div>
          </div>
        </div>

        {/* Main Control Area */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 mb-8 border border-white/20 shadow-2xl">
          {/* Mic Button */}
          <div className="flex flex-col items-center mb-8">
            <button
              onClick={toggleListening}
              className={`relative w-32 h-32 rounded-full flex items-center justify-center text-6xl transition-all duration-300 ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 glow scale-110'
                  : 'bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 glow'
              } text-white shadow-2xl`}
            >
              {isListening ? '⏹️' : '🎙️'}
              {isListening && (
                <div className="pulse-ring absolute inset-0 rounded-full"></div>
              )}
            </button>
            <p className="mt-4 text-white/70 text-sm">
              {isListening ? 'Click to stop' : 'Click to start listening'}
            </p>
          </div>

          {/* Transcript Display */}
          {transcript && (
            <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/10">
              <p className="text-white/60 text-xs uppercase tracking-wide mb-2">Transcript</p>
              <p className="text-white text-lg">{transcript}</p>
            </div>
          )}

          {/* Text Input Fallback */}
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && executeTextCommand()}
              placeholder="Or type a command..."
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={executeTextCommand}
              className="bg-gradient-to-r from-indigo-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Send →
            </button>
          </div>

          {/* Auto Mode Toggle */}
          <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10">
            <div>
              <p className="text-white font-medium">Auto Mode</p>
              <p className="text-white/60 text-sm">Continuous listening</p>
            </div>
            <button
              onClick={toggleAutoMode}
              className={`w-14 h-8 rounded-full transition-colors duration-300 ${
                autoMode ? 'bg-indigo-500' : 'bg-white/20'
              } relative`}
            >
              <div
                className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${
                  autoMode ? 'translate-x-7' : 'translate-x-1'
                }`}
              ></div>
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 backdrop-blur-lg rounded-2xl p-4 mb-8 border border-red-500/30 text-white">
            <p className="font-semibold">⚠️ {error}</p>
          </div>
        )}

        {/* Parsed Command Display */}
        {parsedCommand && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/20">
            <p className="text-white/60 text-xs uppercase tracking-wide mb-2">Parsed Command</p>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white font-mono text-sm">
                Action: <span className="text-indigo-300">{parsedCommand.action}</span>
              </p>
              {parsedCommand.params && (
                <pre className="text-white/70 text-xs mt-2 overflow-x-auto">
                  {JSON.stringify(parsedCommand.params, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Command Suggestions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 mb-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">💡 Try saying...</h2>
          <div className="flex flex-wrap gap-2">
            {COMMAND_SUGGESTIONS.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => useSuggestion(suggestion)}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-sm transition-colors border border-white/10"
              >
                "{suggestion}"
              </button>
            ))}
          </div>
        </div>

        {/* Command History */}
        {commandHistory.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">📜 Command History</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {commandHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-white font-medium">"{entry.command}"</p>
                    <span className="text-white/40 text-xs">{entry.timestamp}</span>
                  </div>
                  {entry.result && (
                    <div className="flex items-center gap-2">
                      {entry.result.success ? (
                        <span className="text-green-300 text-sm">✅ Executed</span>
                      ) : (
                        <span className="text-red-300 text-sm">❌ {entry.result.error}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Setup Instructions */}
        {(!wsConnected || !extensionConnected) && (
          <div className="bg-yellow-500/20 backdrop-blur-lg rounded-2xl p-6 mt-8 border border-yellow-500/30">
            <h3 className="text-white font-bold text-lg mb-2">⚙️ Setup Required</h3>
            <ul className="text-white/80 space-y-2 text-sm">
              {!wsConnected && (
                <li>• Start the backend: <code className="bg-white/10 px-2 py-1 rounded">cd backend && bun start</code></li>
              )}
              {!extensionConnected && (
                <li>• Load the extension: Open Chrome → Extensions → Load unpacked → Select <code className="bg-white/10 px-2 py-1 rounded">extension</code> folder</li>
              )}
              <li>• Set your OpenRouter API key in <code className="bg-white/10 px-2 py-1 rounded">backend/.env</code></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
