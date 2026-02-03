import { useEffect, useState } from 'react';
import { ChatBubbleSparkle } from '../components/AIIcons';

/**
 * This component renders just the button portion of the chat widget
 * It's designed to be embedded in a small iframe
 */
export default function WidgetButton() {
  // State for tracking which button has hover
  const [hoverState, setHoverState] = useState({
    main: false,
    text: false,
    voice: false
  });

  // Send message to parent window when button is clicked
  const handleButtonClick = () => {
    if (window.parent) {
      window.parent.postMessage({ type: 'button-click' }, '*');
    }
  };

  // Function to remove Vite status messages
  function removeViteStatusMessage() {
    const interval = setInterval(() => {
      const statusElement = document.querySelector('#vite-status');
      if (statusElement) {
        statusElement.remove();
        clearInterval(interval);
      }
      
      // Also remove any status overlay elements
      const overlays = document.querySelectorAll('[data-vite-dev-overlay]');
      overlays.forEach(el => el.remove());
    }, 100);

    return () => clearInterval(interval);
  }

  useEffect(() => {
    // Set body styles for proper display
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.background = 'transparent';
    
    // Make entire page transparent to clicks
    document.documentElement.style.pointerEvents = 'none';
    
    // Remove Vite status messages
    removeViteStatusMessage();
  }, []);

  return (
    <div className="fixed bottom-2 right-2 z-50 flex flex-col items-end pointer-events-none">
      {/* Main button */}
      <div
        className="w-14 h-14 rounded-full shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200 flex items-center justify-center relative mb-2"
        style={{ 
          pointerEvents: 'auto',
          backgroundColor: '#767657', // Exact match to the color in the screenshot
          border: '1px solid rgba(255, 255, 255, 0.5)' // Subtle white border
        }}
        onClick={handleButtonClick}
        onMouseEnter={() => setHoverState({ ...hoverState, main: true })}
        onMouseLeave={() => setHoverState({ ...hoverState, main: false })}
      >
        {/* Use our custom ChatBubbleSparkle icon that matches the screenshot */}
        <ChatBubbleSparkle className="w-8 h-8" color="white" />
      </div>
    </div>
  );
}