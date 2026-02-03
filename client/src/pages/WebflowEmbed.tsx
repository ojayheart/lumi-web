import React, { useEffect } from 'react';
import CustomChatWidgetContainer from '../components/CustomChatWidgetContainer';

export default function WebflowEmbed() {
  useEffect(() => {
    // Add specific styles for embedded context
    const style = document.createElement('style');
    style.textContent = `
      html, body {
        background: transparent !important;
        overflow: hidden;
      }
      
      /* Make sure that nothing blocks page interactions */
      #root {
        pointer-events: none !important;
      }
      
      /* Only enable pointer events on the button explicitly */
      .chat-button {
        pointer-events: auto !important;
      }
      
      /* Only enable pointer events on the widget when expanded */
      .chat-widget.expanded {
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(style);
    
    // Function to remove any Vite status messages
    function removeStatusMessages() {
      document.querySelectorAll('body > div:not(#root)').forEach(el => {
        if (el.textContent && (
          el.textContent.includes('App Status') || 
          el.textContent.includes('Rendering')
        )) {
          el.remove();
        }
      });
    }
    
    // Run repeatedly to catch any messages
    removeStatusMessages();
    const interval = setInterval(removeStatusMessages, 100);
    
    // Notify the parent frame that we're ready
    try {
      window.parent.postMessage({ type: 'widget-loaded' }, '*');
    } catch (e) {
      console.error('Failed to notify parent window:', e);
    }
    
    return () => {
      clearInterval(interval);
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  return (
    <div style={{ pointerEvents: 'none' }}>
      <CustomChatWidgetContainer isWebflowEmbed={true} />
    </div>
  );
}