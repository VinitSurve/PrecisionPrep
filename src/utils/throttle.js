/**
 * Creates a throttled function that only invokes the provided function at most once per specified interval
 * @param {Function} func - The function to throttle
 * @param {number} wait - The number of milliseconds to throttle invocations to
 * @returns {Function} Returns the new throttled function
 */
export const throttle = (func, wait = 300) => {
  let timeout = null;
  let lastCall = 0;
  
  return function(...args) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    
    const execute = () => {
      lastCall = now;
      func.apply(this, args);
    };
    
    if (timeSinceLastCall >= wait) {
      execute();
    } else {
      clearTimeout(timeout);
      timeout = setTimeout(execute, wait - timeSinceLastCall);
    }
  };
};

/**
 * Creates a debounced function that delays invoking the provided function until after 
 * the specified wait time has elapsed since the last time the debounced function was invoked
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {Function} Returns the new debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
};
