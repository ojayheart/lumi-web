/**
 * This script aggressively removes the "App Status: Rendering" message
 * that appears in Vite development mode.
 */
(function() {
  // Function to remove status messages
  function removeStatusMessages() {
    // Target all elements that might contain the status message
    document.querySelectorAll('*').forEach(el => {
      // Check if the element or its children contain the status message text
      if (el.textContent && 
          (el.textContent.includes('App Status') || 
           el.textContent.includes('Rendering') ||
           el.textContent.includes('If you can see this'))) {
          
        // Hide this element completely
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.opacity = '0';
        el.style.position = 'absolute';
        el.style.zIndex = '-9999';
        el.style.width = '0';
        el.style.height = '0';
        el.style.overflow = 'hidden';
        el.style.pointerEvents = 'none';
        
        // Try to remove it from the DOM if possible
        try {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        } catch (e) {
          // Silent fail - we tried our best
        }
      }
    });
    
    // Also find elements by their specific styles or attributes that might be Vite status messages
    const possibleStatusElements = document.querySelectorAll(
      '[data-vite-dev-id], ' + 
      '[data-vite-status], ' + 
      'div[data-vite-dev-status], ' +
      'div[style*="position: fixed"][style*="z-index: 9999"]'
    );
    
    possibleStatusElements.forEach(el => {
      try {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      } catch (e) {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.opacity = '0';
      }
    });
  }
  
  // Run immediately
  removeStatusMessages();
  
  // Run after a short delay to catch elements added after initial load
  setTimeout(removeStatusMessages, 100);
  setTimeout(removeStatusMessages, 500);
  setTimeout(removeStatusMessages, 1000);
  
  // Also run on any DOM changes to catch dynamically added elements
  const observer = new MutationObserver(function(mutations) {
    removeStatusMessages();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Also run periodically to be extra sure
  setInterval(removeStatusMessages, 2000);
})();