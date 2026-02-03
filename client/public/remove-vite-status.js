/**
 * This script completely removes the Vite "App Status: Rendering" message
 * by directly targeting it in the DOM.
 */
(function() {
  // Wait for the DOM to be ready
  function ready(fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }
  
  // Run immediately and at intervals to catch any status messages
  function removeViteStatusCompletely() {
    try {
      // Look for all elements in the document that contain text with "App Status"
      const elementsToRemove = [];
      
      document.querySelectorAll('body > div').forEach(el => {
        // Check if this is the root element (we want to keep that)
        if (el.id === 'root') return;
        
        // Check if this has status text
        if (el.textContent && 
            (el.textContent.includes('App Status') || 
             el.textContent.includes('Rendering') ||
             el.textContent.includes('If you can see this'))) {
          elementsToRemove.push(el);
        }
      });
      
      // Remove all found elements from the DOM
      elementsToRemove.forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    } catch (err) {
      // Silently catch errors - we're being aggressive
      console.log('Error in status removal script:', err);
    }
  }
  
  // Run immediately
  removeViteStatusCompletely();
  
  // Continue to run to catch any newly added status elements
  setInterval(removeViteStatusCompletely, 100);
  
  // Once the DOM is ready, set up the MutationObserver
  ready(function() {
    try {
      if (document.body) {
        // Set up a MutationObserver to catch any dynamically added status messages
        const observer = new MutationObserver(function() {
          removeViteStatusCompletely();
        });
        
        // Start observing the document
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    } catch (err) {
      // Silently catch errors - we're being aggressive
      console.log('Error setting up MutationObserver:', err);
    }
  });
})();