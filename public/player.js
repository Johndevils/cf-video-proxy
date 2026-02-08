// === ARSYSTREAM VIDEO PLAYER - Tailwind CSS Version ===
// Version: 1.0
// Description: Simple online video player with HLS support

// === GLOBAL VARIABLES ===
let video;
let hls = null;
let playlist = [];
let currentIndex = 0;
let isFullscreen = false;
let isPiP = false;
let controlsTimeout = null;
let isPlaying = false;
let isDarkMode = true;

// === DOM ELEMENTS ===
// Input & Controls
const urlInput = document.getElementById('urlInput');
const playBtn = document.getElementById('playBtn');
const clearBtn = document.getElementById('clearBtn');
const playlistBtn = document.getElementById('playlistBtn');
const loader = document.getElementById('loader');
const loadStatus = document.getElementById('loadStatus');
const videoPlayer = document.getElementById('videoPlayer');
const controls = document.getElementById('controls');
const errorMsg = document.getElementById('errorMsg');
const errorText = document.getElementById('errorText');
const retryBtn = document.getElementById('retryBtn');
const closeErrorBtn = document.getElementById('closeErrorBtn');

// Player Controls
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const muteBtn = document.getElementById('muteBtn');
const volumeIcon = document.getElementById('volumeIcon');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const fullscreenIcon = document.getElementById('fullscreenIcon');
const pipBtn = document.getElementById('pipBtn');
const themeToggle = document.getElementById('themeToggle');
const volumeSlider = document.getElementById('volumeSlider');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const videoTitle = document.getElementById('videoTitle');
const videoInfo = document.getElementById('videoInfo');
const videoResolution = document.getElementById('videoResolution');
const progressSlider = document.getElementById('progressSlider');
const progressCurrent = document.getElementById('progressCurrent');
const progressBuffered = document.getElementById('progressBuffered');

// Playlist Section
const playlistSection = document.getElementById('playlistSection');
const playlistInput = document.getElementById('playlistInput');
const loadPlaylistBtn = document.getElementById('loadPlaylistBtn');
const closePlaylistBtn = document.getElementById('closePlaylistBtn');
const clearPlaylistBtn = document.getElementById('clearPlaylistBtn');
const playlistItems = document.getElementById('playlistItems');

// Toast Container
const toastContainer = document.getElementById('toastContainer');

// Example buttons
const exampleBtns = document.querySelectorAll('.example-btn');

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
    initializePlayer();
    setupEventListeners();
    setupKeyboardShortcuts();
    setupExampleButtons();
    loadSavedState();
    
    // Focus URL input on load
    setTimeout(() => {
        urlInput.focus();
    }, 100);
    
    // Show welcome message
    setTimeout(() => {
        showToast('Welcome to Arsystream! Paste a video URL to get started.', 'info');
    }, 500);
});

// === INITIALIZE PLAYER ===
function initializePlayer() {
    video = videoPlayer;
    video.volume = volumeSlider.value / 100;
    
    // Check for dark mode preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        isDarkMode = true;
        document.documentElement.classList.add('dark');
        themeToggle.textContent = '☀️';
    }
    
    // Log initialization
    console.log('🎬 Arsystream Player v1.0 initialized');
    console.log('🔧 HLS.js supported:', Hls.isSupported());
    console.log('🎥 HTML5 video features:', {
        hls: video.canPlayType('application/vnd.apple.mpegurl'),
        mp4: video.canPlayType('video/mp4'),
        webm: video.canPlayType('video/webm'),
        pip: document.pictureInPictureEnabled,
        fullscreen: document.fullscreenEnabled
    });
    
    // Update UI
    updateControlButtons();
    hideError();
}

