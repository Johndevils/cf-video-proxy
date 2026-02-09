export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Set CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }
    
    // Serve HTML for the main page
    if (url.pathname === '/' || url.pathname === '') {
      return new Response(getHTML(), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html;charset=UTF-8',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }
    
    // Serve CSS
    if (url.pathname === '/style.css') {
      return new Response(getCSS(), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/css',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }
    
    // Serve JavaScript
    if (url.pathname === '/player.js') {
      return new Response(getJavaScript(), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/javascript',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }
    
    // API endpoint for proxying video requests
    if (url.pathname === '/api/proxy') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'No URL provided' }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      try {
        // Forward the request to the target URL
        const response = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Range': request.headers.get('Range') || '',
            'Referer': new URL(targetUrl).origin || ''
          }
        });
        
        // Forward the response with appropriate headers
        const headers = new Headers(response.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
        headers.set('Cache-Control', 'public, max-age=86400');
        
        return new Response(response.body, {
          status: response.status,
          headers: headers
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch video', details: error.message }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }
    
    // 404 for other routes
    return new Response('Not Found', { 
      status: 404,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain'
      }
    });
  },
};

// HTML content
function getHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Arsystream - Online Video Player</title>
    <link rel="stylesheet" href="/style.css">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90' fill='%23DC2626'>▶</text></svg>">
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="container">
            <h1 class="logo">ARSYSTREAM</h1>
            <p class="tagline">Paste. Play. Stream.</p>
        </div>
    </header>

    <!-- Main Content -->
    <main class="main">
        <div class="container">
            <!-- URL Input Card -->
            <div class="input-card">
                <div class="input-header">
                    <h2>Enter Video URL</h2>
                    <p>Supports MP4, HLS (.m3u8), Live Streams, and more</p>
                </div>
                
                <div class="input-group">
                    <input 
                        type="text" 
                        id="urlInput" 
                        class="url-input"
                        placeholder="Paste video URL here... (e.g., https://example.com/video.mp4)"
                        autocomplete="off"
                        spellcheck="false"
                    >
                    
                    <div class="button-group">
                        <button id="playBtn" class="btn btn-primary">
                            <span class="btn-content">▶ Play Video</span>
                        </button>
                        <button id="clearBtn" class="btn btn-secondary">Clear</button>
                    </div>
                </div>
                
                <!-- Quick Examples -->
                <div class="examples">
                    <p>Quick Examples:</p>
                    <div class="example-buttons">
                        <button class="example-btn" data-url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4">
                            Sample MP4
                        </button>
                        <button class="example-btn" data-url="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8">
                            Sample HLS
                        </button>
                    </div>
                </div>
            </div>

            <!-- Video Player -->
            <div class="player-wrapper">
                <!-- Loading Spinner -->
                <div id="loader" class="loader hidden">
                    <div class="spinner"></div>
                    <p>Loading video...</p>
                </div>
                
                <!-- Video Element -->
                <video 
                    id="videoPlayer"
                    class="video-player"
                    preload="auto"
                    playsinline
                    webkit-playsinline
                    crossorigin="anonymous"
                ></video>
                
                <!-- Error Message -->
                <div id="errorMsg" class="error-message hidden">
                    <div class="error-icon">⚠️</div>
                    <p id="errorText">Failed to load video. Please check the URL.</p>
                    <button id="retryBtn" class="btn btn-primary">Retry</button>
                </div>
                
                <!-- Custom Controls -->
                <div id="controls" class="controls">
                    <!-- Progress Bar -->
                    <div class="progress-container">
                        <div class="progress-bar" id="progressBar">
                            <div class="progress-buffered" id="progressBuffered"></div>
                            <div class="progress-current" id="progressCurrent"></div>
                            <input type="range" id="progressSlider" min="0" max="100" value="0" class="progress-slider">
                        </div>
                        <div class="time-display">
                            <span id="currentTime">00:00</span>
                            <span id="totalTime">00:00</span>
                        </div>
                    </div>
                    
                    <!-- Control Buttons -->
                    <div class="controls-bottom">
                        <div class="controls-left">
                            <button id="playPauseBtn" class="control-btn play-pause" title="Play/Pause">▶</button>
                            <div class="volume-control">
                                <button id="muteBtn" class="control-btn" title="Mute">🔊</button>
                                <input type="range" id="volumeSlider" min="0" max="100" value="100" class="volume-slider" title="Volume">
                            </div>
                        </div>
                        
                        <div class="controls-right">
                            <button id="fullscreenBtn" class="control-btn" title="Fullscreen">⛶</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Instructions -->
            <div class="instructions">
                <h3>How to Use:</h3>
                <div class="instructions-grid">
                    <div class="instruction-section">
                        <h4>📋 Supported Formats</h4>
                        <ul>
                            <li>MP4 videos (direct links)</li>
                            <li>HLS streams (.m3u8)</li>
                            <li>Live streaming URLs</li>
                            <li>Token-authenticated URLs</li>
                        </ul>
                    </div>
                    
                    <div class="instruction-section">
                        <h4>⌨️ Keyboard Shortcuts</h4>
                        <ul>
                            <li><strong>Space</strong> Play/Pause</li>
                            <li><strong>F</strong> Fullscreen</li>
                            <li><strong>M</strong> Mute/Unmute</li>
                            <li><strong>← →</strong> Seek 10 seconds</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <p>Arsystream v1.0 • Simple Online Video Player</p>
        </div>
    </footer>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <script src="/player.js"></script>
</body>
</html>`;
}

// CSS content
function getCSS() {
  return `/* Reset & Base Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', 'Arial', sans-serif;
    background: #000000;
    color: #ffffff;
    line-height: 1.6;
    min-height: 100vh;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    width: 100%;
}

/* Header */
.header {
    background: #1a1a1a;
    padding: 20px 0;
    border-bottom: 3px solid #dc2626;
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.1);
}

.logo {
    font-size: 32px;
    font-weight: 800;
    color: #dc2626;
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-bottom: 8px;
}

.tagline {
    color: #a3a3a3;
    font-size: 16px;
    font-weight: 300;
    letter-spacing: 1px;
}

/* Main Content */
.main {
    padding: 40px 0;
    flex: 1;
}

/* Input Card */
.input-card {
    background: #1a1a1a;
    padding: 30px;
    border-radius: 16px;
    border: 1px solid #7f1d1d;
    margin-bottom: 40px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.input-header h2 {
    font-size: 24px;
    color: #dc2626;
    margin-bottom: 8px;
}

.input-header p {
    color: #a3a3a3;
    font-size: 14px;
}

.url-input {
    width: 100%;
    padding: 18px 24px;
    font-size: 16px;
    background: #000000;
    border: 2px solid #dc2626;
    border-radius: 12px;
    color: #ffffff;
    outline: none;
    transition: all 0.3s ease;
    margin: 20px 0;
    font-family: 'Courier New', monospace;
}

.url-input:focus {
    border-color: #991b1b;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2);
}

.url-input::placeholder {
    color: #666666;
    font-style: italic;
}

/* Button Styles */
.btn {
    padding: 14px 32px;
    font-size: 16px;
    font-weight: 600;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    min-width: 140px;
}

.btn-primary {
    background: linear-gradient(135deg, #dc2626, #991b1b);
    color: #ffffff;
    box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);
}

.btn-primary:hover {
    background: linear-gradient(135deg, #991b1b, #7f1d1d);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4);
}

.btn-secondary {
    background: transparent;
    color: #dc2626;
    border: 2px solid #dc2626;
}

.btn-secondary:hover {
    background: rgba(220, 38, 38, 0.1);
    transform: translateY(-2px);
}

.button-group {
    display: flex;
    gap: 15px;
    justify-content: center;
    flex-wrap: wrap;
}

/* Examples */
.examples {
    margin-top: 25px;
    padding-top: 20px;
    border-top: 1px solid #333333;
}

.examples p {
    color: #a3a3a3;
    margin-bottom: 10px;
    font-size: 14px;
}

.example-buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.example-btn {
    padding: 8px 16px;
    background: #333333;
    color: #ffffff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.3s ease;
    font-size: 12px;
}

.example-btn:hover {
    background: #444444;
}

/* Player Wrapper */
.player-wrapper {
    position: relative;
    width: 100%;
    background: #000000;
    border: 3px solid #7f1d1d;
    border-radius: 20px;
    overflow: hidden;
    margin-bottom: 40px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
    aspect-ratio: 16 / 9;
}

.video-player {
    width: 100%;
    height: 100%;
    display: block;
    background: #000000;
}

/* Loader */
.loader {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
}

.spinner {
    width: 70px;
    height: 70px;
    border: 6px solid rgba(255, 255, 255, 0.1);
    border-top: 6px solid #dc2626;
    border-radius: 50%;
    animation: spin 1.2s linear infinite;
    margin-bottom: 20px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.loader p {
    color: #e5e5e5;
    font-size: 18px;
    font-weight: 500;
}

/* Error Message */
.error-message {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 20;
    padding: 40px;
}

.error-icon {
    font-size: 48px;
    margin-bottom: 20px;
}

.error-message p {
    color: #ffffff;
    font-size: 18px;
    margin-bottom: 25px;
    text-align: center;
    max-width: 500px;
}

/* Controls */
.controls {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.7), transparent);
    padding: 20px 30px 15px;
    transition: opacity 0.4s ease;
    z-index: 5;
}

/* Progress Bar */
.progress-container {
    margin-bottom: 15px;
}

.progress-bar {
    position: relative;
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    overflow: hidden;
    cursor: pointer;
    margin-bottom: 8px;
}

.progress-buffered {
    position: absolute;
    height: 100%;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 4px;
    transition: width 0.3s ease;
}

.progress-current {
    position: absolute;
    height: 100%;
    background: linear-gradient(90deg, #dc2626, #f87171);
    border-radius: 4px;
    transition: width 0.1s linear;
    z-index: 2;
}

.progress-slider {
    position: absolute;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    z-index: 10;
}

.time-display {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    color: #a3a3a3;
    font-family: 'Courier New', monospace;
}

/* Controls Bottom */
.controls-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.controls-left, .controls-right {
    display: flex;
    align-items: center;
    gap: 15px;
}

.control-btn {
    background: none;
    border: none;
    color: #ffffff;
    font-size: 24px;
    cursor: pointer;
    padding: 8px 12px;
    transition: all 0.3s ease;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
}

.control-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #dc2626;
}

.control-btn:disabled {
    color: #666666;
    cursor: not-allowed;
    opacity: 0.5;
}

.control-btn:disabled:hover {
    background: none;
    color: #666666;
}

.play-pause {
    background: #dc2626;
    border-radius: 50%;
    width: 56px;
    height: 56px;
    font-size: 28px;
    box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4);
}

.play-pause:hover {
    background: #991b1b;
}

.volume-control {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.05);
    padding: 5px 15px;
    border-radius: 20px;
}

.volume-slider {
    width: 100px;
    height: 5px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    outline: none;
    cursor: pointer;
    transition: width 0.3s ease;
}

.volume-slider:hover {
    width: 120px;
}

.volume-slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    background: #dc2626;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.volume-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #dc2626;
    border-radius: 50%;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* Instructions */
.instructions {
    background: #1a1a1a;
    padding: 30px;
    border-radius: 16px;
    border: 1px solid #333333;
}

.instructions h3 {
    color: #dc2626;
    font-size: 24px;
    margin-bottom: 25px;
}

.instructions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 40px;
}

