/**
 * Aro-Ha AI Assistant - Webflow Embed Code
 * 
 * This optimized embed script:
 * 1. Creates a floating chat button
 * 2. Handles the display of the widget iframe
 * 3. Properly handles pointer-events to avoid blocking clicks
 * 4. Shows chat widget immediately ready for use
 * 5. Shows fullscreen on mobile devices
 */
(function() {
  // Configuration
  const config = {
    buttonSize: '60px',
    buttonPosition: { bottom: '20px', right: '20px' },
    chatWidth: '380px',
    chatHeight: '580px',
    chatPosition: { bottom: '20px', right: '20px' },
    backgroundColor: '#767657',
    baseUrl: 'https://arohaunifiedchat.replit.app'
  };

  // Initialize when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  function injectStyles() {
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .aro-ha-button-container {
        position: fixed;
        z-index: 999998;
        width: calc(${config.buttonSize} + 8px); /* Add padding to prevent cutting off */
        height: calc(${config.buttonSize} + 8px); /* Add padding to prevent cutting off */
        bottom: ${config.buttonPosition.bottom};
        right: ${config.buttonPosition.right};
        cursor: pointer;
        pointer-events: auto;
        transition: all 0.3s ease;
        background: transparent; /* Ensure background is transparent */
        padding: 4px; /* Add padding all around */
      }
      
      .aro-ha-chat-container {
        position: fixed;
        z-index: 999997;
        bottom: ${config.chatPosition.bottom};
        right: ${config.chatPosition.right};
        width: ${config.chatWidth};
        height: ${config.chatHeight};
        overflow: hidden;
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateY(20px);
        pointer-events: none;
        box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
        border-radius: 12px;
      }
      
      .aro-ha-chat-container.active {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      
      .aro-ha-button-container.hidden {
        opacity: 0;
        transform: scale(0.8);
        pointer-events: none;
      }
      
      @media (max-width: 768px) {
        .aro-ha-chat-container.active {
          width: 100vw !important;
          height: 100vh !important;
          bottom: 0 !important;
          right: 0 !important;
          border-radius: 0 !important;
        }
      }
    `;
    document.head.appendChild(styleEl);
  }
  
  function createChatButton() {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'aro-ha-button-container';
    
    const buttonIframe = document.createElement('iframe');
    buttonIframe.style.width = '100%';
    buttonIframe.style.height = '100%';
    buttonIframe.style.border = 'none';
    buttonIframe.style.borderRadius = '50%';
    buttonIframe.style.overflow = 'hidden';
    buttonIframe.style.background = 'transparent';
    buttonIframe.src = `${config.baseUrl}/widget-button`;
    buttonIframe.title = 'Aro Ha Chat Button';
    buttonIframe.scrolling = 'no'; // Prevent scrolling
    buttonIframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope'; // Set proper permissions
    
    buttonContainer.appendChild(buttonIframe);
    document.body.appendChild(buttonContainer);
    
    return buttonContainer;
  }
  
  function createChatContainer() {
    const chatContainer = document.createElement('div');
    chatContainer.className = 'aro-ha-chat-container';
    
    document.body.appendChild(chatContainer);
    return chatContainer;
  }
  
  function init() {
    injectStyles();
    
    const buttonContainer = createChatButton();
    const chatContainer = createChatContainer();
    
    setupEventListeners(buttonContainer, chatContainer);
  }
  
  function setupEventListeners(buttonContainer, chatContainer) {
    // Listen for messages from the button or chat iframe
    window.addEventListener('message', (event) => {
      handleIframeMessages(event, buttonContainer, chatContainer);
    });
    
    // Set up click handler for the button
    buttonContainer.addEventListener('click', () => {
      openWidget(buttonContainer, chatContainer);
    });
  }
  
  function handleIframeMessages(event, buttonContainer, chatContainer) {
    // Handle messages from either iframe
    if (event.data) {
      if (event.data.type === 'widget-close') {
        closeWidget(buttonContainer, chatContainer);
      }
      // Handle button clicks from the button iframe
      else if (event.data.type === 'button-click') {
        openWidget(buttonContainer, chatContainer);
      }
    }
  }
  
  function toggleWidget(buttonContainer, chatContainer) {
    if (chatContainer.classList.contains('active')) {
      closeWidget(buttonContainer, chatContainer);
    } else {
      openWidget(buttonContainer, chatContainer);
    }
  }
  
  function openWidget(buttonContainer, chatContainer) {
    // Hide the button
    buttonContainer.classList.add('hidden');
    
    // If the chat iframe hasn't been created yet, create it
    if (!chatContainer.querySelector('iframe')) {
      const chatIframe = document.createElement('iframe');
      chatIframe.style.width = '100%';
      chatIframe.style.height = '100%';
      chatIframe.style.border = 'none';
      chatIframe.src = `${config.baseUrl}/widget-full`;
      chatIframe.title = 'Aro Ha Chat';
      chatContainer.appendChild(chatIframe);
    }
    
    // Show the chat
    chatContainer.classList.add('active');
  }
  
  function closeWidget(buttonContainer, chatContainer) {
    // Hide the chat
    chatContainer.classList.remove('active');
    
    // Show the button
    buttonContainer.classList.remove('hidden');
  }
})();