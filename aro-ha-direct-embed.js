/**
 * Aro-Ha AI Assistant Widget Embed Code
 * 
 * This implementation exactly matches the direct-test.html approach
 * with integrated button and container.
 * 
 * USAGE:
 * Just add this script to your webpage:
 * <script src="https://arohaunifiedchat.replit.app/aro-ha-direct-embed.js"></script>
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
    
    @media (max-width: 768px) {
      .chat-container {
        width: 100vw;
        height: 100vh;
        bottom: 0;
        right: 0;
        border-radius: 0;
      }
    }
  `;
  document.head.appendChild(style);

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
  
  // Create iframe inside chat container
  const chatIframe = document.createElement('iframe');
  chatIframe.src = 'https://arohaunifiedchat.replit.app/widget-full';
  chatIframe.title = 'Aro Ha Chat';
  chatContainer.appendChild(chatIframe);
  
  // Add chat container to body
  document.body.appendChild(chatContainer);

  // Add event listeners
  chatButton.addEventListener('click', function() {
    chatButton.style.display = 'none';
    chatContainer.style.display = 'block';
  });

  // Listen for close message from the chat iframe
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'widget-close') {
      chatContainer.style.display = 'none';
      chatButton.style.display = 'flex';
    }
  });
})();