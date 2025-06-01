/**
 * Utility functions for handling full screen mode
 */

// Check if full screen mode is available
export const isFullScreenAvailable = () => {
  const doc = document.documentElement;
  return !!(
    doc.requestFullscreen ||
    doc.webkitRequestFullscreen ||
    doc.mozRequestFullScreen ||
    doc.msRequestFullscreen
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
export const enterFullScreen = () => {
  try {
    // Only attempt fullscreen if directly triggered by a user gesture
    const doc = document.documentElement;
    
    // Don't attempt to enter fullscreen programmatically to avoid the error
    // This should be called from a button click handler instead
    return Promise.resolve();
  } catch (err) {
    console.warn('Fullscreen request failed:', err);
    return Promise.reject(err);
  }
};

// Exit full screen mode
export const exitFullScreen = () => {
  try {
    // Only attempt to exit fullscreen if we're currently in fullscreen
    if (!document.fullscreenElement &&
        !document.webkitFullscreenElement &&
        !document.mozFullScreenElement &&
        !document.msFullscreenElement) {
      return Promise.resolve();
    }
    
    if (document.exitFullscreen) {
      return document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      return document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      return document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      return document.msExitFullscreen();
    }
    
    return Promise.resolve();
  } catch (err) {
    console.warn('Exit fullscreen failed:', err);
    return Promise.reject(err);
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
