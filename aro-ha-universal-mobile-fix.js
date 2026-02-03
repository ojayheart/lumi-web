/**
 * Aro-Ha AI Assistant Widget - Universal Mobile-Optimized Webflow Embed
 * 
 * Features:
 * 1. Properly handles all mobile devices (iOS, Android, Samsung)
 * 2. Only disables scrolling on mobile devices when widget is open
 * 3. Preserves normal scrolling behavior on desktop
 * 4. Properly handles microphone permissions
 * 5. Ensures widget fits properly in mobile viewports
 * 6. Adaptive to different mobile browsers and UI elements
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
    
    /* Overlay for mobile only */
    .chat-overlay {
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
    
    /* Mobile-specific styles (phone, tablet) using a standard breakpoint */
    @media (max-width: 768px) {
      /* Fullscreen on mobile devices */
      .chat-container, .permission-dialog {
        width: 100%;
        height: 100%;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        max-width: 100%;
        max-height: 100%;
        border-radius: 0;
        margin: 0;
        padding: 0;
      }
      
      /* Mobile header padding for browser bar */
      .chat-container:before {
        content: '';
        display: block;
        height: var(--browser-bar-height, 0px);
        width: 100%;
        background-color: #8E8F70;
      }
      
      .permission-dialog {
        top: auto;
        height: auto;
        max-height: 90%;
        padding: 20px;
      }
      
      /* This class prevents scrolling on mobile only */
      body.mobile-widget-open {
        overflow: hidden !important;
        position: fixed !important;
        width: 100% !important;
        height: 100% !important;
      }
    }
  `;
  document.head.appendChild(style);

  // Add effective viewport meta tag for mobile devices
  if (!document.querySelector('meta[name="viewport"]')) {
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover, minimum-scale=1.0';
    document.head.appendChild(viewportMeta);
  }

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

  // Create overlay (for mobile only)
  const chatOverlay = document.createElement('div');
  chatOverlay.className = 'chat-overlay';
  chatOverlay.id = 'chatOverlay';
  document.body.appendChild(chatOverlay);

  // Create chat container
  const chatContainer = document.createElement('div');
  chatContainer.className = 'chat-container';
  chatContainer.id = 'chatContainer';
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

  // State tracking variables
  let micPermissionState = null;
  let iframeCreated = false;
  let isMobile = false;
  let browserBarHeight = 0;
  let originalScrollPosition = 0;
  
  // Device detection functions for more accurate targeting
  function detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
  }

  function detectBrowserType() {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
      return 'ios';
    } else if (/Android/.test(ua)) {
      return 'android';
    } else if (/Samsung/i.test(ua)) {
      return 'samsung';
    }
    return 'desktop';
  }

  // Calculate browser UI element heights for different devices
  function calculateBrowserBarHeight() {
    const browserType = detectBrowserType();
    
    // Default heights based on common browser UI elements
    if (browserType === 'ios') {
      return window.innerWidth < 768 ? 50 : 0; // Taller on phones
    } else if (browserType === 'android' || browserType === 'samsung') {
      return window.innerWidth < 768 ? 56 : 0; // Samsung/Android browsers
    }
    return 0; // No offset on desktop
  }

  // Initialize device-specific CSS variables
  function initDeviceSpecificStyles() {
    browserBarHeight = calculateBrowserBarHeight();
    document.documentElement.style.setProperty('--browser-bar-height', browserBarHeight + 'px');
  }

  // Toggle scrolling prevention (only on mobile)
  function toggleMobileScrollLock(lock) {
    if (!isMobile) return; // Only apply on mobile
    
    if (lock) {
      // Store current scroll position before locking
      originalScrollPosition = window.scrollY;
      // Add class to body to prevent scrolling on mobile
      document.body.classList.add('mobile-widget-open');
      // Set top position to maintain visual position
      document.body.style.top = -originalScrollPosition + 'px';
    } else {
      // Remove scroll lock
      document.body.classList.remove('mobile-widget-open');
      // Restore scroll position
      document.body.style.top = '';
      window.scrollTo(0, originalScrollPosition);
    }
  }

  // Check if microphone is already permitted
  async function checkMicrophonePermission() {
    try {
      // First check localStorage to see if permission was already granted
      const savedPermission = localStorage.getItem('aro_ha_mic_permission');
      if (savedPermission === 'granted') {
        console.log('Using saved microphone permission from localStorage');
        return 'granted';
      }
      
      // Otherwise check browser permission status
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
      
      // If permission is granted, save it for future reference
      if (permissionStatus.state === 'granted') {
        localStorage.setItem('aro_ha_mic_permission', 'granted');
      }
      
      return permissionStatus.state;
    } catch (error) {
      console.log('Could not check permission state:', error);
      return 'unknown';
    }
  }

  // Request microphone permission
  async function requestMicrophonePermission() {
    try {
      // First check if permission is already saved
      const savedPermission = localStorage.getItem('aro_ha_mic_permission');
      if (savedPermission === 'granted') {
        console.log('Using saved microphone permission from localStorage');
        return 'granted';
      }
      
      // Otherwise, request permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately after getting permission
      stream.getTracks().forEach(track => track.stop());
      
      // Save the granted permission to localStorage
      localStorage.setItem('aro_ha_mic_permission', 'granted');
      
      return 'granted';
    } catch (error) {
      console.log('Microphone permission denied:', error);
      return 'denied';
    }
  }

  // Create iframe with proper mobile optimization
  function createChatIframe() {
    if (iframeCreated) return;
    
    const chatIframe = document.createElement('iframe');
    chatIframe.src = 'https://arohaunifiedchat.replit.app/widget-full';
    chatIframe.title = 'Aro Ha Chat';
    // Explicitly allow microphone
    chatIframe.allow = 'microphone; autoplay';
    
    // Special handling for mobile devices
    if (isMobile) {
      // Set height dynamically to account for browser UI
      const viewportHeight = window.innerHeight;
      const adjustedHeight = viewportHeight - browserBarHeight;
      
      chatIframe.style.height = adjustedHeight + 'px';
      chatIframe.style.width = '100%';
      chatIframe.style.position = 'absolute';
      chatIframe.style.top = browserBarHeight + 'px';
      chatIframe.style.left = '0';
      
      // Make sure the iframe can receive touch events
      chatIframe.style.touchAction = 'auto';
    }
    
    chatContainer.appendChild(chatIframe);
    iframeCreated = true;
  }

  // Show the chat widget
  function showChat() {
    // Only prevent scrolling on mobile devices
    toggleMobileScrollLock(true);
    
    // Hide button and permission dialog
    chatButton.style.display = 'none';
    permissionDialog.style.display = 'none';
    
    // Show overlay on mobile only
    if (isMobile) {
      chatOverlay.style.display = 'block';
    }
    
    // Create the iframe if not already created
    createChatIframe();
    
    // Show the chat container
    chatContainer.style.display = 'block';
  }

  // Hide the chat widget
  function hideChat() {
    // Restore scrolling (mobile only)
    toggleMobileScrollLock(false);
    
    // Hide chat container and overlay, show button
    chatContainer.style.display = 'none';
    chatOverlay.style.display = 'none';
    chatButton.style.display = 'flex';
  }

  // Set up event listeners after DOM is fully loaded
  async function setupEventListeners() {
    // Detect device type
    isMobile = detectMobile();
    
    // Initialize device-specific styles
    initDeviceSpecificStyles();
    
    // Check initial microphone permission
    micPermissionState = await checkMicrophonePermission();
    
    // Overlay click handler (closes widget) - mobile only
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
        
        // Also show overlay for permission dialog on mobile
        if (isMobile) {
          chatOverlay.style.display = 'block';
          toggleMobileScrollLock(true);
        }
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
    
    // Handle orientation changes and resize events for mobile
    window.addEventListener('orientationchange', function() {
      if (isMobile) {
        // Re-calculate browser bar height and update styles
        setTimeout(function() {
          initDeviceSpecificStyles();
          
          // Adjust iframe if it exists
          if (iframeCreated) {
            const chatIframe = document.querySelector('.chat-container iframe');
            if (chatIframe) {
              const viewportHeight = window.innerHeight;
              const adjustedHeight = viewportHeight - browserBarHeight;
              
              chatIframe.style.height = adjustedHeight + 'px';
              chatIframe.style.top = browserBarHeight + 'px';
            }
          }
        }, 300);
      }
    });
    
    // Handle resize events
    window.addEventListener('resize', function() {
      // Only handle on mobile and when chat is visible
      if (isMobile && chatContainer.style.display !== 'none') {
        // Recalculate measurements
        initDeviceSpecificStyles();
        
        // Update iframe dimensions if it exists
        if (iframeCreated) {
          const chatIframe = document.querySelector('.chat-container iframe');
          if (chatIframe) {
            const viewportHeight = window.innerHeight;
            const adjustedHeight = viewportHeight - browserBarHeight;
            
            chatIframe.style.height = adjustedHeight + 'px';
            chatIframe.style.top = browserBarHeight + 'px';
          }
        }
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