// === SETUP EVENT LISTENERS ===
function setupEventListeners() {
    // URL Input & Buttons
    playBtn.addEventListener('click', handlePlayClick);
    clearBtn.addEventListener('click', handleClearClick);
    playlistBtn.addEventListener('click', togglePlaylistSection);
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handlePlayClick();
    });
    retryBtn.addEventListener('click', retryPlayback);
    closeErrorBtn.addEventListener('click', hideError);
    
    // Drag and drop for URL input
    urlInput.addEventListener('dragover', (e) => {
        e.preventDefault();
        urlInput.classList.add('border-arsy-red', 'bg-gray-900');
    });
    
    urlInput.addEventListener('dragleave', () => {
        urlInput.classList.remove('border-arsy-red', 'bg-gray-900');
    });
    
    urlInput.addEventListener('drop', (e) => {
        e.preventDefault();
        urlInput.classList.remove('border-arsy-red', 'bg-gray-900');
        
        const text = e.dataTransfer.getData('text');
        if (text && text.startsWith('http')) {
            urlInput.value = text;
            showToast('URL dropped successfully!', 'success');
        }
    });

    // Playlist Controls
    loadPlaylistBtn.addEventListener('click', loadPlaylist);
    closePlaylistBtn.addEventListener('click', togglePlaylistSection);
    clearPlaylistBtn.addEventListener('click', clearPlaylist);

    // Video Controls
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', playPrevious);
    nextBtn.addEventListener('click', playNext);
    muteBtn.addEventListener('click', toggleMute);
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    pipBtn.addEventListener('click', togglePiP);
    themeToggle.addEventListener('click', toggleTheme);
    
    volumeSlider.addEventListener('input', handleVolumeChange);
    progressSlider.addEventListener('input', handleProgressChange);
    progressSlider.addEventListener('mousedown', () => {
        video.pause();
    });
    progressSlider.addEventListener('mouseup', () => {
        if (isPlaying) video.play();
    });
    
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
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('resize', onVideoResize);
    
    // Fullscreen Events
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    
    // Picture-in-Picture Events
    video.addEventListener('enterpictureinpicture', () => {
        isPiP = true;
        showToast('Entered Picture-in-Picture mode', 'info');
    });
    
    video.addEventListener('leavepictureinpicture', () => {
        isPiP = false;
        showToast('Exited Picture-in-Picture mode', 'info');
    });
    
    // Mouse events for controls auto-hide
    videoPlayer.addEventListener('mousemove', showControls);
    videoPlayer.addEventListener('mouseleave', hideControlsAfterDelay);
    videoPlayer.addEventListener('click', togglePlayPause);
    
    // Touch events for mobile
    videoPlayer.addEventListener('touchstart', showControls);
    videoPlayer.addEventListener('touchend', hideControlsAfterDelay);
    
    // Click on video toggles play/pause
    videoPlayer.addEventListener('click', (e) => {
        if (e.target === videoPlayer) {
            togglePlayPause();
        }
    });
}

// === SETUP KEYBOARD SHORTCUTS ===
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // Don't trigger if Ctrl/Cmd is pressed (browser shortcuts)
        if (e.ctrlKey || e.metaKey) {
            return;
        }
        
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
            case 'p': // P - Previous
                playPrevious();
                break;
            case 'n': // N - Next
                playNext();
                break;
            case 't': // T - Toggle theme
                toggleTheme();
                break;
            case 'i': // I - Toggle PiP
                if (document.pictureInPictureEnabled) togglePiP();
                break;
            case 'arrowleft': // ← - Seek backward
                e.preventDefault();
                if (e.shiftKey) video.currentTime -= 60; // 1 minute
                else if (e.altKey) video.currentTime -= 1; // 1 second
                else video.currentTime -= 10; // 10 seconds
                showSeekFeedback(-10);
                break;
            case 'arrowright': // → - Seek forward
                e.preventDefault();
                if (e.shiftKey) video.currentTime += 60;
                else if (e.altKey) video.currentTime += 1;
                else video.currentTime += 10;
                showSeekFeedback(10);
                break;
            case 'arrowup': // ↑ - Volume up
                e.preventDefault();
                video.volume = Math.min(video.volume + 0.1, 1);
                updateVolumeSlider();
                showVolumeFeedback('up');
                break;
            case 'arrowdown': // ↓ - Volume down
                e.preventDefault();
                video.volume = Math.max(video.volume - 0.1, 0);
                updateVolumeSlider();
                showVolumeFeedback('down');
                break;
            case 'l': // L - Toggle loop
                video.loop = !video.loop;
                showToast(video.loop ? '🔁 Loop enabled' : '🔁 Loop disabled', 'info');
                break;
            case '0': case '1': case '2': case '3': case '4':
            case '5': case '6': case '7': case '8': case '9':
                // Jump to percentage (0-90%)
                const percentage = (parseInt(e.key) * 10);
                if (video.duration) {
                    video.currentTime = (video.duration * percentage) / 100;
                    showToast(`Jumped to ${percentage}%`, 'info');
                }
                break;
        }
    });
}

// === SETUP EXAMPLE BUTTONS ===
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

// === URL INPUT HANDLER ===
function handlePlayClick() {
    const url = urlInput.value.trim();
    
    if (!url) {
        showError('Please enter a video URL');
        urlInput.focus();
        return;
    }
    
    loadVideo(url);
}

