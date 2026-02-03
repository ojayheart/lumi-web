/**
 * Aro-Ha AI Assistant Widget - iOS-Optimized Webflow Embed Code
 * 
 * Special fixes for iOS devices:
 * 1. Prevents background scrolling when widget is open
 * 2. Accounts for iOS browser UI elements
 * 3. Properly handles microphone permissions
 * 4. Prevents touch events from bleeding through to the page
 */
(function() {
  // Create and inject CSS
  const style = document.createElement('style');
  style.textContent = `
    /* Widget Styles */
    .chat-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #8E8F70;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      cursor: pointer;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid rgba(255, 255, 255, 0.8);
    }
    
    .chat-button svg {
      width: 30px;
      height: 30px;
      fill: white;
    }
    
    /* Overlay to block background scrolling */
    .chat-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 9997;
      display: none;
      -webkit-backdrop-filter: blur(5px);
      backdrop-filter: blur(5px);
    }
    
    .chat-container {
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
    
    .chat-container iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    
    /* Permission Dialog Styles */
    .permission-dialog {
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
    
    .permission-dialog h3 {
      margin-top: 0;
      color: #8E8F70;
    }
    
    .permission-dialog p {
      margin-bottom: 20px;
      line-height: 1.5;
    }
    
    .permission-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    
    .permission-button {
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      border: none;
    }
    
    .permission-button.primary {
      background-color: #8E8F70;
      color: white;
    }
    
    .permission-button.secondary {
      background-color: #f1f1f1;
      color: #333;
    }
    
    /* iOS-specific chat header to make room for browser UI */
    .ios-chat-header {
      display: none;
      height: 0;
      background-color: #8E8F70;
    }
    
    @media (max-width: 768px) {
      .chat-container, .permission-dialog {
        width: 100vw;
        height: 100vh;
        bottom: 0;
        right: 0;
        border-radius: 0;
      }
      
      .chat-container {
        display: flex;
        flex-direction: column;
      }
      
      .ios-chat-header {
        display: block;
      }
      
      .chat-container iframe {
        width: 100%;
        flex: 1;
        border: none;
        height: auto; /* Use flex instead of height */
      }
      
      .permission-dialog {
        height: auto;
        max-height: 100vh;
      }
    }
    
    /* When body has this class, prevent scrolling */
    body.widget-open {
      overflow: hidden !important;
      position: fixed !important;
      width: 100% !important;
      height: 100% !important;
    }
  `;
  document.head.appendChild(style);

  // Add proper viewport meta tag for iOS
  const viewportMeta = document.createElement('meta');
  viewportMeta.name = 'viewport';
  viewportMeta.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, maximum-scale=1.0';
  document.head.appendChild(viewportMeta);

  // Create chat button
  const chatButton = document.createElement('div');
  chatButton.className = 'chat-button';
  chatButton.id = 'chatButton';
  chatButton.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <!-- MessageSquare from Lucide (minimal chat icon - outline only) -->
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `;
  document.body.appendChild(chatButton);

  // Create overlay to prevent background scrolling and interaction
  const chatOverlay = document.createElement('div');
  chatOverlay.className = 'chat-overlay';
  chatOverlay.id = 'chatOverlay';
  document.body.appendChild(chatOverlay);

  // Create chat container
  const chatContainer = document.createElement('div');
  chatContainer.className = 'chat-container';
  chatContainer.id = 'chatContainer';
  
  // Add iOS-specific header for browser UI
  const iosHeader = document.createElement('div');
  iosHeader.className = 'ios-chat-header';
  iosHeader.id = 'iosHeader';
  chatContainer.appendChild(iosHeader);
  
  document.body.appendChild(chatContainer);
  
  // Create permission dialog
  const permissionDialog = document.createElement('div');
  permissionDialog.className = 'permission-dialog';
  permissionDialog.id = 'permissionDialog';
  permissionDialog.innerHTML = `
    <h3>Microphone Access Required</h3>
    <p>To use voice features in our chat, your browser needs permission to access your microphone. When prompted, please select "Allow" to enable voice interactions.</p>
    <div class="permission-actions">
      <button id="permissionCancel" class="permission-button secondary">Cancel</button>
      <button id="permissionAllow" class="permission-button primary">Allow Microphone</button>
    </div>
  `;
  document.body.appendChild(permissionDialog);

  // Variables to track states
  let micPermissionState = null;
  let iframeCreated = false;
  let isIOS = false;
  let originalScrollPosition = 0;
  
  // Detect iOS specifically
  function detectiOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  // Adjust for iOS browser UI
  function adjustForIOSUI() {
    if (!isIOS) return;
    
    // Determine safe area for iOS
    const headerHeight = 60; // Default fallback
    
    // Set the iOS header height
    const iosHeader = document.getElementById('iosHeader');
    if (iosHeader) {
      iosHeader.style.height = headerHeight + 'px';
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
      // Stop the stream immediately after getting permission
      stream.getTracks().forEach(track => track.stop());
      return 'granted';
    } catch (error) {
      console.log('Microphone permission denied:', error);
      return 'denied';
    }
  }

  // Create iframe with proper permissions and iOS specific handling
  function createChatIframe() {
    if (iframeCreated) return;
    
    const chatIframe = document.createElement('iframe');
    chatIframe.src = 'https://arohaunifiedchat.replit.app/widget-full';
    chatIframe.title = 'Aro Ha Chat';
    // Explicitly allow microphone
    chatIframe.allow = 'microphone; autoplay';
    
    // Special handling for iOS devices
    if (isIOS) {
      chatIframe.style.marginTop = '0';
      
      // Additional attributes for iOS
      chatIframe.setAttribute('webkit-playsinline', 'true');
      chatIframe.setAttribute('playsinline', 'true');
    }
    
    chatContainer.appendChild(chatIframe);
    iframeCreated = true;
  }

  // Prevent background scrolling on iOS
  function preventBackgroundScrolling(prevent) {
    if (prevent) {
      // Store current scroll position before locking
      originalScrollPosition = window.scrollY;
      // Add class to body to prevent scrolling
      document.body.classList.add('widget-open');
      // iOS specific position fixing
      if (isIOS) {
        document.body.style.top = -originalScrollPosition + 'px';
      }
    } else {
      // Remove the scroll lock
      document.body.classList.remove('widget-open');
      // Restore scroll position on iOS
      if (isIOS) {
        document.body.style.top = '';
        window.scrollTo(0, originalScrollPosition);
      }
    }
  }

  // Show the chat widget
  function showChat() {
    // Store scroll position and prevent background scrolling
    preventBackgroundScrolling(true);
    
    // Hide button and permission dialog, show overlay
    chatButton.style.display = 'none';
    permissionDialog.style.display = 'none';
    chatOverlay.style.display = 'block';
    
    // Create the iframe if not already created
    createChatIframe();
    
    // Show the chat container
    chatContainer.style.display = 'flex';
    
    // Adjust for iOS UI
    adjustForIOSUI();
  }

  // Hide the chat widget
  function hideChat() {
    // Restore scrolling
    preventBackgroundScrolling(false);
    
    // Hide chat container and overlay, show button
    chatContainer.style.display = 'none';
    chatOverlay.style.display = 'none';
    chatButton.style.display = 'flex';
  }

  // Set up event listeners after DOM is fully loaded
  async function setupEventListeners() {
    // Detect iOS
    isIOS = detectiOS();
    console.log('Detected iOS device:', isIOS);
    
    // Check initial microphone permission
    micPermissionState = await checkMicrophonePermission();
    
    // Overlay click handler (closes widget)
    chatOverlay.addEventListener('click', function(e) {
      // Only close if clicking directly on the overlay (not its children)
      if (e.target === chatOverlay) {
        hideChat();
      }
    });
    
    // Chat button click handler
    chatButton.addEventListener('click', async function() {
      if (micPermissionState === 'granted') {
        // If microphone is already allowed, just show the chat
        showChat();
      } else {
        // Otherwise show the permission dialog first
        chatButton.style.display = 'none';
        permissionDialog.style.display = 'block';
        
        // Also show overlay for permission dialog
        chatOverlay.style.display = 'block';
        
        // Prevent background scrolling
        preventBackgroundScrolling(true);
      }
    });
    
    // Permission dialog button handlers
    document.getElementById('permissionAllow').addEventListener('click', async function() {
      // Request microphone permission
      micPermissionState = await requestMicrophonePermission();
      
      if (micPermissionState === 'granted') {
        showChat();
      } else {
        // If denied, show an alert and close the dialog
        alert('Microphone permission was denied. Voice features will not work. You can change this in your browser settings.');
        permissionDialog.style.display = 'none';
        showChat(); // Show chat anyway, but without mic
      }
    });
    
    document.getElementById('permissionCancel').addEventListener('click', function() {
      // User cancelled, show chat anyway
      permissionDialog.style.display = 'none';
      showChat();
    });
    
    // Listen for close message from the chat iframe
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'widget-close') {
        hideChat();
      }
      
      // Listen for voice call starting
      if (event.data && event.data.type === 'voice-call-starting') {
        // Request mic permission if not already granted
        if (micPermissionState !== 'granted') {
          requestMicrophonePermission().then(state => {
            micPermissionState = state;
            // Notify the iframe of the new permission state
            const iframe = document.querySelector('.chat-container iframe');
            if (iframe && iframe.contentWindow) {
              iframe.contentWindow.postMessage({ type: 'mic-permission-update', state: micPermissionState }, '*');
            }
          });
        }
      }
    });
    
    // Add orientation change handler for iOS
    window.addEventListener('orientationchange', function() {
      // Small delay to let the browser UI settle
      setTimeout(function() {
        adjustForIOSUI();
      }, 300);
    });
    
    // Handle iOS keyboard appearing and disappearing
    window.addEventListener('resize', function() {
      if (isIOS && chatContainer.style.display !== 'none') {
        adjustForIOSUI();
      }
    });
  }

  // Initialize when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEventListeners);
  } else {
    setupEventListeners();
  }
})();