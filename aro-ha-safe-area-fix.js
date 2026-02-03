/**
 * Aro-Ha AI Assistant Widget - Safe Area-Aware Webflow Embed
 * 
 * Features:
 * 1. Respects mobile safe areas including top & bottom navigation bars
 * 2. Uses modern CSS safe area insets for perfect viewport fitting
 * 3. Properly handles microphone permissions
 * 4. Works on all mobile devices without device-specific code
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
    
    /* Mobile-specific styles with safe area insets */
    @media (max-width: 768px) {
      .chat-container {
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
        padding: 0;
        
        /* Safe area insets handling */
        padding-top: env(safe-area-inset-top, 0px);
        padding-bottom: env(safe-area-inset-bottom, 0px);
        padding-left: env(safe-area-inset-left, 0px);
        padding-right: env(safe-area-inset-right, 0px);
      }
      
      /* Mobile scroll lock */
      body.mobile-widget-open {
        overflow: hidden !important;
        position: fixed !important;
        width: 100% !important;
        height: 100% !important;
      }
      
      /* For old iOS/Android browsers that don't support env() */
      @supports not (padding-top: env(safe-area-inset-top)) {
        .chat-container {
          padding-top: 40px; /* Fallback for top browser bar */
          padding-bottom: 40px; /* Fallback for bottom nav bar */
        }
      }
    }
  `;
  document.head.appendChild(style);

  // Add viewport meta tag with viewport-fit=cover for notch/safe areas
  if (!document.querySelector('meta[name="viewport"]')) {
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover, minimum-scale=1.0';
    document.head.appendChild(viewportMeta);
  } else {
    // Update existing viewport tag to include viewport-fit=cover
    const existingViewport = document.querySelector('meta[name="viewport"]');
    if (!existingViewport.content.includes('viewport-fit=cover')) {
      existingViewport.content += ', viewport-fit=cover';
    }
  }

  // Create chat button
  const chatButton = document.createElement('div');
  chatButton.className = 'chat-button';
  chatButton.id = 'chatButton';
  chatButton.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `;
  document.body.appendChild(chatButton);

  // Create overlay
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

  // Track state
  let micPermissionState = null;
  let iframeCreated = false;
  let isMobile = false;
  let originalScrollPosition = 0;
  
  // Simple mobile detection
  function detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
  }

  // Toggle scrolling prevention (only on mobile)
  function toggleMobileScrollLock(lock) {
    if (!isMobile) return; // Only apply on mobile
    
    if (lock) {
      originalScrollPosition = window.scrollY;
      document.body.classList.add('mobile-widget-open');
      document.body.style.top = -originalScrollPosition + 'px';
    } else {
      document.body.classList.remove('mobile-widget-open');
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

  // Create iframe with safe area awareness
  function createChatIframe() {
    if (iframeCreated) return;
    
    const chatIframe = document.createElement('iframe');
    chatIframe.src = 'https://arohaunifiedchat.replit.app/widget-full';
    chatIframe.title = 'Aro Ha Chat';
    chatIframe.allow = 'microphone; autoplay';
    
    if (isMobile) {
      // Calculate safe area insets for iframe positioning
      const safeAreaTop = getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0px';
      const safeAreaBottom = getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0px';
      
      // Set iframe style to respect safe areas
      chatIframe.style.position = 'absolute';
      chatIframe.style.top = safeAreaTop;
      chatIframe.style.bottom = safeAreaBottom;
      chatIframe.style.left = '0';
      chatIframe.style.right = '0';
      chatIframe.style.width = '100%';
      chatIframe.style.height = `calc(100% - ${safeAreaTop} - ${safeAreaBottom})`;
    } else {
      chatIframe.style.width = '100%';
      chatIframe.style.height = '100%';
    }
    
    chatContainer.appendChild(chatIframe);
    iframeCreated = true;
  }

  // Get actual safe area insets and set CSS variables
  function setSafeAreaVariables() {
    // Set CSS variables for safe areas - use env() when available
    try {
      // Try to get computed values of env() safe area insets
      const computedStyle = window.getComputedStyle(document.documentElement);
      const paddingTop = computedStyle.getPropertyValue('padding-top');
      const paddingBottom = computedStyle.getPropertyValue('padding-bottom');
      
      // If we have non-zero values, use them as our safe area insets
      const safeAreaTop = parseInt(paddingTop) > 0 ? paddingTop : '40px';
      const safeAreaBottom = parseInt(paddingBottom) > 0 ? paddingBottom : '40px';
      
      // Set as CSS custom properties
      document.documentElement.style.setProperty('--sat', safeAreaTop);
      document.documentElement.style.setProperty('--sab', safeAreaBottom);
    } catch (e) {
      // Fallback values
      document.documentElement.style.setProperty('--sat', '40px');
      document.documentElement.style.setProperty('--sab', '40px');
    }
  }

  // Show chat widget
  function showChat() {
    if (isMobile) {
      setSafeAreaVariables();
      toggleMobileScrollLock(true);
      chatOverlay.style.display = 'block';
    }
    
    chatButton.style.display = 'none';
    permissionDialog.style.display = 'none';
    createChatIframe();
    chatContainer.style.display = 'block';
  }

  // Hide chat widget
  function hideChat() {
    toggleMobileScrollLock(false);
    chatContainer.style.display = 'none';
    chatOverlay.style.display = 'none';
    chatButton.style.display = 'flex';
  }

  // Initialize
  async function setupEventListeners() {
    isMobile = detectMobile();
    micPermissionState = await checkMicrophonePermission();
    
    // Set initial safe area variables
    if (isMobile) {
      setSafeAreaVariables();
    }
    
    // Overlay click handler
    chatOverlay.addEventListener('click', function(e) {
      if (e.target === chatOverlay) {
        hideChat();
      }
    });
    
    // Chat button click handler
    chatButton.addEventListener('click', async function() {
      if (micPermissionState === 'granted') {
        showChat();
      } else {
        chatButton.style.display = 'none';
        permissionDialog.style.display = 'block';
        
        if (isMobile) {
          chatOverlay.style.display = 'block';
          toggleMobileScrollLock(true);
        }
      }
    });
    
    // Permission dialog buttons
    document.getElementById('permissionAllow').addEventListener('click', async function() {
      micPermissionState = await requestMicrophonePermission();
      
      if (micPermissionState === 'granted') {
        showChat();
      } else {
        alert('Microphone permission was denied. Voice features will not work. You can change this in your browser settings.');
        permissionDialog.style.display = 'none';
        showChat();
      }
    });
    
    document.getElementById('permissionCancel').addEventListener('click', function() {
      permissionDialog.style.display = 'none';
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
            const iframe = document.querySelector('.chat-container iframe');
            if (iframe && iframe.contentWindow) {
              iframe.contentWindow.postMessage({ type: 'mic-permission-update', state: micPermissionState }, '*');
            }
          });
        }
      }
    });
    
    // Update safe area on orientation change
    window.addEventListener('orientationchange', function() {
      if (isMobile && chatContainer.style.display !== 'none') {
        // Wait for orientation change to complete
        setTimeout(function() {
          setSafeAreaVariables();
          
          // Update iframe if it exists
          const iframe = document.querySelector('.chat-container iframe');
          if (iframe) {
            const safeAreaTop = getComputedStyle(document.documentElement).getPropertyValue('--sat');
            const safeAreaBottom = getComputedStyle(document.documentElement).getPropertyValue('--sab');
            
            iframe.style.top = safeAreaTop;
            iframe.style.bottom = safeAreaBottom;
            iframe.style.height = `calc(100% - ${safeAreaTop} - ${safeAreaBottom})`;
          }
        }, 300);
      }
    });
    
    // Handle window resize events
    window.addEventListener('resize', function() {
      if (isMobile && chatContainer.style.display !== 'none') {
        setSafeAreaVariables();
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEventListeners);
  } else {
    setupEventListeners();
  }
})();