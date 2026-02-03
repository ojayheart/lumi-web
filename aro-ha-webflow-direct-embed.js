/**
 * Aro-Ha AI Assistant Webflow Embed Code
 * 
 * This implementation exactly matches the direct-test.html approach
 * optimized for Webflow with proper handling of site loading.
 * 
 * HOW TO USE:
 * 1. Go to Webflow > Site Settings > Custom Code
 * 2. Paste this entire script into the "Footer Code" section
 * 3. Save and publish your site
 */
(function() {
  // Configuration
  const config = {
    chatButtonColor: '#8E8F70',
    buttonPosition: { bottom: '20px', right: '20px' },
    chatWidgetUrl: 'https://arohaunifiedchat.replit.app/widget-full'
  };

  // Initialize when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Create and inject CSS
    injectStyles();
    
    // Create chat button
    const chatButton = createChatButton();
    
    // Create chat container
    const chatContainer = createChatContainer();
    
    // Set up event listeners
    setupEventListeners(chatButton, chatContainer);
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Widget Styles */
      .aro-ha-chat-button {
        position: fixed;
        bottom: ${config.buttonPosition.bottom};
        right: ${config.buttonPosition.right};
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: ${config.chatButtonColor};
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        cursor: pointer;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid rgba(255, 255, 255, 0.8);
        transition: transform 0.2s ease;
      }
      
      .aro-ha-chat-button:hover {
        transform: scale(1.05);
      }
      
      .aro-ha-chat-button svg {
        width: 30px;
        height: 30px;
        fill: white;
      }
      
      .aro-ha-chat-container {
        position: fixed;
        bottom: ${config.buttonPosition.bottom};
        right: ${config.buttonPosition.right};
        width: 380px;
        height: 580px;
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 5px 40px rgba(0,0,0,0.16);
        z-index: 9998;
        display: none;
      }
      
      .aro-ha-chat-container iframe {
        width: 100%;
        height: 100%;
        border: none;
      }
      
      @media (max-width: 768px) {
        .aro-ha-chat-container {
          width: 100vw;
          height: 100vh;
          bottom: 0;
          right: 0;
          border-radius: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createChatButton() {
    const chatButton = document.createElement('div');
    chatButton.className = 'aro-ha-chat-button';
    chatButton.id = 'aro-ha-chat-button';
    chatButton.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <!-- MessageSquare from Lucide (minimal chat icon - outline only) -->
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    document.body.appendChild(chatButton);
    return chatButton;
  }

  function createChatContainer() {
    const chatContainer = document.createElement('div');
    chatContainer.className = 'aro-ha-chat-container';
    chatContainer.id = 'aro-ha-chat-container';
    
    // We'll create the iframe only when needed to save resources
    document.body.appendChild(chatContainer);
    return chatContainer;
  }

  function setupEventListeners(chatButton, chatContainer) {
    // Open chat when button is clicked
    chatButton.addEventListener('click', function() {
      openChat(chatButton, chatContainer);
    });

    // Listen for close message from the chat iframe
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'widget-close') {
        closeChat(chatButton, chatContainer);
      }
    });
  }

  function openChat(chatButton, chatContainer) {
    // Hide button
    chatButton.style.display = 'none';
    
    // Create iframe if it doesn't exist yet
    if (!chatContainer.querySelector('iframe')) {
      const chatIframe = document.createElement('iframe');
      chatIframe.src = config.chatWidgetUrl;
      chatIframe.title = 'Aro Ha Chat';
      chatContainer.appendChild(chatIframe);
    }
    
    // Show chat container
    chatContainer.style.display = 'block';
  }

  function closeChat(chatButton, chatContainer) {
    // Hide chat container
    chatContainer.style.display = 'none';
    
    // Show button
    chatButton.style.display = 'flex';
  }
})();