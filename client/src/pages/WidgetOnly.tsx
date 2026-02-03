import CustomChatWidgetContainer from "@/components/CustomChatWidgetContainer";
import { useEffect, useLayoutEffect } from "react";

export default function WidgetOnly() {
  // Load the script to remove Vite status messages immediately
  useLayoutEffect(() => {
    // Direct DOM manipuation to completely remove the status message
    function removeViteStatusMessage() {
      // Target specifically the status message div which contains "App Status: Rendering"
      const statusMessages = Array.from(document.querySelectorAll('body > div')).filter(
        div => div.id !== 'root' && 
              div.textContent && 
              (div.textContent.includes('App Status') || div.textContent.includes('Rendering'))
      );
      
      // Remove them all
      statusMessages.forEach(div => {
        if (div.parentNode) {
          div.parentNode.removeChild(div);
        }
      });
    }
    
    // Run immediately
    removeViteStatusMessage();
    
    // Run again after small delays to catch any that appear later
    setTimeout(removeViteStatusMessage, 10);
    setTimeout(removeViteStatusMessage, 50);
    setTimeout(removeViteStatusMessage, 100);
    setTimeout(removeViteStatusMessage, 500);
    
    // Also run repeatedly
    const intervalId = setInterval(removeViteStatusMessage, 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);
  // ULTRA AGGRESSIVE approach to hide status messages
  useEffect(() => {
    // Function to specifically target and remove status messages
    const removeStatusMessages = () => {
      try {
        // Direct DOM manipulation to find and remove status overlay
        const statusOverlays = document.querySelectorAll('div[style*="position: fixed"]');
        statusOverlays.forEach(overlay => {
          const textContent = overlay.textContent || '';
          if (textContent.includes('App Status') || 
              textContent.includes('Rendering') ||
              textContent.includes('If you can see this')) {
            
            // Try to completely remove the element
            if (overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
            }
          }
        });
        
        // Also try selecting by common Vite overlay characteristics
        document.querySelectorAll(
          'div[style*="z-index: 999"], ' + 
          'div[style*="position: fixed"][style*="top: 0"], ' +
          'div[style*="box-shadow"][style*="border-radius"]'
        ).forEach(el => {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        });
      } catch (err) {
        // Silently fail - we're being aggressive
      }
    };
    
    // Run immediately and periodically
    removeStatusMessages();
    const intervalId = setInterval(removeStatusMessages, 500);
    
    // Also inject a style element to hide any future status messages
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      /* Extremely aggressive styling to hide ANY Vite-related overlays */
      div[style*="position: fixed"][style*="z-index"],
      div[style*="position: fixed"][style*="top: 0"],
      div[style*="background-color: white"][style*="box-shadow"],
      div:has(> div:contains("App Status")),
      div:has(> p:contains("Rendering")),
      div:has(> *:contains("If you can see this")) {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        height: 0 !important;
        width: 0 !important;
        position: absolute !important;
        z-index: -9999 !important;
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(styleEl);
    
    return () => {
      clearInterval(intervalId);
      if (styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    };
  }, []);
  
  // Preload text normalization service for embedded widget
  useEffect(() => {
    const preloadTextNormalization = async () => {
      try {
        console.log('Preloading text normalization service...');
        const { textNormalizationService } = await import('@/lib/api/textNormalizationService');
        
        // Store in the global window object for easy access
        // This is especially important for the embedded version
        if (typeof window !== 'undefined') {
          (window as any).textNormalizationService = textNormalizationService;
        }
        
        // Test with a sample text containing dates and numbers
        const result = await textNormalizationService.normalizeText('test twenty-five on august third');
        console.log('Text normalization service preloaded successfully:', result);
      } catch (error) {
        console.error('Failed to preload text normalization service:', error);
        // If there's an error, make further attempts
        setTimeout(preloadTextNormalization, 5000);
      }
    };
    
    // Run preload immediately and also after short delay if needed
    preloadTextNormalization();
    const timeoutId = setTimeout(preloadTextNormalization, 3000);
    return () => clearTimeout(timeoutId);
  }, []);

  // Remove any background colors and make the page transparent
  useEffect(() => {
    // Make the body and html transparent and remove ALL default styles
    document.body.style.background = "transparent";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
    document.documentElement.style.background = "transparent";
    
    // Remove ANY headers, navigation, or content that isn't the widget
    const htmlStyle = document.createElement('style');
    htmlStyle.innerHTML = `
      * {
        box-sizing: border-box;
      }
      html, body {
        background-color: transparent !important;
        overflow: hidden;
        margin: 0 !important;
        padding: 0 !important;
      }
      #root {
        width: 384px !important;
        height: 600px !important;
        position: fixed !important;
        bottom: 0 !important;
        right: 0 !important;
        background: transparent !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        display: flex !important;
        align-items: flex-end !important;
        justify-content: flex-end !important;
      }
      /* Hide EVERYTHING that's not the widget */
      body > *:not(#root),
      #root > *:not(.widget-container) {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      
      /* Hide specific Vite and dev tool overlays */
      .vite-error-overlay,
      [data-vite-dev-id],
      [data-vite-status],
      div[data-vite-dev-status],
      div:has(> div[data-vite="App Status"]) {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        position: absolute !important;
        z-index: -9999 !important;
        width: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(htmlStyle);
    
    // Remove title and other page elements
    document.title = "";
    
    // Hide any elements that contain "App Status" text
    const removeStatusOverlays = () => {
      const allElements = document.querySelectorAll('*');
      allElements.forEach(element => {
        // Cast to HTMLElement to access style property
        const el = element as HTMLElement;
        
        if (el.textContent && 
            (el.textContent.includes('App Status') || 
             el.textContent.includes('Rendering') ||
             el.textContent.includes('If you can see this'))) {
          // Now we can safely set styles
          el.style.display = 'none';
          el.style.visibility = 'hidden';
          el.style.opacity = '0';
          el.style.position = 'absolute';
          el.style.zIndex = '-9999';
          el.style.width = '0';
          el.style.height = '0';
          el.style.overflow = 'hidden';
          el.style.pointerEvents = 'none';
        }
      });
    };
    
    // Run immediately and on interval to catch dynamically added elements
    removeStatusOverlays();
    const intervalId = setInterval(removeStatusOverlays, 500);
    
    return () => {
      document.head.removeChild(htmlStyle);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="widget-container">
      <CustomChatWidgetContainer isInitiallyOpen={true} />
    </div>
  );
}