.instruction-section h4 {
    color: #ffffff;
    font-size: 18px;
    margin-bottom: 15px;
}

.instruction-section ul {
    list-style: none;
    padding-left: 0;
}

.instruction-section li {
    color: #a3a3a3;
    margin-bottom: 10px;
    padding-left: 24px;
    position: relative;
}

.instruction-section li:before {
    content: "▶";
    color: #dc2626;
    position: absolute;
    left: 0;
    font-size: 14px;
}

/* Footer */
.footer {
    background: #1a1a1a;
    padding: 25px 0;
    border-top: 2px solid #333333;
    margin-top: 40px;
}

.footer p {
    text-align: center;
    color: #a3a3a3;
    font-size: 14px;
}

/* Utility Classes */
.hidden {
    display: none !important;
}

/* Responsive Design */
@media (max-width: 768px) {
    .logo {
        font-size: 24px;
    }
    
    .input-card, .instructions {
        padding: 20px;
    }
    
    .button-group {
        flex-direction: column;
        align-items: center;
    }
    
    .btn {
        width: 100%;
        max-width: 300px;
    }
    
    .player-wrapper {
        border-radius: 12px;
    }
    
    .controls {
        padding: 15px 20px 10px;
    }
    
    .controls-bottom {
        flex-direction: column;
        gap: 15px;
    }
    
    .controls-left, .controls-right {
        width: 100%;
        justify-content: space-between;
    }
    
    .volume-slider {
        width: 80px;
    }
    
    .instructions-grid {
        grid-template-columns: 1fr;
        gap: 25px;
    }
}