// === VIDEO LOADER ===
function loadVideo(url, title = '') {
    // Clean up existing HLS instance
    if (hls) {
        hls.destroy();
        hls = null;
    }
    
    // Show loading state
    showLoader();
    hideError();
    showControls();
    
    // Update video title
    videoTitle.textContent = title || extractVideoTitle(url);
    
    // Save URL to history
    saveToHistory(url);
    
    // Check if it's a playlist (multiple URLs separated by newlines or commas)
    if (url.includes('\n') || url.includes(',')) {
        parseAndLoadPlaylist(url);
        return;
    }
    
    // Determine format and load accordingly
    if (isHLSStream(url)) {
        loadHLSVideo(url);
    } else if (isDASHStream(url)) {
        showError('DASH streams require additional libraries. Try MP4 or HLS.');
    } else {
        loadNativeVideo(url);
    }
}

// === HLS VIDEO LOADER ===
function loadHLSVideo(url) {
    updateLoadStatus('Loading HLS stream...');
    
    if (Hls.isSupported()) {
        hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            maxBufferLength: 30,
            maxMaxBufferLength: 600,
            maxBufferSize: 60 * 1000 * 1000,
            maxBufferHole: 0.5,
            manifestLoadingTimeOut: 10000,
            manifestLoadingMaxRetry: 3,
            manifestLoadingRetryDelay: 1000,
            levelLoadingTimeOut: 10000,
            levelLoadingMaxRetry: 4,
            levelLoadingRetryDelay: 1000,
            fragLoadingTimeOut: 20000,
            fragLoadingMaxRetry: 6,
            fragLoadingRetryDelay: 1000,
        });
        
        hls.loadSource(url);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            updateLoadStatus('HLS manifest loaded');
            video.play().catch(e => {
                console.warn('Auto-play prevented:', e.message);
                showToast('Click the play button to start', 'info');
            });
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS error:', data);
            if (data.fatal) {
                switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        showError('Network error loading HLS stream');
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        showError('Media error loading HLS stream');
                        hls.recoverMediaError();
                        break;
                    default:
                        showError('Failed to load HLS stream');
                        hls.destroy();
                        loadNativeVideo(url); // Fallback to native
                        break;
                }
            }
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        updateLoadStatus('Using native HLS support...');
        loadNativeVideo(url);
    } else {
        showError('HLS streaming not supported in your browser');
    }
}

// === NATIVE VIDEO LOADER ===
function loadNativeVideo(url) {
    updateLoadStatus('Loading video...');
    video.src = url;
    video.load();
    
    // Try to play
    video.play().then(() => {
        console.log('Video playing successfully');
    }).catch(e => {
        console.warn('Auto-play prevented:', e.message);
        showToast('Click the play button to start', 'info');
    });
}

// === PLAY/PAUSE ===
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
    playIcon.textContent = '⏸';
    isPlaying = true;
    hideLoader();
    hideControlsAfterDelay();
    savePlaybackState();
}

function onPause() {
    playIcon.textContent = '▶';
    isPlaying = false;
    showControls();
}

// === PLAYLIST FUNCTIONS ===
function togglePlaylistSection() {
    playlistSection.classList.toggle('hidden');
    if (!playlistSection.classList.contains('hidden')) {
        playlistInput.focus();
        updatePlaylistUI();
    }
}

function loadPlaylist() {
    const input = playlistInput.value.trim();
    
    if (!input) {
        showError('Please enter playlist URLs');
        return;
    }
    
    try {
        // Try to parse as JSON
        const parsed = JSON.parse(input);
        if (Array.isArray(parsed)) {
            playlist = parsed.filter(url => url.trim());
            if (playlist.length === 0) {
                showError('No valid URLs in playlist');
                return;
            }
            currentIndex = 0;
            loadVideo(playlist[0], `Playlist: 1/${playlist.length}`);
            updatePlaylistButtons();
            updatePlaylistUI();
            showToast(`Loaded ${playlist.length} videos`, 'success');
            return;
        }
    } catch (e) {
        // Not JSON, try parsing as newline/comma separated
        playlist = input.split(/[\n,]/)
            .map(url => url.trim())
            .filter(url => url.length > 0 && url.startsWith('http'));
        
        if (playlist.length === 0) {
            showError('No valid URLs found. Use JSON array or line-separated URLs.');
            return;
        }
        
        currentIndex = 0;
        loadVideo(playlist[0], `Playlist: 1/${playlist.length}`);
        updatePlaylistButtons();
        updatePlaylistUI();
        showToast(`Loaded ${playlist.length} videos`, 'success');
    }
}

