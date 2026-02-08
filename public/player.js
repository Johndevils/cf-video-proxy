// Simplified player.js with core functionality
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const video = document.getElementById('videoPlayer');
    const urlInput = document.getElementById('urlInput');
    const playBtn = document.getElementById('playBtn');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const muteBtn = document.getElementById('muteBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const progressSlider = document.getElementById('progressSlider');
    const volumeSlider = document.getElementById('volumeSlider');
    const currentTime = document.getElementById('currentTime');
    const loader = document.getElementById('loader');
    const errorMsg = document.getElementById('errorMsg');
    const errorText = document.getElementById('errorText');
    const retryBtn = document.getElementById('retryBtn');
    const clearBtn = document.getElementById('clearBtn');
    const controls = document.getElementById('controls');
    const progressCurrent = document.getElementById('progressCurrent');

    let hls = null;

    // Event Listeners
    playBtn.addEventListener('click', loadVideo);
    playPauseBtn.addEventListener('click', togglePlayPause);
    muteBtn.addEventListener('click', toggleMute);
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    retryBtn.addEventListener('click', loadVideo);
    clearBtn.addEventListener('click', clearPlayer);
    
    progressSlider.addEventListener('input', (e) => {
        if (video.duration) {
            video.currentTime = (e.target.value / 100) * video.duration;
        }
    });
    
    volumeSlider.addEventListener('input', (e) => {
        video.volume = e.target.value / 100;
        muteBtn.textContent = video.volume === 0 ? '🔇' : '🔊';
    });

    // Video Events
    video.addEventListener('timeupdate', () => {
        if (video.duration) {
            const percent = (video.currentTime / video.duration) * 100;
            progressSlider.value = percent;
            progressCurrent.style.width = percent + '%';
            currentTime.textContent = formatTime(video.currentTime);
        }
    });

    video.addEventListener('play', () => {
        playPauseBtn.textContent = '⏸';
        loader.classList.add('hidden');
    });

    video.addEventListener('pause', () => {
        playPauseBtn.textContent = '▶';
    });

    video.addEventListener('waiting', () => {
        loader.classList.remove('hidden');
    });

    video.addEventListener('canplay', () => {
        loader.classList.add('hidden');
    });

    video.addEventListener('error', (e) => {
        console.error('Video error:', video.error);
        loader.classList.add('hidden');
        showError('Failed to load video. Please check the URL.');
    });

    // Video hover to show controls
    video.parentElement.addEventListener('mouseenter', () => {
        controls.classList.remove('opacity-0');
    });

    video.parentElement.addEventListener('mouseleave', () => {
        if (!video.paused) {
            controls.classList.add('opacity-0');
        }
    });

    // Functions
    function loadVideo() {
        const url = urlInput.value.trim();
        if (!url) {
            showError('Please enter a video URL');
            return;
        }

        // Clean up previous HLS instance
        if (hls) {
            hls.destroy();
            hls = null;
        }

        hideError();
        loader.classList.remove('hidden');

        if (url.includes('.m3u8')) {
            if (Hls.isSupported()) {
                hls = new Hls();
                hls.loadSource(url);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    video.play().catch(e => {
                        console.warn('Auto-play prevented:', e);
                    });
                });
                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
                        showError('Failed to load HLS stream');
                    }
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = url;
                video.load();
                video.play().catch(e => {
                    console.warn('Auto-play prevented:', e);
                });
            } else {
                showError('HLS not supported in this browser');
            }
        } else {
            video.src = url;
            video.load();
            video.play().catch(e => {
                console.warn('Auto-play prevented:', e);
            });
        }
    }

    function togglePlayPause() {
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    }

    function toggleMute() {
        video.muted = !video.muted;
        muteBtn.textContent = video.muted ? '🔇' : '🔊';
        volumeSlider.value = video.muted ? 0 : video.volume * 100;
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            video.parentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    function clearPlayer() {
        urlInput.value = '';
        video.pause();
        video.src = '';
        loader.classList.add('hidden');
        hideError();
        progressCurrent.style.width = '0%';
        currentTime.textContent = '00:00';
    }

    function showError(message) {
        errorText.textContent = message;
        errorMsg.classList.remove('hidden');
    }

    function hideError() {
        errorMsg.classList.add('hidden');
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target === urlInput) return;
        
        switch(e.key) {
            case ' ':
                e.preventDefault();
                togglePlayPause();
                break;
            case 'f':
                toggleFullscreen();
                break;
            case 'm':
                toggleMute();
                break;
        }
    });
});