@media (max-width: 480px) {
    .logo {
        font-size: 20px;
        letter-spacing: 2px;
    }
    
    .tagline {
        font-size: 14px;
    }
    
    .url-input {
        padding: 14px 18px;
        font-size: 14px;
    }
    
    .control-btn {
        font-size: 20px;
        padding: 6px 8px;
        min-width: 36px;
        min-height: 36px;
    }
    
    .play-pause {
        width: 48px;
        height: 48px;
        font-size: 24px;
    }
    
    .volume-slider {
        width: 60px;
    }
}`;
}

// JavaScript content
function getJavaScript() {
  return `// Arsystream Video Player v1.0
// Complete video player with HLS support

document.addEventListener('DOMContentLoaded', () => {
    // ===== DOM ELEMENTS =====
    const video = document.getElementById('videoPlayer');
    const urlInput = document.getElementById('urlInput');
    const playBtn = document.getElementById('playBtn');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const muteBtn = document.getElementById('muteBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const progressSlider = document.getElementById('progressSlider');
    const currentTime = document.getElementById('currentTime');
    const totalTime = document.getElementById('totalTime');
    const loader = document.getElementById('loader');
    const errorMsg = document.getElementById('errorMsg');
    const errorText = document.getElementById('errorText');
    const retryBtn = document.getElementById('retryBtn');
    const clearBtn = document.getElementById('clearBtn');
    const controls = document.getElementById('controls');
    const progressCurrent = document.getElementById('progressCurrent');
    const progressBuffered = document.getElementById('progressBuffered');
    const progressBar = document.getElementById('progressBar');
    const exampleBtns = document.querySelectorAll('.example-btn');

    // ===== STATE VARIABLES =====
    let hls = null;
    let isFullscreen = false;
    let controlsTimeout = null;
    let isPlaying = false;

    // ===== INITIALIZATION =====
    function init() {
        // Set initial volume
        video.volume = volumeSlider.value / 100;
        
        // Setup event listeners
        setupEventListeners();
        setupKeyboardShortcuts();
        setupExampleButtons();
        
        // Focus URL input
        setTimeout(() => urlInput.focus(), 100);
        
        console.log('🎬 Arsystream Player v1.0 initialized');
    }

    // ===== EVENT LISTENERS SETUP =====
    function setupEventListeners() {
        // URL Input & Buttons
        playBtn.addEventListener('click', loadVideo);
        clearBtn.addEventListener('click', clearPlayer);
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loadVideo();
        });
        retryBtn.addEventListener('click', loadVideo);
        
        // Video Controls
        playPauseBtn.addEventListener('click', togglePlayPause);
        muteBtn.addEventListener('click', toggleMute);
        fullscreenBtn.addEventListener('click', toggleFullscreen);
        
        // Sliders
        volumeSlider.addEventListener('input', handleVolumeChange);
        progressSlider.addEventListener('input', handleProgressChange);
        
        // Video Events
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('progress', onProgress);
        video.addEventListener('ended', onEnded);
        video.addEventListener('waiting', onWaiting);
        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('error', onVideoError);
        
        // Fullscreen Events
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        
        // Mouse events for controls
        video.parentElement.addEventListener('mousemove', showControls);
        video.parentElement.addEventListener('mouseleave', hideControlsAfterDelay);
        video.addEventListener('click', togglePlayPause);
        
        // Drag and drop for URL input
        urlInput.addEventListener('dragover', (e) => {
            e.preventDefault();
            urlInput.style.borderColor = '#dc2626';
            urlInput.style.backgroundColor = '#1a1a1a';
        });
        
        urlInput.addEventListener('dragleave', () => {
            urlInput.style.borderColor = '';
            urlInput.style.backgroundColor = '';
        });
        
        urlInput.addEventListener('drop', (e) => {
            e.preventDefault();
            urlInput.style.borderColor = '';
            urlInput.style.backgroundColor = '';
            
            const text = e.dataTransfer.getData('text');
            if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
                urlInput.value = text;
                showToast('URL dropped successfully!', 'success');
            }
        });
    }

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Skip if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            // Skip if Ctrl/Cmd is pressed
            if (e.ctrlKey || e.metaKey) return;
            
            switch(e.key.toLowerCase()) {
                case ' ': // Space - Play/Pause
                    e.preventDefault();
                    togglePlayPause();
                    break;
                case 'f': // F - Fullscreen
                    toggleFullscreen();
                    break;
                case 'm': // M - Mute
                    toggleMute();
                    break;
                case 'arrowleft': // ← - Seek back 10s
                    e.preventDefault();
                    video.currentTime = Math.max(0, video.currentTime - 10);
                    break;
                case 'arrowright': // → - Seek forward 10s
                    e.preventDefault();
                    video.currentTime = Math.min(video.duration, video.currentTime + 10);
                    break;
                case 'arrowup': // ↑ - Volume up
                    e.preventDefault();
                    video.volume = Math.min(video.volume + 0.1, 1);
                    volumeSlider.value = video.volume * 100;
                    break;
                case 'arrowdown': // ↓ - Volume down
                    e.preventDefault();
                    video.volume = Math.max(video.volume - 0.1, 0);
                    volumeSlider.value = video.volume * 100;
                    break;
            }
        });
    }

    function setupExampleButtons() {
        exampleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const url = btn.dataset.url;
                urlInput.value = url;
                showToast('Example URL loaded. Click "Play Video" to start.', 'info');
                urlInput.focus();
            });
        });
    }

    // ===== VIDEO LOADING =====
    function loadVideo() {
        const url = urlInput.value.trim();
        
        if (!url) {
            showError('Please enter a video URL');
            urlInput.focus();
            return;
        }
        
        // Clean up previous HLS instance
        if (hls) {
            hls.destroy();
            hls = null;
        }
        
        // Show loading state
        showLoader();
        hideError();
        showControls();
        
        try {
            if (isHLSStream(url)) {
                loadHLSVideo(url);
            } else {
                loadNativeVideo(url);
            }
        } catch (error) {
            console.error('Failed to load video:', error);
            showError('Failed to load video. Please check the URL.');
            hideLoader();
        }
    }

    function loadHLSVideo(url) {
        if (typeof Hls === 'undefined') {
            showError('HLS.js library not loaded. Please refresh the page.');
            hideLoader();
            return;
        }
        
        if (Hls.isSupported()) {
            hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90
            });
            
            hls.loadSource(url);
            hls.attachMedia(video);
            
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(e => {
                    console.warn('Auto-play prevented:', e.message);
                    showToast('Click the play button to start', 'info');
                });
            });
            
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.error('HLS fatal error:', data);
                    showError('Failed to load HLS stream');
                    hls.destroy();
                    loadNativeVideo(url); // Fallback to native
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            loadNativeVideo(url);
        } else {
            showError('HLS streaming not supported in your browser');
        }
    }

    function loadNativeVideo(url) {
        video.src = url;
        video.load();
        
        video.play().catch(e => {
            console.warn('Auto-play prevented:', e);
            showToast('Click the play button to start', 'info');
        });
    }

    function isHLSStream(url) {
        return url.includes('.m3u8') || url.includes('m3u8?');
    }

    // ===== PLAYBACK CONTROLS =====
    function togglePlayPause() {
        if (video.paused || video.ended) {
            video.play().catch(e => {
                console.error('Play failed:', e);
                showError('Playback failed. Try clicking the play button.');
            });
        } else {
            video.pause();
        }
    }

    function onPlay() {
        playPauseBtn.textContent = '⏸';
        isPlaying = true;
        hideLoader();
        hideControlsAfterDelay();
    }

    function onPause() {
        playPauseBtn.textContent = '▶';
        isPlaying = false;
        showControls();
    }

    function onEnded() {
        playPauseBtn.textContent = '▶';
        isPlaying = false;
        showControls();
    }

    // ===== VOLUME CONTROLS =====
    function toggleMute() {
        video.muted = !video.muted;
        updateMuteButton();
        updateVolumeSlider();
    }

    function handleVolumeChange(e) {
        const volume = e.target.value / 100;
        video.volume = volume;
        video.muted = (volume === 0);
        updateMuteButton();
    }

    function updateMuteButton() {
        muteBtn.textContent = video.muted || video.volume === 0 ? '🔇' : '🔊';
    }

    function updateVolumeSlider() {
        volumeSlider.value = video.muted ? 0 : video.volume * 100;
    }

    // ===== PROGRESS BAR =====
    function onTimeUpdate() {
        if (video.duration && !isNaN(video.duration)) {
            const percent = (video.currentTime / video.duration) * 100;
            progressSlider.value = percent;
            progressCurrent.style.width = percent + '%';
            
            currentTime.textContent = formatTime(video.currentTime);
            totalTime.textContent = formatTime(video.duration);
        }
    }

    function onProgress() {
        if (video.buffered.length > 0 && video.duration) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            const percent = (bufferedEnd / video.duration) * 100;
            progressBuffered.style.width = percent + '%';
        }
    }

    function handleProgressChange(e) {
        const percent = e.target.value;
        if (video.duration) {
            video.currentTime = (percent / 100) * video.duration;
        }
    }

    // ===== FULLSCREEN =====
    function toggleFullscreen() {
        const playerWrapper = video.parentElement;
        
        if (!isFullscreen) {
            if (playerWrapper.requestFullscreen) {
                playerWrapper.requestFullscreen();
            } else if (playerWrapper.webkitRequestFullscreen) {
                playerWrapper.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    function handleFullscreenChange() {
        isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
        showControls();
    }

    // ===== CONTROLS VISIBILITY =====
    function showControls() {
        controls.style.opacity = '1';
        
        if (controlsTimeout) {
            clearTimeout(controlsTimeout);
        }
        
        if (isPlaying) {
            controlsTimeout = setTimeout(() => {
                if (isPlaying && !isFullscreen) {
                    controls.style.opacity = '0';
                }
            }, 3000);
        }
    }

    function hideControlsAfterDelay() {
        if (controlsTimeout) {
            clearTimeout(controlsTimeout);
        }
        
        if (isPlaying && !isFullscreen) {
            controlsTimeout = setTimeout(() => {
                controls.style.opacity = '0';
            }, 3000);
        }
    }

    // ===== ERROR HANDLING =====
    function onVideoError() {
        console.error('Video error:', video.error);
        hideLoader();
        
        let errorMessage = 'Failed to load video';
        
        if (video.error) {
            switch(video.error.code) {
                case video.error.MEDIA_ERR_ABORTED:
                    errorMessage = 'Playback was aborted';
                    break;
                case video.error.MEDIA_ERR_NETWORK:
                    errorMessage = 'Network error loading video';
                    break;
                case video.error.MEDIA_ERR_DECODE:
                    errorMessage = 'Error decoding video';
                    break;
                case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorMessage = 'Video format not supported';
                    break;
            }
        }
        
        showError(errorMessage);
    }

    function onWaiting() {
        showLoader();
    }

    function onCanPlay() {
        hideLoader();
    }

    function onLoadedMetadata() {
        console.log('Video metadata loaded:', {
            duration: formatTime(video.duration),
            resolution: \`\${video.videoWidth}×\${video.videoHeight}\`
        });
    }

    // ===== UTILITY FUNCTIONS =====
    function showLoader() {
        loader.classList.remove('hidden');
    }

    function hideLoader() {
        loader.classList.add('hidden');
    }

    function showError(message) {
        errorText.textContent = message;
        errorMsg.classList.remove('hidden');
    }

    function hideError() {
        errorMsg.classList.add('hidden');
    }

    function clearPlayer() {
        if (hls) {
            hls.destroy();
            hls = null;
        }
        
        urlInput.value = '';
        video.pause();
        video.src = '';
        hideLoader();
        hideError();
        showToast('Cleared player', 'info');
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return \`\${mins.toString().padStart(2, '0')}:\${secs.toString().padStart(2, '0')}\`;
    }

    function showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.cssText = \`
            position: fixed;
            top: 20px;
            right: 20px;
            background: \${type === 'error' ? '#7f1d1d' : type === 'success' ? '#166534' : '#1e293b'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        \`;
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Initialize the player
    init();
});`;
}