function parseAndLoadPlaylist(urlString) {
    playlist = urlString.split(/[\n,]/)
        .map(url => url.trim())
        .filter(url => url.length > 0);
    
    if (playlist.length > 1) {
        currentIndex = 0;
        loadVideo(playlist[0], `Playlist: 1/${playlist.length}`);
        updatePlaylistButtons();
        updatePlaylistUI();
        showToast(`Loaded ${playlist.length} videos`, 'success');
    } else {
        loadVideo(playlist[0]);
    }
}

function updatePlaylistUI() {
    if (playlist.length === 0) {
        playlistItems.classList.add('hidden');
        return;
    }
    
    playlistItems.classList.remove('hidden');
    playlistItems.innerHTML = '';
    
    playlist.forEach((url, index) => {
        const item = document.createElement('div');
        item.className = `flex items-center justify-between p-3 rounded-lg ${
            index === currentIndex 
            ? 'bg-arsy-red/20 border border-arsy-red' 
            : 'bg-gray-800 hover:bg-gray-700'
        } transition-colors`;
        
        item.innerHTML = `
            <div class="flex items-center space-x-3 flex-1 min-w-0">
                <span class="text-arsy-red font-bold w-6">${index + 1}</span>
                <span class="truncate text-sm font-mono">${extractVideoTitle(url)}</span>
            </div>
            <div class="flex items-center space-x-2">
                ${index === currentIndex ? 
                    '<span class="text-xs bg-arsy-red px-2 py-1 rounded">Playing</span>' : 
                    '<button class="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors play-item">Play</button>'
                }
                <button class="text-gray-400 hover:text-arsy-red remove-item p-1">✕</button>
            </div>
        `;
        
        // Add event listeners
        const playBtn = item.querySelector('.play-item');
        const removeBtn = item.querySelector('.remove-item');
        
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                currentIndex = index;
                loadVideo(url, `Playlist: ${index + 1}/${playlist.length}`);
                updatePlaylistUI();
            });
        }
        
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                playlist.splice(index, 1);
                if (currentIndex >= index) currentIndex = Math.max(0, currentIndex - 1);
                updatePlaylistUI();
                if (playlist.length > 0) {
                    loadVideo(playlist[currentIndex], `Playlist: ${currentIndex + 1}/${playlist.length}`);
                } else {
                    clearPlaylist();
                }
            });
        }
        
        playlistItems.appendChild(item);
    });
}

function clearPlaylist() {
    playlist = [];
    currentIndex = 0;
    playlistInput.value = '';
    playlistItems.classList.add('hidden');
    updatePlaylistButtons();
    showToast('Playlist cleared', 'info');
}

function playPrevious() {
    if (playlist.length > 1 && currentIndex > 0) {
        currentIndex--;
        loadVideo(playlist[currentIndex], `Playlist: ${currentIndex + 1}/${playlist.length}`);
        updatePlaylistUI();
    }
}

function playNext() {
    if (playlist.length > 1 && currentIndex < playlist.length - 1) {
        currentIndex++;
        loadVideo(playlist[currentIndex], `Playlist: ${currentIndex + 1}/${playlist.length}`);
        updatePlaylistUI();
    } else if (playlist.length === 0) {
        // Try to get next video from input
        const urls = urlInput.value.split(/[\n,]/).map(u => u.trim()).filter(u => u);
        if (urls.length > 1) {
            const currentUrl = video.src;
            const nextIndex = urls.findIndex(u => u === currentUrl) + 1;
            if (nextIndex > 0 && nextIndex < urls.length) {
                urlInput.value = urls[nextIndex];
                loadVideo(urls[nextIndex]);
            }
        }
    }
}

function updatePlaylistButtons() {
    prevBtn.disabled = (currentIndex === 0 || playlist.length <= 1);
    nextBtn.disabled = (currentIndex === playlist.length - 1 || playlist.length <= 1);
}

// === VOLUME CONTROL ===
function toggleMute() {
    video.muted = !video.muted;
    updateMuteButton();
    updateVolumeSlider();
    saveVolumeState();
}

function handleVolumeChange(e) {
    const volume = e.target.value / 100;
    video.volume = volume;
    video.muted = (volume === 0);
    updateMuteButton();
    saveVolumeState();
}

function onVolumeChange() {
    updateMuteButton();
    updateVolumeSlider();
}

