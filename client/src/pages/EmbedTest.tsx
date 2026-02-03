import { useEffect } from 'react';

export default function EmbedTest() {
  useEffect(() => {
    // Create the Aro-Ha widget embed script dynamically
    const script = document.createElement('script');
    script.innerHTML = `
/**
 * Aro-Ha AI Assistant Widget - Bug-Fixed Toggling Embed
 * 
 * Features:
 * 1. Fixed reopening bug - properly shows/hides on all clicks
 * 2. Uses modern CSS custom properties for perfect viewport fit
 * 3. Properly handles microphone permissions
 * 4. Correctly manages visibility state on each transition
 */
(function() {
  // Create and inject CSS
  const style = document.createElement('style');
  style.textContent = \`
    /* Widget Styles */
    :root {
      --aro-primary: #8E8F70;
      --aro-button-size: 60px;
      --app-height: 100vh;
    }
    
    .aro-chat-button {
      position: fixed;
      bottom: max(20px, env(safe-area-inset-bottom, 20px));
      right: 20px;
      width: var(--aro-button-size);
      height: var(--aro-button-size);
      border-radius: 50%;
      background-color: var(--aro-primary);
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      cursor: pointer;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid rgba(255, 255, 255, 0.8);
    }
    
    .aro-chat-button svg {
      width: 30px;
      height: 30px;
      fill: white;
    }
    
    /* Overlay for mobile only */
    .aro-chat-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.4);
      z-index: 9997;
      display: none;
      -webkit-backdrop-filter: blur(3px);
      backdrop-filter: blur(3px);
    }
    
    /* Base chat container styles */
    .aro-chat-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 380px;
      height: 580px;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 5px 40px rgba(0,0,0,0.16);
      z-index: 9998;
      display: none;
    }
    
    .aro-chat-container iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    
    /* Permission Dialog Styles */
    .aro-permission-dialog {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 380px;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 5px 40px rgba(0,0,0,0.16);
      z-index: 10000;
      display: none;
      padding: 20px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .aro-permission-dialog h3 {
      margin-top: 0;
      color: var(--aro-primary);
    }
    
    .aro-permission-dialog p {
      margin-bottom: 20px;
      line-height: 1.5;
    }
    
    .aro-permission-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    
    .aro-permission-button {
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      border: none;
    }
    
    .aro-permission-button.primary {
      background-color: var(--aro-primary);
      color: white;
    }
    
    .aro-permission-button.secondary {
      background-color: #f1f1f1;
      color: #333;
    }
    
    /* Mobile-specific styles with safe area insets */
    @media (max-width: 768px) {
      .aro-chat-container {
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: 100%;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: 0;
        margin: 0;
        padding-top: env(safe-area-inset-top, 0px);
        padding-bottom: env(safe-area-inset-bottom, 0px);
      }
      
      /* Mobile scroll lock */
      body.aro-mobile-widget-open {
        overflow: hidden !important;
        position: fixed !important;
        width: 100% !important;
        height: 100% !important;
      }
      
      .aro-permission-dialog {
        width: 90%;
        max-width: 400px;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        right: auto;
        bottom: auto;
      }
    }
  \`;
  document.head.appendChild(style);

  // Add viewport meta tag with viewport-fit=cover for notch/safe areas
  if (!document.querySelector('meta[name="viewport"]')) {
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no';
    document.head.appendChild(viewportMeta);
  } else {
    // Update existing viewport tag if necessary
    const existingViewport = document.querySelector('meta[name="viewport"]');
    if (!existingViewport.content.includes('viewport-fit=cover')) {
      existingViewport.content += ', viewport-fit=cover';
    }
  }

  // Update viewport height CSS variable
  function updateViewportHeight() {
    document.documentElement.style.setProperty('--app-height', \`\${window.innerHeight}px\`);
  }

  // Create chat button
  const chatButton = document.createElement('div');
  chatButton.className = 'aro-chat-button';
  chatButton.id = 'aroChatButton';
  chatButton.innerHTML = \`
    <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  \`;
  document.body.appendChild(chatButton);

  // Create overlay
  const chatOverlay = document.createElement('div');
  chatOverlay.className = 'aro-chat-overlay';
  chatOverlay.id = 'aroChatOverlay';
  document.body.appendChild(chatOverlay);

  // Create chat container
  const chatContainer = document.createElement('div');
  chatContainer.className = 'aro-chat-container';
  chatContainer.id = 'aroChatContainer';
  document.body.appendChild(chatContainer);

  // Create permission dialog
  const permissionDialog = document.createElement('div');
  permissionDialog.className = 'aro-permission-dialog';
  permissionDialog.id = 'aroPermissionDialog';
  permissionDialog.innerHTML = \`
    <h3>Microphone Access Required</h3>
    <p>To use voice features in our chat, your browser needs permission to access your microphone. When prompted, please select "Allow" to enable voice interactions.</p>
    <div class="aro-permission-actions">
      <button id="aroPermissionCancel" class="aro-permission-button secondary">Cancel</button>
      <button id="aroPermissionAllow" class="aro-permission-button primary">Allow Microphone</button>
    </div>
  \`;
  document.body.appendChild(permissionDialog);

  // State management
  let micPermissionState = null;
  let iframeCreated = false;
  let isMobile = false;
  let originalScrollPosition = 0;
  let widgetVisible = false; // Track widget visibility state
  
  // Simple mobile detection
  function detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
  }

  // Toggle scrolling prevention (only on mobile)
  function toggleMobileScrollLock(lock) {
    if (!isMobile) return; // Only apply on mobile
    
    if (lock) {
      originalScrollPosition = window.scrollY;
      document.body.classList.add('aro-mobile-widget-open');
      document.body.style.top = \`-\${originalScrollPosition}px\`;
    } else {
      document.body.classList.remove('aro-mobile-widget-open');
      document.body.style.top = '';
      window.scrollTo(0, originalScrollPosition);
    }
  }

  // Check if microphone is already permitted
  async function checkMicrophonePermission() {
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
      return permissionStatus.state;
    } catch (error) {
      console.log('Could not check permission state:', error);
      return 'unknown';
    }
  }

  // Request microphone permission
  async function requestMicrophonePermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return 'granted';
    } catch (error) {
      console.log('Microphone permission denied:', error);
      return 'denied';
    }
  }

  // Create iframe once
  function createChatIframe() {
    if (iframeCreated) return;
    
    // Clear container first
    chatContainer.innerHTML = '';
    
    // Create the iframe
    const chatIframe = document.createElement('iframe');
    chatIframe.src = window.location.origin + '/widget-only';
    chatIframe.title = 'Aro Ha Chat';
    chatIframe.allow = 'microphone; autoplay';
    chatIframe.style.width = '100%';
    chatIframe.style.height = '100%';
    chatIframe.style.border = 'none';
    
    // Add iframe to container
    chatContainer.appendChild(chatIframe);
    iframeCreated = true;
  }

  // Show chat widget - guaranteed to work every time
  function showChat() {
    updateViewportHeight();
    toggleMobileScrollLock(true);
    
    // Explicitly set visibility state to track
    widgetVisible = true;

    // First hide the button
    chatButton.style.display = 'none';
    
    // Remove any previous display: none that may have been set
    chatContainer.style.removeProperty('display');
    
    // Then explicitly set to block to ensure visibility
    chatContainer.style.display = 'block';
    
    if (isMobile) {
      chatOverlay.style.display = 'block';
    }
    
    // Create iframe if not created
    createChatIframe();
  }

  // Hide chat widget - guaranteed to work every time
  function hideChat() {
    // Explicitly set visibility state to track
    widgetVisible = false;
    
    // First hide widget and overlay
    chatContainer.style.display = 'none';
    chatOverlay.style.display = 'none';
    
    // Release scroll lock
    toggleMobileScrollLock(false);
    
    // Re-enable the chat button
    chatButton.style.removeProperty('display');
    chatButton.style.display = 'flex';
  }

  // Show permission dialog
  function showPermissionDialog() {
    toggleMobileScrollLock(true);
    
    chatButton.style.display = 'none';
    permissionDialog.style.display = 'block';
    
    if (isMobile) {
      chatOverlay.style.display = 'block';
    }
  }

  // Hide permission dialog
  function hidePermissionDialog() {
    permissionDialog.style.display = 'none';
  }

  // Initialize
  async function initialize() {
    isMobile = detectMobile();
    micPermissionState = await checkMicrophonePermission();
    updateViewportHeight();
    
    // Overlay click handler
    chatOverlay.addEventListener('click', function(e) {
      if (e.target === chatOverlay) {
        hideChat();
      }
    });
    
    // Chat button click handler - toggle behavior
    chatButton.addEventListener('click', async function() {
      if (micPermissionState === 'granted') {
        showChat();
      } else {
        showPermissionDialog();
      }
    });
    
    // Permission dialog buttons
    document.getElementById('aroPermissionAllow').addEventListener('click', async function() {
      micPermissionState = await requestMicrophonePermission();
      
      hidePermissionDialog();
      
      if (micPermissionState === 'granted') {
        showChat();
      } else {
        alert('Microphone permission was denied. Voice features will not work. You can change this in your browser settings.');
        showChat();
      }
    });
    
    document.getElementById('aroPermissionCancel').addEventListener('click', function() {
      hidePermissionDialog();
      showChat();
    });
    
    // Listen for close message from iframe
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'widget-close') {
        hideChat();
      }
      
      // Voice call starting
      if (event.data && event.data.type === 'voice-call-starting') {
        if (micPermissionState !== 'granted') {
          requestMicrophonePermission().then(state => {
            micPermissionState = state;
            const iframe = document.querySelector('.aro-chat-container iframe');
            if (iframe && iframe.contentWindow) {
              iframe.contentWindow.postMessage({ type: 'mic-permission-update', state: micPermissionState }, '*');
            }
          });
        }
      }
    });
    
    // Window resize handler for viewport height
    window.addEventListener('resize', function() {
      isMobile = detectMobile();
      updateViewportHeight();
    });
    
    // Handle orientation changes specifically
    window.addEventListener('orientationchange', function() {
      setTimeout(function() {
        updateViewportHeight();
      }, 200);
    });
    
    // Fix for keyboard open/close on mobile
    if (isMobile && window.visualViewport) {
      window.visualViewport.addEventListener('resize', function() {
        updateViewportHeight();
      });
    }
    
    // Keyboard escape key to close
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && widgetVisible) {
        hideChat();
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
    `;
    
    document.head.appendChild(script);

    // Cleanup on unmount
    return () => {
      // Remove the embed elements
      const elements = document.querySelectorAll('.aro-chat-button, .aro-chat-container, .aro-chat-overlay, .aro-permission-dialog');
      elements.forEach(el => el.remove());
      
      // Remove body classes
      document.body.classList.remove('aro-mobile-widget-open');
      document.body.style.removeProperty('top');
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Aro-Ha Widget Embedding Test Page
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Embedding Overview
          </h2>
          <p className="text-gray-600 mb-4">
            This page demonstrates the Aro-Ha widget embedding approach featuring:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-6">
            <li><strong>Single DOM button</strong> - Native chat button created directly in the page</li>
            <li><strong>Iframe chat container</strong> - Widget iframe loads when button is clicked</li>
            <li><strong>Microphone permissions</strong> - Handles permission requests before showing chat</li>
            <li><strong>Mobile optimized</strong> - Fullscreen on mobile with scroll locking</li>
            <li><strong>Safe area support</strong> - Handles device notches and browser UI</li>
          </ul>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">Testing Instructions:</h3>
            <ol className="list-decimal list-inside text-yellow-700 space-y-1">
              <li>Click the chat button in the bottom right corner</li>
              <li>The chat interface should slide up with a smooth animation</li>
              <li>Click the backdrop or close button to dismiss</li>
              <li>Test on mobile for fullscreen behavior</li>
            </ol>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Button Component Styling
            </h3>
            <p className="text-gray-600 mb-4">
              The button is created directly in the DOM with CSS custom properties:
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 60px × 60px circular button (--aro-button-size)</li>
              <li>• Aro-Ha brand color #8E8F70 (--aro-primary)</li>
              <li>• Safe area insets for mobile devices</li>
              <li>• Native DOM element, not iframe</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Chat Component
            </h3>
            <p className="text-gray-600 mb-4">
              The chat loads the widget at <code className="bg-gray-100 px-2 py-1 rounded">/widget-only</code>
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 380px × 580px on desktop</li>
              <li>• Fullscreen on mobile with scroll locking</li>
              <li>• Microphone permission handling</li>
              <li>• Escape key and overlay click to close</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Sample Content
          </h3>
          <p className="text-gray-600 mb-4">
            This is sample page content to demonstrate how the chat widget overlays on top of existing content.
            The widget should not interfere with normal page interaction when closed.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-gray-50 rounded p-4">
                <h4 className="font-semibold text-gray-700 mb-2">Sample Card {i}</h4>
                <p className="text-gray-600 text-sm">
                  This is sample content to show how the page looks with the chat widget overlay.
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}