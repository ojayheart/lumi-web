import { useEffect } from 'react';

export default function HostedEmbedTest() {
  useEffect(() => {
    // Force restore scrolling immediately
    document.body.style.overflow = 'auto';
    document.body.style.position = 'static';
    document.body.style.removeProperty('width');
    document.body.style.removeProperty('height');
    document.body.style.removeProperty('top');
    document.body.classList.remove('aro-mobile-widget-open');
    
    // Add the button styles with simplified approach
    const style = document.createElement('style');
    style.textContent = `
      body {
        overflow: auto !important;
        position: static !important;
      }
      
      .test-chat-button {
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 70px;
        height: 70px;
        border-radius: 50%;
        background-color: #8E8F70;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        cursor: pointer;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        transition: all 0.3s ease;
      }
      
      .test-chat-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0,0,0,0.4);
      }
      
      .test-chat-button svg {
        width: 32px;
        height: 32px;
        fill: white;
        stroke: white;
      }
    `;
    document.head.appendChild(style);

    // Create a more visible test button
    const chatButton = document.createElement('div');
    chatButton.className = 'test-chat-button';
    chatButton.id = 'testChatButton';
    chatButton.innerHTML = `
      <svg width="32" height="32" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    
    chatButton.addEventListener('click', () => {
      alert('Widget button clicked! This is the exact styling from the embed script.');
    });
    
    document.body.appendChild(chatButton);
    console.log('Button added to page');

    // Cleanup on unmount
    return () => {
      style.remove();
      chatButton.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8" style={{ overflow: 'auto', height: 'auto' }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Hosted Embed System Test
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Auto-Updating Widget Embed
          </h2>
          <p className="text-gray-600 mb-4">
            This page demonstrates the hosted embed system where the widget script is served from our servers.
            Any updates to the widget will automatically appear on all websites using this embed.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">How It Works:</h3>
            <ol className="list-decimal list-inside text-blue-700 space-y-1">
              <li>Customer adds one simple script tag to their website</li>
              <li>The embed loader fetches the latest widget from our server</li>
              <li>Widget updates automatically without customer intervention</li>
              <li>Supports all features: permissions, mobile optimization, safe areas</li>
            </ol>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Customer Implementation
            </h3>
            <p className="text-gray-600 mb-4">
              Customers only need to add this single line to their website:
            </p>
            <div className="bg-gray-100 rounded p-4 mb-4">
              <code className="text-sm text-gray-800 break-all">
                {`<script src="https://da5418fc-3ce4-4f52-ab1c-e7add5b46e9d-00-fuu7g97oviit.riker.replit.dev/embed.js"></script>`}
              </code>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• One-time setup - no maintenance required</li>
              <li>• Automatic updates from our servers</li>
              <li>• Works on any website or platform</li>
              <li>• CORS-enabled for cross-origin loading</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Server Endpoints
            </h3>
            <div className="space-y-3">
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">/embed.js</code>
                <p className="text-sm text-gray-600 mt-1">Simple loader script (24hr cache)</p>
              </div>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">/widget-script.js</code>
                <p className="text-sm text-gray-600 mt-1">Full widget implementation (5min cache)</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              Short cache times ensure rapid updates while maintaining performance.
            </p>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Button Test Implementation
          </h3>
          <p className="text-gray-600 mb-4">
            The exact chat button from the widget script is displayed below and should also appear 
            as a fixed element in the bottom-right corner of the page.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-blue-800 mb-2">Button Preview:</h4>
            <div className="flex items-center gap-4">
              <div 
                className="inline-flex"
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#8E8F70',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgba(255, 255, 255, 0.8)',
                }}
                onClick={() => alert('Inline button clicked!')}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  <strong>Size:</strong> 60px × 60px<br/>
                  <strong>Color:</strong> #8E8F70 (Aro-Ha brand green)<br/>
                  <strong>Position:</strong> Fixed bottom-right corner
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2">Benefits for Customers:</h4>
            <ul className="text-green-700 space-y-1">
              <li>• No manual updates needed</li>
              <li>• Always get latest features and bug fixes</li>
              <li>• Consistent experience across all sites</li>
              <li>• Reduced technical maintenance</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded p-4 shadow">
              <h4 className="font-semibold text-gray-700 mb-2">Sample Content {i}</h4>
              <p className="text-gray-600 text-sm">
                This demonstrates how the widget appears over existing page content.
                The widget should not interfere with normal page interactions.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}