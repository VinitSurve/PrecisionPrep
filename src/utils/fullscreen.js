/**
 * Utility functions for handling full screen mode
 */

// Check if full screen mode is available
export const isFullScreenAvailable = () => {
  return (
    document.fullscreenEnabled ||
    document.webkitFullscreenEnabled ||
    document.mozFullScreenEnabled ||
    document.msFullscreenEnabled
  );
};

// Check if currently in full screen mode
export const isInFullScreen = () => {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
};

// Enter full screen mode
export const enterFullScreen = (element = document.documentElement) => {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else if (element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen();
  }
};

// Exit full screen mode
export const exitFullScreen = () => {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
};

// Toggle full screen mode
export const toggleFullScreen = (element = document.documentElement) => {
  if (isInFullScreen()) {
    exitFullScreen();
    return false;
  } else {
    enterFullScreen(element);
    return true;
  }
};

// Auto-enter full screen mode if previously enabled
export const autoEnterFullScreen = () => {
  const wasFullScreen = localStorage.getItem('PrecisionPrep_fullscreen') === 'true';
  
  if (wasFullScreen && isFullScreenAvailable()) {
    // Use a slight delay to avoid issues with some browsers
    setTimeout(() => {
      enterFullScreen();
    }, 1000);
  }
  
  return wasFullScreen;
};

// Save full screen preference
export const saveFullScreenPreference = (isEnabled) => {
  localStorage.setItem('PrecisionPrep_fullscreen', isEnabled ? 'true' : 'false');
};