function updateMuteButton() {
    volumeIcon.textContent = video.muted || video.volume === 0 ? '🔇' : '🔊';
}

function updateVolumeSlider() {
    volumeSlider.value = video.muted ? 0 : video.volume * 100;
}

// === PROGRESS BAR ===
function onTimeUpdate() {
    if (video.duration && !isNaN(video.duration)) {
        const percent = (video.currentTime / video.duration) * 100;
        progressSlider.value = percent;
        progressCurrent.style.width = percent + '%';
        
        currentTimeEl.textContent = formatTime(video.currentTime);
        totalTimeEl.textContent = formatTime(video.duration);
        
        savePlaybackState();
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

// === FULLSCREEN ===
function toggleFullscreen() {
    const playerWrapper = videoPlayer.parentElement;
    
    if (!isFullscreen) {
        if (playerWrapper.requestFullscreen) {
            playerWrapper.requestFullscreen();
        } else if (playerWrapper.webkitRequestFullscreen) {
            playerWrapper.webkitRequestFullscreen();
        } else if (playerWrapper.mozRequestFullScreen) {
            playerWrapper.mozRequestFullScreen();
        } else if (playerWrapper.msRequestFullscreen) {
            playerWrapper.msRequestFullscreen();
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
    isFullscreen = !!(document.fullscreenElement || 
                     document.webkitFullscreenElement || 
                     document.mozFullScreenElement || 
                     document.msFullscreenElement);
    
    fullscreenIcon.textContent = isFullscreen ? '⛶' : '⛶';
    showControls();
}

// === PICTURE-IN-PICTURE ===
function togglePiP() {
    if (!document.pictureInPictureEnabled) {
        showToast('Picture-in-Picture not supported', 'error');
        return;
    }
    
    if (!isPiP) {
        video.requestPictureInPicture().catch(e => {
            console.error('PiP error:', e);
            showToast('Failed to enter Picture-in-Picture', 'error');
        });
    } else {
        document.exitPictureInPicture().catch(e => {
            console.error('Exit PiP error:', e);
        });
    }
}

// === THEME TOGGLE ===
function toggleTheme() {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
        themeToggle.textContent = '☀️';
        localStorage.setItem('arsystream-theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        themeToggle.textContent = '🌙';
        localStorage.setItem('arsystream-theme', 'light');
    }
}

// === CONTROLS VISIBILITY ===
function showControls() {
    controls.classList.remove('controls-hide');
    controls.classList.add('controls-show');
    
    // Clear existing timeout
    if (controlsTimeout) {
        clearTimeout(controlsTimeout);
    }
    
    // Auto-hide after 3 seconds if video is playing
    if (isPlaying) {
        controlsTimeout = setTimeout(() => {
            if (isPlaying && !isFullscreen) {
                controls.classList.remove('controls-show');
                controls.classList.add('controls-hide');
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
            controls.classList.remove('controls-show');
            controls.classList.add('controls-hide');
        }, 3000);
    }
}

// === ERROR HANDLING ===
function onVideoError(e) {
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
    updateLoadStatus('Buffering...');
}

function onCanPlay() {
    hideLoader();
}

function onLoadedMetadata() {
    videoResolution.textContent = `${video.videoWidth}×${video.videoHeight}`;
    console.log('Video metadata loaded:', {
        duration: formatTime(video.duration),
        resolution: `${video.videoWidth}×${video.videoHeight}`,
        hasAudio: !video.muted
    });
}

function onVideoResize() {
    videoResolution.textContent = `${video.videoWidth}×${video.videoHeight}`;
}

// === UTILITY FUNCTIONS ===
function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function extractVideoTitle(url) {
    try {
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        const filename = path.split('/').pop();
        return filename || urlObj.hostname;
    } catch {
        return url.substring(0, 50) + (url.length > 50 ? '...' : '');
    }
}

function isHLSStream(url) {
    return url.includes('.m3u8') || url.includes('m3u8?');
}

function isDASHStream(url) {
    return url.includes('.mpd') || url.includes('mpd?');
}

// === LOADING STATES ===
function showLoader() {
    loader.classList.remove('hidden');
}

function hideLoader() {
    loader.classList.add('hidden');
}

function updateLoadStatus(text) {
    if (loadStatus) {
        loadStatus.textContent = text;
    }
}

// === ERROR HANDLING ===
function showError(message) {
    errorText.textContent = message;
    errorMsg.classList.remove('hidden');
}

function hideError() {
    errorMsg.classList.add('hidden');
}

function retryPlayback() {
    const url = video.src || urlInput.value;
    if (url) {
        loadVideo(url);
    }
}

// === TOAST NOTIFICATIONS ===
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    // Set background color based on type
    const bgColors = {
        success: 'bg-green-900/90 border-green-500',
        error: 'bg-red-900/90 border-red-500',
        info: 'bg-gray-900/90 border-arsy-red',
        warning: 'bg-yellow-900/90 border-yellow-500'
    };
    
    toast.className = `toast ${bgColors[type] || bgColors.info}`;
    
    toast.innerHTML = `
        <div class="flex items-center">
            <span class="mr-3">${getToastIcon(type)}</span>
            <span class="flex-1">${message}</span>
            <button class="ml-4 text-gray-400 hover:text-white close-toast">✕</button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Add close button event
    const closeBtn = toast.querySelector('.close-toast');
    closeBtn.addEventListener('click', () => {
        hideToast(toast);
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        hideToast(toast);
    }, 5000);
}

function getToastIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    return icons[type] || 'ℹ️';
}

function hideToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

// === FEEDBACK ANIMATIONS ===
function showSeekFeedback(seconds) {
    const feedback = document.createElement('div');
    feedback.className = 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-lg font-bold z-40';
    feedback.textContent = seconds > 0 ? `+${seconds}s` : `${seconds}s`;
    
    videoPlayer.parentElement.appendChild(feedback);
    
    setTimeout(() => {
        feedback.remove();
    }, 1000);
}

function showVolumeFeedback(direction) {
    const feedback = document.createElement('div');
    feedback.className = 'absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm font-bold z-40';
    feedback.textContent = direction === 'up' ? 'Volume +' : 'Volume -';
    
    videoPlayer.parentElement.appendChild(feedback);
    
    setTimeout(() => {
        feedback.remove();
    }, 1000);
}

// === LOCAL STORAGE ===
function saveToHistory(url) {
    try {
        const history = JSON.parse(localStorage.getItem('arsystream-history') || '[]');
        if (!history.includes(url)) {
            history.unshift(url);
            // Keep only last 10 items
            localStorage.setItem('arsystream-history', JSON.stringify(history.slice(0, 10)));
        }
    } catch (e) {
        console.error('Failed to save history:', e);
    }
}

function savePlaybackState() {
    try {
        localStorage.setItem('arsystream-volume', video.volume);
        localStorage.setItem('arsystream-muted', video.muted);
    } catch (e) {
        console.error('Failed to save playback state:', e);
    }
}

function saveVolumeState() {
    try {
        localStorage.setItem('arsystream-volume', video.volume);
        localStorage.setItem('arsystream-muted', video.muted);
    } catch (e) {
        console.error('Failed to save volume state:', e);
    }
}

function loadSavedState() {
    try {
        const savedVolume = localStorage.getItem('arsystream-volume');
        const savedMuted = localStorage.getItem('arsystream-muted');
        
        if (savedVolume) {
            video.volume = parseFloat(savedVolume);
            volumeSlider.value = video.volume * 100;
        }
        
        if (savedMuted !== null) {
            video.muted = savedMuted === 'true';
            updateMuteButton();
            updateVolumeSlider();
        }
    } catch (e) {
        console.error('Failed to load saved state:', e);
    }
}

// === UPDATE CONTROL BUTTONS ===
function updateControlButtons() {
    prevBtn.disabled = playlist.length <= 1 || currentIndex === 0;
    nextBtn.disabled = playlist.length <= 1 || currentIndex === playlist.length - 1;
    pipBtn.disabled = !document.pictureInPictureEnabled;
}

// === CLEAR FUNCTION ===
function handleClearClick() {
    urlInput.value = '';
    video.pause();
    video.src = '';
    hideLoader();
    hideError();
    playlist = [];
    currentIndex = 0;
    playlistInput.value = '';
    playlistItems.innerHTML = '';
    playlistItems.classList.add('hidden');
    updatePlaylistButtons();
    videoTitle.textContent = 'Ready to play';
    videoResolution.textContent = '';
    showToast('Cleared player', 'info');
}

// === EVENT HANDLERS ===
function onEnded() {
    if (playlist.length > 1 && currentIndex < playlist.length - 1) {
        playNext();
    } else {
        playIcon.textContent = '▶';
        isPlaying = false;
        showToast('Playback completed', 'info');
    }
}

// Initialize
console.log('Arsystream Player loaded successfully!');
