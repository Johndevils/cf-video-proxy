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
      
      // Random user agents
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
      ];
      
      const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      
      try {
        const response = await fetch(targetUrl, {
          headers: {
            'User-Agent': randomUserAgent,
            'Range': request.headers.get('Range') || '',
            'Referer': new URL(targetUrl).origin || '',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'identity',
            'Connection': 'keep-alive',
            'DNT': '1',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'video',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'cross-site'
          }
        });
        
        // Get the content type from response
        const contentType = response.headers.get('content-type') || '';
        const contentLength = response.headers.get('content-length') || '';
        
        // Forward the response with appropriate headers
        const headers = new Headers(response.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
        headers.set('Cache-Control', 'public, max-age=86400');
        
        // Set appropriate content-type if not present
        if (!contentType && targetUrl.includes('.m3u8')) {
          headers.set('Content-Type', 'application/vnd.apple.mpegurl');
        } else if (!contentType && (targetUrl.includes('.mp4') || contentLength > 1000000)) {
          headers.set('Content-Type', 'video/mp4');
        }
        
        return new Response(response.body, {
          status: response.status,
          headers: headers
        });
      } catch (error) {
        console.error('Proxy error:', error);
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

// HTML content with Tailwind CSS
function getHTML() {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Arsystream - Premium Video Player</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90' fill='%23DC2626'>▶</text></svg>">
    <style>
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 15px rgba(220, 38, 38, 0.6); }
            50% { box-shadow: 0 0 25px rgba(220, 38, 38, 0.9); }
        }
        
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes bounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .animate-fadeIn {
            animation: fadeIn 0.5s ease-out;
        }
        
        .animate-pulse-glow {
            animation: pulse-glow 2s ease-in-out infinite;
        }
        
        .animate-slideInRight {
            animation: slideInRight 0.3s ease-out;
        }
        
        .animate-bounce-once {
            animation: bounce 0.3s ease;
        }
        
        .animate-spin-slow {
            animation: spin 1s linear infinite;
        }
        
        .glass-effect {
            backdrop-filter: blur(10px);
            background: rgba(17, 24, 39, 0.8);
        }
        
        .gradient-red {
            background: linear-gradient(135deg, #dc2626, #991b1b, #7f1d1d);
        }
        
        .gradient-red-hover:hover {
            background: linear-gradient(135deg, #991b1b, #7f1d1d, #5c1a1a);
        }
        
        .text-glow {
            text-shadow: 0 0 10px rgba(220, 38, 38, 0.7);
        }
        
        .progress-slider {
            -webkit-appearance: none;
            appearance: none;
            background: transparent;
            cursor: pointer;
            width: 100%;
            height: 8px;
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            z-index: 30;
            opacity: 0;
        }
        
        .progress-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            height: 20px;
            width: 20px;
            background: #dc2626;
            border-radius: 50%;
            cursor: pointer;
            border: 3px solid white;
            box-shadow: 0 0 15px rgba(220, 38, 38, 0.8);
        }
        
        .volume-slider {
            -webkit-appearance: none;
            appearance: none;
            background: transparent;
            cursor: pointer;
            height: 6px;
            border-radius: 3px;
            background: rgba(255, 255, 255, 0.2);
        }
        
        .volume-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            height: 16px;
            width: 16px;
            background: #dc2626;
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 0 10px rgba(220, 38, 38, 0.6);
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
        }
        
        ::-webkit-scrollbar-track {
            background: rgba(31, 41, 55, 0.5);
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
            background: #dc2626;
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: #991b1b;
        }
        
        /* Hide default video controls */
        video::-webkit-media-controls {
            display: none !important;
        }
        
        /* Portrait to landscape hint */
        .orientation-hint {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            z-index: 9999;
            display: none;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }
        
        @media (orientation: portrait) and (max-width: 768px) {
            .orientation-hint.visible {
                display: flex;
            }
        }
    </style>
</head>
<body class="bg-gray-900 text-white min-h-screen">
    <!-- Portrait to Landscape Hint -->
    <div id="orientationHint" class="orientation-hint">
        <div class="text-center p-6">
            <div class="text-6xl mb-4 animate-bounce-once">
                <i class="fas fa-rotate-right text-red-500"></i>
            </div>
            <h2 class="text-2xl font-bold mb-2">Rotate Device</h2>
            <p class="text-gray-300 mb-4">Double tap screen or rotate to landscape for better viewing</p>
            <button onclick="toggleFullscreen()" class="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105">
                <i class="fas fa-expand mr-2"></i> Go Fullscreen
            </button>
        </div>
    </div>

    <!-- Toast Notification -->
    <div id="toast" class="fixed top-4 right-4 z-50 hidden">
        <div class="bg-gray-800 border-l-4 border-red-500 text-white p-4 rounded-r-lg shadow-lg max-w-md animate-slideInRight">
            <div class="flex items-center">
                <i id="toastIcon" class="fas fa-info-circle text-red-500 mr-3 text-xl"></i>
                <div>
                    <p id="toastMessage" class="font-medium">Notification message</p>
                    <p id="toastDetail" class="text-sm text-gray-300 mt-1"></p>
                </div>
                <button onclick="hideToast()" class="ml-4 text-gray-400 hover:text-white">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    </div>

    <!-- Main Container -->
    <div class="container mx-auto px-4 py-6 max-w-6xl">
        <!-- Header -->
        <header class="mb-8 animate-fadeIn">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between">
                <div class="mb-4 md:mb-0">
                    <h1 class="text-4xl font-bold text-red-500 tracking-wider">
                        <i class="fas fa-play-circle mr-2"></i>ARSYSTREAM
                    </h1>
                    <p class="text-gray-400 mt-1">
                        <i class="fas fa-bolt text-yellow-500 mr-1"></i> Paste. Play. Stream.
                    </p>
                </div>
                <div class="flex items-center space-x-3">
                    <button id="themeToggle" class="p-3 rounded-full bg-gray-800 hover:bg-gray-700 transition-all duration-300">
                        <i class="fas fa-moon text-xl"></i>
                    </button>
                    <button id="statsBtn" class="p-3 rounded-full bg-gray-800 hover:bg-gray-700 transition-all duration-300">
                        <i class="fas fa-chart-bar text-xl"></i>
                    </button>
                    <button onclick="showHelp()" class="p-3 rounded-full bg-gray-800 hover:bg-gray-700 transition-all duration-300">
                        <i class="fas fa-question-circle text-xl"></i>
                    </button>
                </div>
            </div>
        </header>

        <!-- URL Input Section -->
        <div class="glass-effect rounded-2xl p-6 mb-8 border border-gray-700 shadow-xl animate-fadeIn">
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-white mb-2">
                    <i class="fas fa-video mr-2 text-red-500"></i>Enter Video URL
                </h2>
                <p class="text-gray-400">Supports MP4, HLS, FSL CDN, and all streaming formats</p>
            </div>
            
            <div class="space-y-4">
                <div class="relative">
                    <input 
                        type="text" 
                        id="urlInput" 
                        class="w-full p-5 bg-gray-800 border-2 border-red-500/50 rounded-xl text-white placeholder-gray-500 text-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/30 transition-all duration-300"
                        placeholder="Paste your video URL here..."
                        autocomplete="off"
                        spellcheck="false"
                        value="https://hub.fsl-cdn-1.sbs/b0aeb5f1bd45b97ec0a61ecbce6a7c1b?token=1770618014"
                    >
                    <button onclick="pasteFromClipboard()" class="absolute right-3 top-1/2 transform -translate-y-1/2 p-3 text-gray-400 hover:text-white">
                        <i class="fas fa-paste text-xl"></i>
                    </button>
                </div>
                
                <div class="flex flex-wrap gap-3">
                    <button id="playBtn" onclick="loadVideo()" class="gradient-red text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex-1 min-w-[200px]">
                        <i class="fas fa-play mr-2"></i> Play Video
                    </button>
                    
                    <button id="clearBtn" onclick="clearPlayer()" class="bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 px-8 rounded-xl border border-gray-600 transition-all duration-300 transform hover:scale-105 flex-1 min-w-[150px]">
                        <i class="fas fa-trash-alt mr-2"></i> Clear
                    </button>
                    
                    <button onclick="showQuickExamples()" class="bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 px-8 rounded-xl border border-gray-600 transition-all duration-300 transform hover:scale-105 flex-1 min-w-[150px]">
                        <i class="fas fa-lightbulb mr-2"></i> Examples
                    </button>
                </div>
            </div>
            
            <!-- Format Options -->
            <div class="mt-6 pt-6 border-t border-gray-700">
                <h3 class="text-lg font-bold text-white mb-3">
                    <i class="fas fa-cogs mr-2 text-red-500"></i>Format Options
                </h3>
                <div class="flex flex-wrap gap-3">
                    <button onclick="loadVideo('auto')" class="flex items-center bg-gray-800 hover:bg-red-600/20 px-4 py-2 rounded-lg border border-gray-600 transition-all duration-300">
                        <i class="fas fa-robot text-red-500 mr-2"></i> Auto Detect
                    </button>
                    <button onclick="loadVideo('hls')" class="flex items-center bg-gray-800 hover:bg-red-600/20 px-4 py-2 rounded-lg border border-gray-600 transition-all duration-300">
                        <i class="fas fa-wave-square text-red-500 mr-2"></i> HLS Stream
                    </button>
                    <button onclick="loadVideo('mp4')" class="flex items-center bg-gray-800 hover:bg-red-600/20 px-4 py-2 rounded-lg border border-gray-600 transition-all duration-300">
                        <i class="fas fa-file-video text-red-500 mr-2"></i> MP4 Video
                    </button>
                </div>
            </div>
        </div>

        <!-- Video Player -->
        <div class="relative bg-black rounded-2xl overflow-hidden shadow-2xl mb-8 animate-fadeIn">
            <!-- Video Container -->
            <div id="videoContainer" class="relative w-full aspect-video bg-gray-950">
                <!-- Loading Spinner -->
                <div id="loader" class="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 hidden">
                    <div class="w-20 h-20 border-4 border-gray-800 border-t-red-500 rounded-full animate-spin-slow mb-6"></div>
                    <p class="text-xl font-bold text-white mb-2">Loading Video</p>
                    <p id="loadStatus" class="text-gray-400">Initializing player...</p>
                    <div class="mt-6 flex space-x-2">
                        <div class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <div class="w-3 h-3 bg-red-500 rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
                        <div class="w-3 h-3 bg-red-500 rounded-full animate-pulse" style="animation-delay: 0.4s"></div>
                    </div>
                </div>
                
                <!-- Video Element -->
                <video 
                    id="videoPlayer"
                    class="w-full h-full"
                    preload="auto"
                    playsinline
                    webkit-playsinline
                    crossorigin="anonymous"
                ></video>
                
                <!-- Error Message -->
                <div id="errorMsg" class="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-30 hidden">
                    <div class="text-6xl text-red-500 mb-6">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <p id="errorText" class="text-2xl font-bold text-white mb-4 text-center px-6">Failed to load video</p>
                    <p class="text-gray-400 mb-8 text-center px-6">Please check the URL and try again</p>
                    <div class="flex flex-wrap gap-4 justify-center">
                        <button onclick="loadVideo()" class="gradient-red text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105">
                            <i class="fas fa-redo mr-2"></i> Retry
                        </button>
                        <button onclick="showDebugInfo()" class="bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-full border border-gray-600 transition-all duration-300 transform hover:scale-105">
                            <i class="fas fa-bug mr-2"></i> Debug Info
                        </button>
                    </div>
                </div>
                
                <!-- Video Overlay for Double Tap -->
                <div id="videoOverlay" class="absolute inset-0 z-10"></div>
                
                <!-- Double Tap Hint -->
                <div id="doubleTapHint" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-6 py-3 rounded-full text-sm font-bold hidden">
                    Double tap to skip 10 seconds
                </div>
                
                <!-- Custom Controls -->
                <div id="controls" class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-5 pt-10 transition-all duration-300 z-20">
                    <!-- Progress Bar -->
                    <div class="mb-6">
                        <div class="relative h-2 bg-gray-700 rounded-full mb-2">
                            <div id="progressBuffered" class="absolute h-full bg-gray-600 rounded-full"></div>
                            <div id="progressCurrent" class="absolute h-full gradient-red rounded-full"></div>
                            <input type="range" id="progressSlider" min="0" max="100" value="0" class="progress-slider">
                            <div id="progressHandle" class="absolute w-4 h-4 bg-white rounded-full shadow-lg -translate-y-1/2 hidden"></div>
                        </div>
                        <div class="flex justify-between text-sm text-gray-300 font-mono">
                            <span id="currentTime">00:00</span>
                            <span id="totalTime">00:00</span>
                        </div>
                    </div>
                    
                    <!-- Control Buttons -->
                    <div class="flex items-center justify-between">
                        <!-- Left Controls -->
                        <div class="flex items-center space-x-4">
                            <!-- Skip Backward Button -->
                            <button id="skipBackBtn" onclick="skipBackward()" class="control-btn-skip bg-gray-800/80 hover:bg-red-600/80 p-4 rounded-full transition-all duration-300 transform hover:scale-110 group">
                                <i class="fas fa-backward-step text-2xl"></i>
                                <span class="control-tooltip">Skip -10s</span>
                            </button>
                            
                            <!-- Previous Button (for playlists) -->
                            <button id="prevBtn" onclick="playPrevious()" class="control-btn-prev bg-gray-800/80 hover:bg-red-600/80 p-4 rounded-full transition-all duration-300 transform hover:scale-110 group" disabled>
                                <i class="fas fa-backward-fast text-2xl"></i>
                                <span class="control-tooltip">Previous</span>
                            </button>
                            
                            <!-- Play/Pause Button -->
                            <button id="playPauseBtn" onclick="togglePlayPause()" class="control-btn-play gradient-red p-6 rounded-full transition-all duration-300 transform hover:scale-110 animate-pulse-glow group">
                                <i id="playIcon" class="fas fa-play text-3xl"></i>
                                <span class="control-tooltip">Play/Pause</span>
                            </button>
                            
                            <!-- Next Button (for playlists) -->
                            <button id="nextBtn" onclick="playNext()" class="control-btn-next bg-gray-800/80 hover:bg-red-600/80 p-4 rounded-full transition-all duration-300 transform hover:scale-110 group" disabled>
                                <i class="fas fa-forward-fast text-2xl"></i>
                                <span class="control-tooltip">Next</span>
                            </button>
                            
                            <!-- Skip Forward Button -->
                            <button id="skipForwardBtn" onclick="skipForward()" class="control-btn-skip bg-gray-800/80 hover:bg-red-600/80 p-4 rounded-full transition-all duration-300 transform hover:scale-110 group">
                                <i class="fas fa-forward-step text-2xl"></i>
                                <span class="control-tooltip">Skip +10s</span>
                            </button>
                        </div>
                        
                        <!-- Right Controls -->
                        <div class="flex items-center space-x-6">
                            <!-- Volume Control -->
                            <div class="flex items-center space-x-3 group">
                                <button id="muteBtn" onclick="toggleMute()" class="control-btn-volume bg-gray-800/80 hover:bg-red-600/80 p-4 rounded-full transition-all duration-300 transform hover:scale-110">
                                    <i id="volumeIcon" class="fas fa-volume-high text-2xl"></i>
                                    <span class="control-tooltip">Mute/Unmute</span>
                                </button>
                                <div class="volume-slider-container hidden group-hover:block">
                                    <input type="range" id="volumeSlider" min="0" max="100" value="100" class="volume-slider w-32">
                                </div>
                            </div>
                            
                            <!-- Speed Control -->
                            <div class="relative group">
                                <button onclick="toggleSpeedMenu()" class="control-btn-speed bg-gray-800/80 hover:bg-red-600/80 p-4 rounded-full transition-all duration-300 transform hover:scale-110">
                                    <i class="fas fa-gauge-high text-2xl"></i>
                                    <span id="speedText" class="text-xs absolute -bottom-1 -right-1 bg-red-500 rounded-full w-6 h-6 flex items-center justify-center">1x</span>
                                    <span class="control-tooltip">Playback Speed</span>
                                </button>
                                <div id="speedMenu" class="absolute bottom-full right-0 mb-2 bg-gray-800 rounded-lg shadow-xl hidden">
                                    <button onclick="setSpeed(0.25)" class="speed-option block w-full px-4 py-2 text-left hover:bg-red-600/50 rounded-t-lg">0.25x</button>
                                    <button onclick="setSpeed(0.5)" class="speed-option block w-full px-4 py-2 text-left hover:bg-red-600/50">0.5x</button>
                                    <button onclick="setSpeed(0.75)" class="speed-option block w-full px-4 py-2 text-left hover:bg-red-600/50">0.75x</button>
                                    <button onclick="setSpeed(1)" class="speed-option block w-full px-4 py-2 text-left hover:bg-red-600/50">1x (Normal)</button>
                                    <button onclick="setSpeed(1.25)" class="speed-option block w-full px-4 py-2 text-left hover:bg-red-600/50">1.25x</button>
                                    <button onclick="setSpeed(1.5)" class="speed-option block w-full px-4 py-2 text-left hover:bg-red-600/50">1.5x</button>
                                    <button onclick="setSpeed(2)" class="speed-option block w-full px-4 py-2 text-left hover:bg-red-600/50 rounded-b-lg">2x</button>
                                </div>
                            </div>
                            
                            <!-- Fullscreen Button -->
                            <button id="fullscreenBtn" onclick="toggleFullscreen()" class="control-btn-fullscreen bg-gray-800/80 hover:bg-red-600/80 p-4 rounded-full transition-all duration-300 transform hover:scale-110 group">
                                <i id="fullscreenIcon" class="fas fa-expand text-2xl"></i>
                                <span class="control-tooltip">Fullscreen</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Top Info Bar -->
                <div id="topInfo" class="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-10">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center space-x-3">
                            <span id="videoTitle" class="text-white font-bold truncate max-w-xs">Arsystream Video Player</span>
                            <span id="videoResolution" class="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">Loading...</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span id="formatBadge" class="text-xs bg-gray-800 text-gray-300 px-3 py-1 rounded-full">Auto</span>
                            <button onclick="toggleControls()" class="text-gray-400 hover:text-white">
                                <i class="fas fa-eye-slash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Debug Panel -->
        <div id="debugPanel" class="glass-effect rounded-2xl p-6 mb-8 border border-gray-700 hidden">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-white">
                    <i class="fas fa-bug text-red-500 mr-2"></i>Debug Information
                </h3>
                <button onclick="toggleDebugPanel()" class="text-gray-400 hover:text-white">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-gray-800/50 p-4 rounded-lg">
                    <h4 class="font-bold text-gray-300 mb-2">Video Info</h4>
                    <p><span class="text-gray-400">URL:</span> <span id="debugUrl" class="text-sm break-all">-</span></p>
                    <p><span class="text-gray-400">Format:</span> <span id="debugFormat" class="text-red-300">Auto</span></p>
                    <p><span class="text-gray-400">Resolution:</span> <span id="debugResolution">-</span></p>
                    <p><span class="text-gray-400">Duration:</span> <span id="debugDuration">00:00</span></p>
                </div>
                <div class="bg-gray-800/50 p-4 rounded-lg">
                    <h4 class="font-bold text-gray-300 mb-2">Status</h4>
                    <p><span class="text-gray-400">User Agent:</span> <span id="debugUserAgent" class="text-xs break-all">-</span></p>
                    <p><span class="text-gray-400">Buffered:</span> <span id="debugBuffered">0%</span></p>
                    <p><span class="text-gray-400">Volume:</span> <span id="debugVolume">100%</span></p>
                    <p><span class="text-gray-400">Speed:</span> <span id="debugSpeed">1x</span></p>
                </div>
            </div>
        </div>

        <!-- Quick Examples -->
        <div id="examplesPanel" class="glass-effect rounded-2xl p-6 mb-8 border border-gray-700 hidden">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-white">
                    <i class="fas fa-lightbulb text-yellow-500 mr-2"></i>Quick Examples
                </h3>
                <button onclick="toggleExamplesPanel()" class="text-gray-400 hover:text-white">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onclick="loadExample('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4')" class="p-4 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-600 transition-all duration-300">
                    <div class="flex items-center mb-2">
                        <i class="fas fa-file-video text-red-500 mr-2"></i>
                        <span class="font-bold">Sample MP4</span>
                    </div>
                    <p class="text-sm text-gray-400">High quality test video</p>
                </button>
                <button onclick="loadExample('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8')" class="p-4 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-600 transition-all duration-300">
                    <div class="flex items-center mb-2">
                        <i class="fas fa-wave-square text-red-500 mr-2"></i>
                        <span class="font-bold">HLS Stream</span>
                    </div>
                    <p class="text-sm text-gray-400">Adaptive bitrate streaming</p>
                </button>
                <button onclick="loadExample('https://hub.fsl-cdn-1.sbs/b0aeb5f1bd45b97ec0a61ecbce6a7c1b?token=1770618014')" class="p-4 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-600 transition-all duration-300">
                    <div class="flex items-center mb-2">
                        <i class="fas fa-server text-red-500 mr-2"></i>
                        <span class="font-bold">FSL CDN</span>
                    </div>
                    <p class="text-sm text-gray-400">Token-authenticated stream</p>
                </button>
            </div>
        </div>

        <!-- Keyboard Shortcuts -->
        <div class="glass-effect rounded-2xl p-6 border border-gray-700">
            <h3 class="text-2xl font-bold text-white mb-6">
                <i class="fas fa-keyboard text-red-500 mr-2"></i>Keyboard Shortcuts
            </h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="text-center p-4 bg-gray-800/50 rounded-xl">
                    <div class="text-3xl text-red-500 mb-2">
                        <i class="fas fa-space-awesome"></i>
                    </div>
                    <p class="font-bold">Space</p>
                    <p class="text-sm text-gray-400">Play/Pause</p>
                </div>
                <div class="text-center p-4 bg-gray-800/50 rounded-xl">
                    <div class="text-3xl text-red-500 mb-2">
                        <i class="fas fa-arrows-left-right"></i>
                    </div>
                    <p class="font-bold">← →</p>
                    <p class="text-sm text-gray-400">Skip 10s</p>
                </div>
                <div class="text-center p-4 bg-gray-800/50 rounded-xl">
                    <div class="text-3xl text-red-500 mb-2">
                        <i class="fas fa-volume-high"></i>
                    </div>
                    <p class="font-bold">M</p>
                    <p class="text-sm text-gray-400">Mute/Unmute</p>
                </div>
                <div class="text-center p-4 bg-gray-800/50 rounded-xl">
                    <div class="text-3xl text-red-500 mb-2">
                        <i class="fas fa-expand"></i>
                    </div>
                    <p class="font-bold">F</p>
                    <p class="text-sm text-gray-400">Fullscreen</p>
                </div>
            </div>
            <p class="text-center text-gray-400 mt-6">
                <i class="fas fa-mobile-alt mr-2"></i>On mobile: Double tap screen to skip or rotate
            </p>
        </div>
    </div>

    <!-- Footer -->
    <footer class="mt-12 py-6 border-t border-gray-800">
        <div class="container mx-auto px-4 text-center">
            <p class="text-gray-400">
                <i class="fas fa-heart text-red-500 mr-1"></i> Arsystream v2.0 • Premium Video Player
            </p>
            <p class="text-sm text-gray-500 mt-2">Supports all video formats • Multi-User Agent • Touch Controls</p>
        </div>
    </footer>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <script>
        // ===== GLOBAL VARIABLES =====
        let video = null;
        let hls = null;
        let playlist = [];
        let currentIndex = 0;
        let isFullscreen = false;
        let controlsTimeout = null;
        let isPlaying = false;
        let currentFormat = 'auto';
        let playbackRate = 1.0;
        let lastTapTime = 0;
        let isDoubleTap = false;
        let userAgent = navigator.userAgent;
        let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        // ===== DOM ELEMENTS =====
        function getElements() {
            return {
                video: document.getElementById('videoPlayer'),
                urlInput: document.getElementById('urlInput'),
                playBtn: document.getElementById('playBtn'),
                playPauseBtn: document.getElementById('playPauseBtn'),
                playIcon: document.getElementById('playIcon'),
                skipBackBtn: document.getElementById('skipBackBtn'),
                skipForwardBtn: document.getElementById('skipForwardBtn'),
                prevBtn: document.getElementById('prevBtn'),
                nextBtn: document.getElementById('nextBtn'),
                muteBtn: document.getElementById('muteBtn'),
                volumeIcon: document.getElementById('volumeIcon'),
                volumeSlider: document.getElementById('volumeSlider'),
                fullscreenBtn: document.getElementById('fullscreenBtn'),
                fullscreenIcon: document.getElementById('fullscreenIcon'),
                speedText: document.getElementById('speedText'),
                progressSlider: document.getElementById('progressSlider'),
                progressCurrent: document.getElementById('progressCurrent'),
                progressBuffered: document.getElementById('progressBuffered'),
                progressHandle: document.getElementById('progressHandle'),
                currentTime: document.getElementById('currentTime'),
                totalTime: document.getElementById('totalTime'),
                videoTitle: document.getElementById('videoTitle'),
                videoResolution: document.getElementById('videoResolution'),
                formatBadge: document.getElementById('formatBadge'),
                loader: document.getElementById('loader'),
                loadStatus: document.getElementById('loadStatus'),
                errorMsg: document.getElementById('errorMsg'),
                errorText: document.getElementById('errorText'),
                controls: document.getElementById('controls'),
                topInfo: document.getElementById('topInfo'),
                debugPanel: document.getElementById('debugPanel'),
                examplesPanel: document.getElementById('examplesPanel'),
                debugUrl: document.getElementById('debugUrl'),
                debugFormat: document.getElementById('debugFormat'),
                debugResolution: document.getElementById('debugResolution'),
                debugDuration: document.getElementById('debugDuration'),
                debugUserAgent: document.getElementById('debugUserAgent'),
                debugBuffered: document.getElementById('debugBuffered'),
                debugVolume: document.getElementById('debugVolume'),
                debugSpeed: document.getElementById('debugSpeed'),
                toast: document.getElementById('toast'),
                toastMessage: document.getElementById('toastMessage'),
                toastDetail: document.getElementById('toastDetail'),
                toastIcon: document.getElementById('toastIcon'),
                orientationHint: document.getElementById('orientationHint'),
                doubleTapHint: document.getElementById('doubleTapHint'),
                videoOverlay: document.getElementById('videoOverlay')
            };
        }
        
        // ===== INITIALIZATION =====
        document.addEventListener('DOMContentLoaded', () => {
            const el = getElements();
            video = el.video;
            
            // Initialize volume
            video.volume = 1;
            
            // Setup event listeners
            setupEventListeners();
            setupKeyboardShortcuts();
            setupTouchEvents();
            
            // Show welcome message
            setTimeout(() => {
                showToast('Welcome to Arsystream!', 'Ready to play videos', 'info');
            }, 1000);
            
            // Update debug info
            updateDebugInfo();
            
            console.log('🚀 Arsystream Premium v2.0 initialized');
        });
        
        // ===== EVENT LISTENERS =====
        function setupEventListeners() {
            const el = getElements();
            
            // Volume slider
            el.volumeSlider.addEventListener('input', (e) => {
                const volume = e.target.value / 100;
                video.volume = volume;
                updateVolumeIcon();
                updateDebugInfo();
            });
            
            // Progress slider
            el.progressSlider.addEventListener('input', (e) => {
                const percent = e.target.value;
                if (video.duration) {
                    video.currentTime = (percent / 100) * video.duration;
                }
            });
            
            // Video events
            video.addEventListener('play', onPlay);
            video.addEventListener('pause', onPause);
            video.addEventListener('timeupdate', onTimeUpdate);
            video.addEventListener('progress', onProgress);
            video.addEventListener('ended', onEnded);
            video.addEventListener('waiting', onWaiting);
            video.addEventListener('canplay', onCanPlay);
            video.addEventListener('loadedmetadata', onLoadedMetadata);
            video.addEventListener('error', onVideoError);
            video.addEventListener('volumechange', onVolumeChange);
            video.addEventListener('ratechange', onRateChange);
            
            // Fullscreen events
            document.addEventListener('fullscreenchange', handleFullscreenChange);
            document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
            
            // Mouse events for controls auto-hide
            video.parentElement.addEventListener('mousemove', showControls);
            video.parentElement.addEventListener('mouseleave', hideControlsAfterDelay);
            
            // Theme toggle
            document.getElementById('themeToggle').addEventListener('click', toggleTheme);
            
            // Stats button
            document.getElementById('statsBtn').addEventListener('click', () => {
                toggleDebugPanel();
            });
        }
        
        function setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Don't trigger when typing in inputs
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                
                // Don't trigger if Ctrl/Cmd is pressed
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
                    case 'arrowleft': // ← - Skip backward
                        e.preventDefault();
                        skipBackward();
                        break;
                    case 'arrowright': // → - Skip forward
                        e.preventDefault();
                        skipForward();
                        break;
                    case 'arrowup': // ↑ - Volume up
                        e.preventDefault();
                        video.volume = Math.min(video.volume + 0.1, 1);
                        updateVolumeSlider();
                        break;
                    case 'arrowdown': // ↓ - Volume down
                        e.preventDefault();
                        video.volume = Math.max(video.volume - 0.1, 0);
                        updateVolumeSlider();
                        break;
                    case 'd': // D - Debug panel
                        e.preventDefault();
                        toggleDebugPanel();
                        break;
                    case 'e': // E - Examples
                        e.preventDefault();
                        toggleExamplesPanel();
                        break;
                    case '0': case '1': case '2': case '3': case '4':
                    case '5': case '6': case '7': case '8': case '9':
                        // Jump to percentage
                        const percentage = parseInt(e.key) / 10;
                        if (video.duration) {
                            video.currentTime = video.duration * percentage;
                        }
                        break;
                }
            });
        }
        
        function setupTouchEvents() {
            const el = getElements();
            let touchStartX = 0;
            let touchStartY = 0;
            let touchEndX = 0;
            let touchEndY = 0;
            let lastTap = 0;
            
            // Double tap detection
            el.videoOverlay.addEventListener('touchstart', (e) => {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTap;
                
                if (tapLength < 300 && tapLength > 0) {
                    // Double tap detected
                    isDoubleTap = true;
                    
                    // Determine tap position for skip direction
                    const tapX = e.touches[0].clientX;
                    const screenWidth = window.innerWidth;
                    
                    if (tapX < screenWidth / 2) {
                        // Left side - skip backward
                        skipBackward();
                        showDoubleTapHint('-10s');
                    } else {
                        // Right side - skip forward
                        skipForward();
                        showDoubleTapHint('+10s');
                    }
                    
                    // Prevent default
                    e.preventDefault();
                }
                
                lastTap = currentTime;
                
                // Store touch start position for swipe detection
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            });
            
            el.videoOverlay.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].clientX;
                touchEndY = e.changedTouches[0].clientY;
                
                // Check for swipe gestures
                handleSwipeGesture();
                
                // Single tap - toggle play/pause
                if (!isDoubleTap) {
                    setTimeout(() => {
                        if (!isDoubleTap) {
                            togglePlayPause();
                        }
                    }, 300);
                }
                
                // Reset double tap flag
                setTimeout(() => {
                    isDoubleTap = false;
                }, 500);
            });
            
            // Show orientation hint on mobile portrait
            function checkOrientation() {
                const el = getElements();
                if (isMobile && window.innerHeight > window.innerWidth) {
                    el.orientationHint.classList.add('visible');
                } else {
                    el.orientationHint.classList.remove('visible');
                }
            }
            
            window.addEventListener('resize', checkOrientation);
            window.addEventListener('orientationchange', checkOrientation);
            checkOrientation();
        }
        
        function handleSwipeGesture() {
            const el = getElements();
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            
            // Minimum swipe distance
            const minSwipeDistance = 50;
            
            // Horizontal swipe (left/right) - volume control
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX > 0) {
                    // Swipe right - volume up
                    video.volume = Math.min(video.volume + 0.1, 1);
                    showToast(\`Volume: \${Math.round(video.volume * 100)}%\`, 'Swipe right detected', 'info');
                } else {
                    // Swipe left - volume down
                    video.volume = Math.max(video.volume - 0.1, 0);
                    showToast(\`Volume: \${Math.round(video.volume * 100)}%\`, 'Swipe left detected', 'info');
                }
                updateVolumeSlider();
                updateVolumeIcon();
            }
            
            // Vertical swipe (up/down) - brightness would go here (if implemented)
        }
        
        // ===== VIDEO PLAYBACK CONTROLS =====
        function togglePlayPause() {
            const el = getElements();
            if (video.paused || video.ended) {
                video.play().catch(e => {
                    console.error('Play failed:', e);
                    showToast('Playback failed', 'Click the play button', 'error');
                });
                el.playIcon.className = 'fas fa-pause text-3xl';
            } else {
                video.pause();
                el.playIcon.className = 'fas fa-play text-3xl';
            }
        }
        
        function onPlay() {
            const el = getElements();
            el.playIcon.className = 'fas fa-pause text-3xl';
            isPlaying = true;
            hideLoader();
            hideControlsAfterDelay();
            updateDebugInfo();
        }
        
        function onPause() {
            const el = getElements();
            el.playIcon.className = 'fas fa-play text-3xl';
            isPlaying = false;
            showControls();
            updateDebugInfo();
        }
        
        function onEnded() {
            const el = getElements();
            el.playIcon.className = 'fas fa-play text-3xl';
            isPlaying = false;
            showControls();
            showToast('Playback completed', 'Video has ended', 'info');
        }
        
        function skipBackward() {
            video.currentTime = Math.max(0, video.currentTime - 10);
            showToast('Skipped -10s', \`Now at \${formatTime(video.currentTime)}\`, 'info');
        }
        
        function skipForward() {
            video.currentTime = Math.min(video.duration, video.currentTime + 10);
            showToast('Skipped +10s', \`Now at \${formatTime(video.currentTime)}\`, 'info');
        }
        
        function playPrevious() {
            if (playlist.length > 1 && currentIndex > 0) {
                currentIndex--;
                loadVideoFromPlaylist();
            }
        }
        
        function playNext() {
            if (playlist.length > 1 && currentIndex < playlist.length - 1) {
                currentIndex++;
                loadVideoFromPlaylist();
            }
        }
        
        function loadVideoFromPlaylist() {
            const el = getElements();
            el.urlInput.value = playlist[currentIndex];
            loadVideo();
        }
        
        // ===== VOLUME CONTROLS =====
        function toggleMute() {
            const el = getElements();
            video.muted = !video.muted;
            updateVolumeIcon();
            updateVolumeSlider();
            updateDebugInfo();
            
            if (video.muted) {
                showToast('Volume muted', 'Click to unmute', 'info');
            } else {
                showToast(\`Volume: \${Math.round(video.volume * 100)}%\`, 'Sound unmuted', 'info');
            }
        }
        
        function updateVolumeIcon() {
            const el = getElements();
            if (video.muted || video.volume === 0) {
                el.volumeIcon.className = 'fas fa-volume-mute text-2xl';
            } else if (video.volume < 0.5) {
                el.volumeIcon.className = 'fas fa-volume-low text-2xl';
            } else {
                el.volumeIcon.className = 'fas fa-volume-high text-2xl';
            }
        }
        
        function updateVolumeSlider() {
            const el = getElements();
            el.volumeSlider.value = video.muted ? 0 : video.volume * 100;
        }
        
        function onVolumeChange() {
            updateVolumeIcon();
            updateVolumeSlider();
            updateDebugInfo();
        }
        
        // ===== PLAYBACK SPEED =====
        function toggleSpeedMenu() {
            const el = getElements();
            el.speedMenu.classList.toggle('hidden');
        }
        
        function setSpeed(speed) {
            const el = getElements();
            video.playbackRate = speed;
            playbackRate = speed;
            el.speedText.textContent = speed + 'x';
            el.speedMenu.classList.add('hidden');
            showToast(\`Speed: \${speed}x\`, 'Playback rate changed', 'info');
            updateDebugInfo();
        }
        
        function onRateChange() {
            const el = getElements();
            playbackRate = video.playbackRate;
            el.speedText.textContent = playbackRate + 'x';
            updateDebugInfo();
        }
        
        // ===== PROGRESS BAR =====
        function onTimeUpdate() {
            const el = getElements();
            if (video.duration && !isNaN(video.duration)) {
                const percent = (video.currentTime / video.duration) * 100;
                el.progressSlider.value = percent;
                el.progressCurrent.style.width = percent + '%';
                
                el.currentTime.textContent = formatTime(video.currentTime);
                el.totalTime.textContent = formatTime(video.duration);
                
                // Show progress handle on hover
                el.progressHandle.style.left = percent + '%';
                
                updateDebugInfo();
            }
        }
        
        function onProgress() {
            const el = getElements();
            if (video.buffered.length > 0 && video.duration) {
                const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                const percent = (bufferedEnd / video.duration) * 100;
                el.progressBuffered.style.width = percent + '%';
                el.debugBuffered.textContent = Math.round(percent) + '%';
            }
        }
        
        // ===== FULLSCREEN =====
        function toggleFullscreen() {
            const el = getElements();
            const container = el.video.parentElement;
            
            if (!isFullscreen) {
                if (container.requestFullscreen) {
                    container.requestFullscreen();
                } else if (container.webkitRequestFullscreen) {
                    container.webkitRequestFullscreen();
                } else if (container.mozRequestFullScreen) {
                    container.mozRequestFullScreen();
                } else if (container.msRequestFullscreen) {
                    container.msRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
            }
        }
        
        function handleFullscreenChange() {
            const el = getElements();
            isFullscreen = !!(document.fullscreenElement || 
                             document.webkitFullscreenElement || 
                             document.mozFullScreenElement || 
                             document.msFullscreenElement);
            
            if (isFullscreen) {
                el.fullscreenIcon.className = 'fas fa-compress text-2xl';
                showToast('Entered fullscreen', 'Press F or ESC to exit', 'info');
                
                // On mobile, lock to landscape in fullscreen
                if (isMobile) {
                    screen.orientation.lock('landscape').catch(() => {
                        // Orientation lock not supported
                    });
                }
            } else {
                el.fullscreenIcon.className = 'fas fa-expand text-2xl';
                
                // On mobile, unlock orientation
                if (isMobile) {
                    screen.orientation.unlock();
                }
            }
            
            showControls();
        }
        
        // ===== CONTROLS VISIBILITY =====
        function showControls() {
            const el = getElements();
            el.controls.style.opacity = '1';
            el.topInfo.style.opacity = '1';
            
            if (controlsTimeout) {
                clearTimeout(controlsTimeout);
            }
            
            if (isPlaying) {
                controlsTimeout = setTimeout(() => {
                    if (isPlaying && !isFullscreen) {
                        el.controls.style.opacity = '0';
                        el.topInfo.style.opacity = '0';
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
                    const el = getElements();
                    el.controls.style.opacity = '0';
                    el.topInfo.style.opacity = '0';
                }, 3000);
            }
        }
        
        function toggleControls() {
            const el = getElements();
            if (el.controls.style.opacity === '0') {
                showControls();
            } else {
                el.controls.style.opacity = '0';
                el.topInfo.style.opacity = '0';
            }
        }
        
        // ===== VIDEO LOADING =====
        function loadVideo(format = 'auto') {
            const el = getElements();
            const url = el.urlInput.value.trim();
            
            if (!url) {
                showToast('Please enter a URL', 'Input is empty', 'error');
                el.urlInput.focus();
                return;
            }
            
            // Clean up previous HLS instance
            if (hls) {
                hls.destroy();
                hls = null;
            }
            
            // Show loading state
            el.loader.classList.remove('hidden');
            el.errorMsg.classList.add('hidden');
            showControls();
            
            // Determine format
            currentFormat = format;
            if (format === 'auto') {
                currentFormat = detectFormat(url);
            }
            
            // Update UI
            el.formatBadge.textContent = currentFormat.toUpperCase();
            el.videoTitle.textContent = extractVideoTitle(url);
            el.loadStatus.textContent = \`Loading as \${currentFormat.toUpperCase()}...\`;
            
            // Update debug info
            el.debugUrl.textContent = url.length > 50 ? url.substring(0, 50) + '...' : url;
            el.debugFormat.textContent = currentFormat.toUpperCase();
            
            try {
                if (currentFormat === 'hls') {
                    loadHLSVideo(url);
                } else {
                    loadNativeVideo(url);
                }
            } catch (error) {
                console.error('Failed to load video:', error);
                showError(\`Failed to load as \${currentFormat.toUpperCase()}\`);
                el.loader.classList.add('hidden');
            }
        }
        
        function detectFormat(url) {
            // Check for HLS
            if (url.includes('.m3u8') || url.includes('m3u8?')) {
                return 'hls';
            }
            
            // Check for MP4
            if (url.includes('.mp4') || url.includes('mp4?')) {
                return 'mp4';
            }
            
            // Check for FSL CDN (usually MP4 with tokens)
            if (url.includes('hub.fsl-cdn-1.sbs') || url.includes('fsl-cdn')) {
                return 'mp4';
            }
            
            // Default to MP4 for token URLs
            if (url.includes('token=')) {
                return 'mp4';
            }
            
            return 'mp4'; // Default fallback
        }
        
        function extractVideoTitle(url) {
            try {
                const urlObj = new URL(url);
                const path = urlObj.pathname;
                const filename = path.split('/').pop();
                return filename || urlObj.hostname;
            } catch {
                return url.substring(0, 30) + (url.length > 30 ? '...' : '');
            }
        }
        
        function loadHLSVideo(url) {
            const el = getElements();
            
            if (typeof Hls === 'undefined') {
                showError('HLS.js library not loaded');
                el.loader.classList.add('hidden');
                return;
            }
            
            if (Hls.isSupported()) {
                hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90,
                    maxBufferLength: 30,
                    maxMaxBufferLength: 600,
                    maxBufferSize: 60 * 1000 * 1000,
                    debug: false
                });
                
                hls.loadSource(url);
                hls.attachMedia(video);
                
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    el.loadStatus.textContent = 'HLS manifest loaded';
                    video.play().catch(e => {
                        console.warn('Auto-play prevented:', e);
                        el.loadStatus.textContent = 'Click play button to start';
                    });
                });
                
                hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error('HLS error:', data);
                    if (data.fatal) {
                        showError('HLS stream error');
                        hls.destroy();
                        // Try MP4 as fallback
                        loadVideo('mp4');
                    }
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS support (Safari)
                video.src = url;
                video.load();
                video.play().catch(e => {
                    console.warn('Auto-play prevented:', e);
                    el.loadStatus.textContent = 'Click play button to start';
                });
            } else {
                showError('HLS not supported in this browser');
                el.loader.classList.add('hidden');
            }
        }
        
        function loadNativeVideo(url) {
            const el = getElements();
            
            // Use proxy for better compatibility
            const proxyUrl = \`/api/proxy?url=\${encodeURIComponent(url)}\`;
            
            video.src = proxyUrl;
            video.load();
            
            video.play().catch(e => {
                console.warn('Auto-play prevented:', e);
                el.loadStatus.textContent = 'Click play button to start';
            });
        }
        
        // ===== ERROR HANDLING =====
        function onVideoError() {
            const el = getElements();
            console.error('Video error:', video.error);
            el.loader.classList.add('hidden');
            
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
        
        function showError(message) {
            const el = getElements();
            el.errorText.textContent = message;
            el.errorMsg.classList.remove('hidden');
            el.loader.classList.add('hidden');
            showToast('Error loading video', message, 'error');
            updateDebugInfo('status', 'Error: ' + message);
        }
        
        function onWaiting() {
            const el = getElements();
            el.loader.classList.remove('hidden');
            el.loadStatus.textContent = 'Buffering...';
        }
        
        function onCanPlay() {
            const el = getElements();
            el.loader.classList.add('hidden');
            el.loadStatus.textContent = 'Ready to play';
        }
        
        function onLoadedMetadata() {
            const el = getElements();
            el.videoResolution.textContent = \`\${video.videoWidth}×\${video.videoHeight}\`;
            el.debugResolution.textContent = \`\${video.videoWidth}×\${video.videoHeight}\`;
            el.debugDuration.textContent = formatTime(video.duration);
            updateDebugInfo('status', 'Loaded');
            
            console.log('Video metadata:', {
                duration: formatTime(video.duration),
                resolution: \`\${video.videoWidth}×\${video.videoHeight}\`,
                format: currentFormat
            });
        }
        
        // ===== UTILITY FUNCTIONS =====
        function formatTime(seconds) {
            if (isNaN(seconds)) return '00:00';
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            
            if (hours > 0) {
                return \`\${hours.toString().padStart(2, '0')}:\${mins.toString().padStart(2, '0')}:\${secs.toString().padStart(2, '0')}\`;
            }
            return \`\${mins.toString().padStart(2, '0')}:\${secs.toString().padStart(2, '0')}\`;
        }
        
        function clearPlayer() {
            const el = getElements();
            if (hls) {
                hls.destroy();
                hls = null;
            }
            
            el.urlInput.value = '';
            video.pause();
            video.src = '';
            el.loader.classList.add('hidden');
            el.errorMsg.classList.add('hidden');
            el.progressCurrent.style.width = '0%';
            el.currentTime.textContent = '00:00';
            el.totalTime.textContent = '00:00';
            el.videoTitle.textContent = 'Arsystream Video Player';
            el.videoResolution.textContent = 'Loading...';
            el.formatBadge.textContent = 'Auto';
            
            showToast('Player cleared', 'Ready for new URL', 'info');
        }
        
        function pasteFromClipboard() {
            const el = getElements();
            navigator.clipboard.readText()
                .then(text => {
                    el.urlInput.value = text;
                    showToast('URL pasted', 'Click Play to load', 'success');
                })
                .catch(err => {
                    showToast('Clipboard access denied', 'Paste manually', 'error');
                });
        }
        
        function loadExample(url) {
            const el = getElements();
            el.urlInput.value = url;
            loadVideo();
            toggleExamplesPanel();
        }
        
        // ===== UI CONTROLS =====
        function toggleTheme() {
            const html = document.documentElement;
            if (html.classList.contains('dark')) {
                html.classList.remove('dark');
                html.classList.add('light');
                document.body.classList.remove('bg-gray-900');
                document.body.classList.add('bg-gray-100');
                showToast('Light theme activated', 'Switched to light mode', 'info');
            } else {
                html.classList.remove('light');
                html.classList.add('dark');
                document.body.classList.remove('bg-gray-100');
                document.body.classList.add('bg-gray-900');
                showToast('Dark theme activated', 'Switched to dark mode', 'info');
            }
        }
        
        function toggleDebugPanel() {
            const el = getElements();
            el.debugPanel.classList.toggle('hidden');
            if (!el.debugPanel.classList.contains('hidden')) {
                updateDebugInfo();
            }
        }
        
        function toggleExamplesPanel() {
            const el = getElements();
            el.examplesPanel.classList.toggle('hidden');
        }
        
        function showQuickExamples() {
            toggleExamplesPanel();
        }
        
        function showDebugInfo() {
            toggleDebugPanel();
        }
        
        function showHelp() {
            showToast('Keyboard Shortcuts', 'Space: Play/Pause, F: Fullscreen, M: Mute, ←→: Skip 10s', 'info');
        }
        
        function updateDebugInfo() {
            const el = getElements();
            el.debugUserAgent.textContent = userAgent;
            el.debugVolume.textContent = Math.round(video.volume * 100) + '%';
            el.debugSpeed.textContent = playbackRate + 'x';
        }
        
        // ===== TOAST NOTIFICATIONS =====
        function showToast(message, detail = '', type = 'info') {
            const el = getElements();
            
            // Set icon based on type
            let icon = 'fa-info-circle';
            let color = 'text-blue-500';
            
            switch(type) {
                case 'success':
                    icon = 'fa-check-circle';
                    color = 'text-green-500';
                    break;
                case 'error':
                    icon = 'fa-exclamation-circle';
                    color = 'text-red-500';
                    break;
                case 'warning':
                    icon = 'fa-exclamation-triangle';
                    color = 'text-yellow-500';
                    break;
                case 'info':
                default:
                    icon = 'fa-info-circle';
                    color = 'text-blue-500';
                    break;
            }
            
            el.toastIcon.className = \`fas \${icon} \${color} mr-3 text-xl\`;
            el.toastMessage.textContent = message;
            el.toastDetail.textContent = detail;
            
            // Show toast
            el.toast.classList.remove('hidden');
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                hideToast();
            }, 3000);
        }
        
        function hideToast() {
            const el = getElements();
            el.toast.classList.add('hidden');
        }
        
        function showDoubleTapHint(text) {
            const el = getElements();
            el.doubleTapHint.textContent = \`Double tap: \${text}\`;
            el.doubleTapHint.classList.remove('hidden');
            
            setTimeout(() => {
                el.doubleTapHint.classList.add('hidden');
            }, 1000);
        }
        
        // ===== GLOBAL FUNCTIONS (for inline onclick) =====
        window.togglePlayPause = togglePlayPause;
        window.toggleMute = toggleMute;
        window.toggleFullscreen = toggleFullscreen;
        window.skipBackward = skipBackward;
        window.skipForward = skipForward;
        window.playPrevious = playPrevious;
        window.playNext = playNext;
        window.loadVideo = loadVideo;
        window.clearPlayer = clearPlayer;
        window.pasteFromClipboard = pasteFromClipboard;
        window.loadExample = loadExample;
        window.showQuickExamples = showQuickExamples;
        window.showDebugInfo = showDebugInfo;
        window.showHelp = showHelp;
        window.toggleDebugPanel = toggleDebugPanel;
        window.toggleExamplesPanel = toggleExamplesPanel;
        window.toggleSpeedMenu = toggleSpeedMenu;
        window.setSpeed = setSpeed;
        window.hideToast = hideToast;
        window.toggleControls = toggleControls;
    </script>
</body>
</html>`;
}
