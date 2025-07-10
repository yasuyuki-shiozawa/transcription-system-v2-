// Debug script to verify console logging is working
console.log('%c🚨 DEBUG SCRIPT LOADED 🚨', 'color: red; font-size: 20px; font-weight: bold;');
console.log('Current URL:', window.location.href);
console.log('User Agent:', navigator.userAgent);
console.log('Timestamp:', new Date().toISOString());

// Add a global debug function
window.debugTranscriptionApp = function() {
  console.log('=== TRANSCRIPTION APP DEBUG INFO ===');
  console.log('React DevTools installed:', !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
  console.log('Next.js version:', window.__NEXT_DATA__?.version || 'Unknown');
  console.log('Build ID:', window.__NEXT_DATA__?.buildId || 'Unknown');
  console.log('Environment:', window.__NEXT_DATA__?.env || {});
  console.log('=====================================');
};

// Run debug function on load
setTimeout(() => {
  window.debugTranscriptionApp();
}, 1000);