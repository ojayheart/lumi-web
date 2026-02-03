/**
 * Aro-Ha AI Assistant Widget - Webflow Embed Code with Mobile Browser Fixes
 * - Added padding for mobile browser navigation bars
 * - Improved microphone permission handling
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
    
    @media (max-width: 768px) {
      .chat-container, .permission-dialog {
        width: 100vw;
        height: 100vh;
        bottom: 0;
        right: 0;
        border-radius: 0;
        /* Safe area padding to avoid browser bars */
        padding-top: env(safe-area-inset-top, 60px);
        padding-top: constant(safe-area-inset-top, 60px);
        padding-bottom: env(safe-area-inset-bottom, 20px);
        padding-bottom: constant(safe-area-inset-bottom, 20px);
        padding-left: env(safe-area-inset-left, 0px);
        padding-left: constant(safe-area-inset-left, 0px);
        padding-right: env(safe-area-inset-right, 0px);
        padding-right: constant(safe-area-inset-right, 0px);
      }
      
      .chat-container iframe {
        height: calc(100% - env(safe-area-inset-top, 60px) - env(safe-area-inset-bottom, 20px));
        height: calc(100% - constant(safe-area-inset-top, 60px) - constant(safe-area-inset-bottom, 20px));
      }
      
      .permission-dialog {
        height: auto;
        max-height: calc(100vh - env(safe-area-inset-top, 60px) - env(safe-area-inset-bottom, 20px));
        max-height: calc(100vh - constant(safe-area-inset-top, 60px) - constant(safe-area-inset-bottom, 20px));
      }
    }
  `;
  document.head.appendChild(style);

  // Add viewport meta tag to ensure proper mobile rendering with safe areas
  const viewportMeta = document.createElement('meta');
  viewportMeta.name = 'viewport';
  viewportMeta.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
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

  // Microphone permission state
  let micPermissionState = null;
  let iframeCreated = false;

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

  // Create iframe with proper permissions and mobile adjustments
  function createChatIframe() {
    if (iframeCreated) return;
    
    const chatIframe = document.createElement('iframe');
    chatIframe.src = 'https://arohaunifiedchat.replit.app/widget-full';
    chatIframe.title = 'Aro Ha Chat';
    // Explicitly allow microphone
    chatIframe.allow = 'microphone; autoplay';
    
    // Mobile detection
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Set appropriate mobile styles for the iframe
    if (isMobile) {
      // Add a small top padding to account for mobile browser bars
      chatIframe.style.paddingTop = '60px';
    }
    
    chatContainer.appendChild(chatIframe);
    iframeCreated = true;
  }

  // Show the chat widget
  function showChat() {
    chatButton.style.display = 'none';
    permissionDialog.style.display = 'none';
    createChatIframe();
    chatContainer.style.display = 'block';
  }

  // Set up event listeners after DOM is fully loaded
  async function setupEventListeners() {
    // Check initial microphone permission
    micPermissionState = await checkMicrophonePermission();
    
    // Chat button click handler
    chatButton.addEventListener('click', async function() {
      if (micPermissionState === 'granted') {
        // If microphone is already allowed, just show the chat
        showChat();
      } else {
        // Otherwise show the permission dialog first
        chatButton.style.display = 'none';
        permissionDialog.style.display = 'block';
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
        chatContainer.style.display = 'none';
        chatButton.style.display = 'flex';
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
  }

  // Initialize when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEventListeners);
  } else {
    setupEventListeners();
  }
})();