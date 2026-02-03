/**
 * Aro-Ha AI Assistant Widget - Final Embed Code
 * 
 * This is an ultra-aggressive embed code that properly handles pointer-events
 * and completely removes the Vite "App Status: Rendering" message
 */
(function() {
  // Create container for the widget
  const container = document.createElement('div');
  container.className = 'aroha-widget-container';
  
  // Replace with your actual Replit URL
  const aroHaWidgetUrl = 'YOUR_REPLIT_URL/widget-only';
  
  // Add essential styles for the widget 
  const styles = document.createElement('style');
  styles.textContent = `
    /* Container styling - critically does not block interactions */
    .aroha-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      pointer-events: none; /* Critical: Allow page interactions by default */
      transition: all 0.3s ease;
    }
    
    /* Iframe styling - explicitly enables interactions */
    .aroha-widget-iframe {
      border: none;
      width: 100vw;
      max-width: 400px;
      height: 600px;
      border-radius: 10px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      background: transparent;
      overflow: hidden;
      transition: all 0.3s ease;
      pointer-events: auto !important; /* Critical: Enable iframe interactions */
    }
    
    /* Expanded widget styling */
    .aroha-widget-container.expanded {
      bottom: 0;
      right: 0;
    }
    
    /* Mobile-specific styling */
    @media (max-width: 480px) {
      .aroha-widget-iframe {
        width: 100%;
        max-width: 100vw;
        height: 100vh;
        border-radius: 0;
      }
      .aroha-widget-container.expanded {
        bottom: 0;
        right: 0;
        left: 0;
        top: 0;
      }
    }
  `;
  document.head.appendChild(styles);
  document.body.appendChild(container);
  
  // Create the iframe
  const iframe = document.createElement('iframe');
  iframe.className = 'aroha-widget-iframe';
  iframe.src = aroHaWidgetUrl;
  iframe.allow = 'microphone'; // Allow microphone for voice functionality
  iframe.title = 'Aro Ha AI Assistant';
  
  // When iframe loads, aggressively remove any status messages
  iframe.onload = function() {
    try {
      // Try to access iframe content - this may fail due to cross-origin restrictions
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      // Add aggressive styling to hide status messages
      const styleEl = document.createElement('style');
      styleEl.innerHTML = `
        /* Ultra aggressive hiding of status messages */
        body > div:not(#root),
        div[style*="position: fixed"][style*="z-index"],
        div[style*="background-color: white"][style*="border-radius"],
        div:has(> div:contains("App Status")),
        div:has(> p:contains("Rendering")),
        div:has(> *:contains("If you can see this")) {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          position: absolute !important;
          z-index: -9999 !important;
          height: 0 !important;
          width: 0 !important;
          overflow: hidden !important;
          pointer-events: none !important;
        }
      `;
      
      // Try to inject style into iframe
      if (iframeDoc && iframeDoc.head) {
        iframeDoc.head.appendChild(styleEl);
      }
      
      // Execute script to remove status messages
      const script = document.createElement('script');
      script.innerHTML = `
        (function() {
          // Remove status messages
          function removeStatusMessages() {
            // Find any elements with status message text
            document.querySelectorAll('*').forEach(function(el) {
              if (el.id !== 'root' && el.textContent && (
                  el.textContent.includes('App Status') || 
                  el.textContent.includes('Rendering') ||
                  el.textContent.includes('If you can see this')
                )) {
                // Either remove the element or hide it
                if (el.parentNode) {
                  try {
                    el.parentNode.removeChild(el);
                  } catch(e) {
                    // If removal fails, hide it completely
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                    el.style.opacity = '0';
                    el.style.position = 'absolute';
                    el.style.zIndex = '-9999';
                    el.style.height = '0';
                    el.style.width = '0';
                    el.style.overflow = 'hidden';
                  }
                }
              }
            });
            
            // Also target by element characteristics
            document.querySelectorAll('body > div[style*="position: fixed"]').forEach(function(el) {
              if (el.id !== 'root') {
                if (el.parentNode) {
                  try {
                    el.parentNode.removeChild(el);
                  } catch(e) {
                    // Silent fail
                  }
                }
              }
            });
          }
          
          // Run immediately and periodically
          removeStatusMessages();
          setInterval(removeStatusMessages, 100);
        })();
      `;
      
      // Try to inject script into iframe
      if (iframeDoc && iframeDoc.body) {
        iframeDoc.body.appendChild(script);
      }
      
    } catch (e) {
      // Silently fail - likely blocked by cross-origin policy
      console.log('Note: Cannot directly access iframe due to security restrictions');
    }
    
    // Also try sending a message to the iframe
    iframe.contentWindow.postMessage({
      type: 'hideStatusMessages'
    }, '*');
  };
  
  container.appendChild(iframe);
  
  // Listen for widget state messages to handle expansion
  window.addEventListener('message', function(event) {
    if (event.data && typeof event.data === 'object') {
      if (event.data.type === 'widget-state') {
        if (event.data.isMinimized) {
          container.classList.remove('expanded');
        } else {
          container.classList.add('expanded');
        }
      }
    }
  });
})();