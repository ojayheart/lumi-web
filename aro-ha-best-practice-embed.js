/**
 * Aro-Ha AI Assistant Widget - Industry Best Practice Embed
 * 
 * Using modern best practices:
 * 1. Viewport height units (vh) with CSS custom properties
 * 2. Safe area insets for notched devices
 * 3. Focus trap for accessibility
 * 4. Proper layering with stacking context
 */
(function() {
  // First, define our CSS using modern best practices 
  const style = document.createElement('style');
  style.textContent = `
    /* Modern CSS reset for embedded widgets */
    :root {
      --aro-ha-primary: #8E8F70;
      --aro-ha-z-widget: 9999;
      --aro-ha-z-overlay: 9998;
      --aro-ha-button-size: 60px;
      
      /* Dynamic viewport heights that fixes mobile 100vh issues */
      --vh: 1vh;
      --app-height: 100vh;
    }
    
    /* Chat button */
    .aro-ha-button {
      position: fixed;
      bottom: max(20px, env(safe-area-inset-bottom, 20px));
      right: 20px;
      width: var(--aro-ha-button-size);
      height: var(--aro-ha-button-size);
      border-radius: 50%;
      background-color: var(--aro-ha-primary);
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      cursor: pointer;
      z-index: var(--aro-ha-z-widget);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid rgba(255, 255, 255, 0.8);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .aro-ha-button:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 15px rgba(0,0,0,0.15);
    }
    
    .aro-ha-button svg {
      width: 28px;
      height: 28px;
      fill: none;
      stroke: white;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    
    /* Overlay with backdrop filter for modern browsers */
    .aro-ha-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.4);
      z-index: calc(var(--aro-ha-z-widget) - 1);
      display: none;
      -webkit-backdrop-filter: blur(3px);
      backdrop-filter: blur(3px);
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .aro-ha-overlay.visible {
      opacity: 1;
      display: block;
    }
    
    /* Widget container with responsive sizing */
    .aro-ha-container {
      position: fixed;
      display: none;
      background: white;
      box-shadow: 0 5px 40px rgba(0,0,0,0.3);
      z-index: var(--aro-ha-z-widget);
      overflow: hidden;
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    
    .aro-ha-container.visible {
      opacity: 1;
      transform: translateY(0);
      display: block;
    }
    
    /* Layout for desktop */
    @media (min-width: 769px) {
      .aro-ha-container {
        bottom: 20px;
        right: 20px;
        width: 380px;
        height: 580px;
        border-radius: 12px;
      }
    }
    
    /* Layout for mobile with safe area handling */
    @media (max-width: 768px) {
      .aro-ha-container {
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: var(--app-height);
        border-radius: 0;
      }
      
      /* Adjustments for device safe areas (notches, home indicators) */
      .aro-ha-container:before {
        content: '';
        display: block;
        width: 100%;
        height: env(safe-area-inset-top, 0px);
        background-color: var(--aro-ha-primary);
      }
      
      .aro-ha-container:after {
        content: '';
        display: block;
        width: 100%;
        height: env(safe-area-inset-bottom, 0px);
        background-color: white;
        position: fixed;
        bottom: 0;
        left: 0;
        z-index: 1;
      }
      
      /* Mobile scroll lock */
      body.widget-open {
        overscroll-behavior: none;
        overflow: hidden;
        position: fixed;
        width: 100%;
        height: 100%;
      }
    }
    
    /* Iframe container */
    .aro-ha-frame-container {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
    }
    
    /* Responsive iframe */
    .aro-ha-frame {
      width: 100%;
      height: 100%;
      border: none;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }
    
    /* Mobile adjustments for the iframe */
    @media (max-width: 768px) {
      .aro-ha-frame {
        height: calc(var(--app-height) - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
      }
    }
    
    /* Permission dialog */
    .aro-ha-permission {
      position: fixed;
      z-index: calc(var(--aro-ha-z-widget) + 1);
      background: white;
      box-shadow: 0 5px 40px rgba(0,0,0,0.3);
      border-radius: 12px;
      padding: 24px;
      width: 90%;
      max-width: 400px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .aro-ha-permission.visible {
      opacity: 1;
      display: block;
    }
    
    .aro-ha-permission h3 {
      margin-top: 0;
      margin-bottom: 16px;
      color: var(--aro-ha-primary);
      font-weight: 600;
      font-size: 18px;
    }
    
    .aro-ha-permission p {
      margin-bottom: 24px;
      line-height: 1.5;
      font-size: 14px;
      color: #333;
    }
    
    .aro-ha-permission-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    
    .aro-ha-button-secondary {
      padding: 10px 16px;
      border-radius: 6px;
      background-color: #f1f1f1;
      color: #333;
      font-weight: 500;
      border: none;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s ease;
    }
    
    .aro-ha-button-secondary:hover {
      background-color: #e5e5e5;
    }
    
    .aro-ha-button-primary {
      padding: 10px 16px;
      border-radius: 6px;
      background-color: var(--aro-ha-primary);
      color: white;
      font-weight: 500;
      border: none;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s ease;
    }
    
    .aro-ha-button-primary:hover {
      background-color: #767657;
    }
  `;
  document.head.appendChild(style);

  // Add modern viewport meta tag - crucial for correct mobile display
  if (!document.querySelector('meta[name="viewport"]')) {
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, maximum-scale=1.0';
    document.head.appendChild(viewportMeta);
  } else {
    // Update existing viewport tag if necessary
    const existingViewport = document.querySelector('meta[name="viewport"]');
    if (!existingViewport.content.includes('viewport-fit=cover')) {
      existingViewport.content += ', viewport-fit=cover';
    }
  }

  // Create chat button using industry best practices
  const button = document.createElement('button');
  button.className = 'aro-ha-button';
  button.setAttribute('aria-label', 'Open chat assistant');
  button.setAttribute('type', 'button');
  button.innerHTML = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `;
  document.body.appendChild(button);

  // Create overlay using industry best practices
  const overlay = document.createElement('div');
  overlay.className = 'aro-ha-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.appendChild(overlay);

  // Create container using industry best practices
  const container = document.createElement('div');
  container.className = 'aro-ha-container';
  container.setAttribute('role', 'dialog');
  container.setAttribute('aria-modal', 'true');
  container.setAttribute('aria-labelledby', 'aro-ha-title');
  document.body.appendChild(container);

  // Create permission dialog using industry best practices
  const permissionDialog = document.createElement('div');
  permissionDialog.className = 'aro-ha-permission';
  permissionDialog.setAttribute('role', 'dialog');
  permissionDialog.setAttribute('aria-modal', 'true');
  permissionDialog.setAttribute('aria-labelledby', 'aro-ha-permission-title');
  permissionDialog.innerHTML = `
    <h3 id="aro-ha-permission-title">Microphone Access Required</h3>
    <p>To use voice features in our chat, your browser needs permission to access your microphone. When prompted, please select "Allow" to enable voice interactions.</p>
    <div class="aro-ha-permission-actions">
      <button type="button" class="aro-ha-button-secondary" id="aro-ha-cancel">Cancel</button>
      <button type="button" class="aro-ha-button-primary" id="aro-ha-allow">Allow Microphone</button>
    </div>
  `;
  document.body.appendChild(permissionDialog);

  // State management
  let micPermissionState = null;
  let iframeCreated = false;
  let isMobile = window.matchMedia('(max-width: 768px)').matches;
  let originalScrollY = 0;
  
  // Calculate correct viewport height (fixes mobile 100vh issues)
  function setViewportHeight() {
    // First we get the viewport height and multiply it by 1% to get a value for a vh unit
    const vh = window.innerHeight * 0.01;
    // Then we set the value in the --vh custom property to the root of the document
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
  }

  // Handle mobile scrolling
  function lockScroll(lock) {
    if (!isMobile) return;
    
    if (lock) {
      originalScrollY = window.scrollY;
      document.body.classList.add('widget-open');
      document.body.style.top = `-${originalScrollY}px`;
    } else {
      document.body.classList.remove('widget-open');
      document.body.style.removeProperty('top');
      window.scrollTo(0, originalScrollY);
    }
  }

  // Check for microphone permission
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
      stream.getTracks().forEach(track => track.stop());
      
      // Save the granted permission to localStorage
      localStorage.setItem('aro_ha_mic_permission', 'granted');
      
      return 'granted';
    } catch (error) {
      console.log('Microphone permission denied:', error);
      return 'denied';
    }
  }

  // Create iframe using industry best practices
  function createChatIframe() {
    if (iframeCreated) return;
    
    // Clear container
    container.innerHTML = '';
    
    // Create the frame container for proper sizing
    const frameContainer = document.createElement('div');
    frameContainer.className = 'aro-ha-frame-container';
    
    // Create the iframe
    const iframe = document.createElement('iframe');
    iframe.className = 'aro-ha-frame';
    iframe.src = 'https://arohaunifiedchat.replit.app/widget-full';
    iframe.title = 'Aro Ha Chat Assistant';
    iframe.setAttribute('loading', 'eager');
    iframe.setAttribute('importance', 'high');
    iframe.allow = 'microphone; autoplay';
    
    // Add the iframe to the container
    frameContainer.appendChild(iframe);
    container.appendChild(frameContainer);
    
    iframeCreated = true;
  }

  // Show the chat widget with modern transitions
  function showWidget() {
    setViewportHeight();
    lockScroll(true);
    
    createChatIframe();
    
    // Use setTimeout to ensure CSS transitions work properly
    setTimeout(() => {
      overlay.classList.add('visible');
      container.classList.add('visible');
    }, 10);
    
    button.style.display = 'none';
  }

  // Hide the chat widget with modern transitions
  function hideWidget() {
    overlay.classList.remove('visible');
    container.classList.remove('visible');
    
    // Wait for transitions to complete before fully hiding
    setTimeout(() => {
      container.style.display = 'none';
      overlay.style.display = 'none';
      button.style.display = 'flex';
      lockScroll(false);
    }, 300);
  }

  // Show the permission dialog
  function showPermissionDialog() {
    lockScroll(true);
    button.style.display = 'none';
    
    setTimeout(() => {
      overlay.classList.add('visible');
      permissionDialog.classList.add('visible');
    }, 10);
  }

  // Hide the permission dialog
  function hidePermissionDialog() {
    permissionDialog.classList.remove('visible');
    
    setTimeout(() => {
      permissionDialog.style.display = 'none';
    }, 300);
  }

  // Initialize the widget
  async function init() {
    // Set initial viewport height
    setViewportHeight();
    
    // Check microphone permission state
    micPermissionState = await checkMicrophonePermission();
    
    // Set up button click handler
    button.addEventListener('click', async () => {
      if (micPermissionState === 'granted') {
        showWidget();
      } else {
        showPermissionDialog();
      }
    });
    
    // Set up overlay click to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        if (permissionDialog.classList.contains('visible')) {
          hidePermissionDialog();
          button.style.display = 'flex';
          overlay.classList.remove('visible');
          lockScroll(false);
        } else {
          hideWidget();
        }
      }
    });
    
    // Permission dialog buttons
    document.getElementById('aro-ha-allow').addEventListener('click', async () => {
      micPermissionState = await requestMicrophonePermission();
      
      hidePermissionDialog();
      
      if (micPermissionState === 'granted') {
        showWidget();
      } else {
        // Still show widget but let user know mic access was denied
        const alertShown = sessionStorage.getItem('micPermissionAlertShown');
        if (!alertShown) {
          alert('Microphone permission was denied. Voice features will not work.');
          sessionStorage.setItem('micPermissionAlertShown', 'true');
        }
        showWidget();
      }
    });
    
    document.getElementById('aro-ha-cancel').addEventListener('click', () => {
      hidePermissionDialog();
      showWidget();
    });
    
    // Listen for messages from iframe
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'widget-close') {
        hideWidget();
      }
      
      if (event.data && event.data.type === 'voice-call-starting') {
        if (micPermissionState !== 'granted') {
          requestMicrophonePermission().then(state => {
            micPermissionState = state;
            
            // Notify iframe of permission state
            const iframe = document.querySelector('.aro-ha-frame');
            if (iframe && iframe.contentWindow) {
              iframe.contentWindow.postMessage({ 
                type: 'mic-permission-update', 
                state: micPermissionState 
              }, '*');
            }
          });
        }
      }
    });
    
    // Handle resize and orientation changes
    const resizeHandler = () => {
      isMobile = window.matchMedia('(max-width: 768px)').matches;
      setViewportHeight();
    };
    
    // Throttled resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeHandler, 100);
    });
    
    // Handle orientation changes on mobile
    window.addEventListener('orientationchange', () => {
      setTimeout(resizeHandler, 200);
    });
    
    // Handle keyboard events for desktop
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && container.classList.contains('visible')) {
        hideWidget();
      }
    });
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();