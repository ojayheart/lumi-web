import { useEffect, useState } from 'react';
import CustomChatWidget from '@/components/CustomChatWidget';
import { useIsMobile } from '@/hooks/use-mobile';
import { X } from 'lucide-react';
import { ChatProvider } from '@/contexts/ChatContext';

/**
 * This component renders the full chat widget automatically opened
 * It's designed to be embedded in an iframe
 */
export default function WidgetFull() {
  const isMobile = useIsMobile();
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Function to send webhook notification with conversation ID
  const sendWebhookNotification = async (conversationId: string) => {
    try {
      console.log('Sending webhook notification for conversation ID:', conversationId);
      
      // You can replace this URL with your actual webhook endpoint
      const webhookUrl = '/api/webhook/conversation-id';
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'conversation_id_received',
          conversationId: conversationId,
          timestamp: new Date().toISOString(),
          source: 'widget_iframe'
        })
      });

      if (response.ok) {
        console.log('Webhook notification sent successfully');
      } else {
        console.warn('Webhook notification failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error sending webhook notification:', error);
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
    // Set body and html styles for proper full-height display
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.background = 'transparent';
    
    // Remove Vite status messages
    removeViteStatusMessage();

    // Listen for messages from parent window
    const handleMessage = (event: MessageEvent) => {
      // Security check - you may want to restrict origins in production
      // if (event.origin !== 'https://your-trusted-domain.com') return;
      
      if (event.data && event.data.type === 'setConversationId') {
        const receivedConversationId = event.data.conversationId;
        
        if (receivedConversationId && typeof receivedConversationId === 'string') {
          console.log('Conversation ID received from parent:', receivedConversationId);
          
          // Store the conversation ID
          setConversationId(receivedConversationId);
          
          // Store globally for access by other components
          (window as any).conversationId = receivedConversationId;
          
          // Send webhook notification with conversation ID
          sendWebhookNotification(receivedConversationId);
          
          // Acknowledge receipt back to parent
          if (window.parent) {
            window.parent.postMessage({
              type: 'conversationIdReceived',
              conversationId: receivedConversationId
            }, '*');
          }
        }
      }
    };

    // Add event listener
    window.addEventListener('message', handleMessage);

    // Send ready message to parent to indicate widget is loaded and ready
    if (window.parent) {
      window.parent.postMessage({ 
        type: 'widget-ready',
        timestamp: new Date().toISOString()
      }, '*');
    }

    // Cleanup
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [sendWebhookNotification]);

  // Handle minimize action (close the widget)
  const handleMinimize = () => {
    if (window.parent) {
      window.parent.postMessage({ type: 'widget-close' }, '*');
    }
  };

  return (
    <ChatProvider>
      <div 
        className="w-full h-full overflow-hidden"
        style={{ 
          background: 'transparent',
          // Make widget fullscreen on mobile, remove bottom gap
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          width: isMobile ? '100vw' : '380px',
          height: isMobile ? '100vh' : '100%'
        }}
      >
        {/* Just the chat widget - use its X button to close */}
        <CustomChatWidget isMinimized={false} onMinimize={handleMinimize} />
      </div>
    </ChatProvider>
  );
}