import { useEffect, useState, useCallback } from "react";
import WidgetToggle from "./WidgetToggle";
import { AlertCircle } from "lucide-react";
import { useIsMobile } from "../hooks/use-mobile";

// Widget types and status types
type WidgetType = 'voiceflow' | 'elevenlabs';
type LoadStatus = 'loading' | 'loaded' | 'error';

export default function CombinedWidget() {
  // Detect if user is on mobile
  const isMobile = useIsMobile();
  
  // Local state - set default based on device type
  // For desktop: default to elevenlabs (voice chat)
  // For mobile: default to voiceflow (text chat)
  const [activeWidget, setActiveWidget] = useState<WidgetType>(isMobile ? 'voiceflow' : 'elevenlabs');
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [isMinimized, setIsMinimized] = useState(true); // Default to minimized state
  
  // Generate unique id for the iframe to ensure fresh load each time
  const [frameId, setFrameId] = useState(Date.now().toString());
  
  // Create the iframe content based on active widget
  const getIframeContent = useCallback(() => {
    // Base HTML with styles to ensure iframe has no borders/margins
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            overflow: hidden;
            background-color: transparent;
          }
          #widget-container {
            width: 100%;
            height: 100%;
            position: relative;
            background-color: transparent;
          }
          
          /* Custom CSS variables for Voiceflow widget */
          :root {
            --vfrc-launcher-color-bg: transparent;
            --vfrc-transcript-bg-color: rgba(255, 255, 255, 0.8);
            --vfrc-transcript-color-primary-bg: rgba(255, 255, 255, 0.7);
            --vfrc-transcript-color-message-bg: rgba(240, 240, 240, 0.8);
          }
          
          /* For ElevenLabs Convai widget */
          elevenlabs-convai {
            --convai-container-bg: transparent !important;
            --convai-bottom-gradient: transparent !important;
            --convai-background: transparent !important;
            background-color: transparent !important;
          }
          
          /* Make sure all inner elements are also transparent */
          elevenlabs-convai * {
            background-color: transparent !important;
          }
          
          /* Remove any gradients from ElevenLabs widget */
          elevenlabs-convai::before,
          elevenlabs-convai::after,
          elevenlabs-convai div::before,
          elevenlabs-convai div::after,
          elevenlabs-convai .bottom-gradient,
          elevenlabs-convai [class*="gradient"],
          elevenlabs-convai [class*="Gradient"],
          elevenlabs-convai footer,
          elevenlabs-convai [class*="footer"],
          elevenlabs-convai [class*="Footer"] {
            background: none !important;
            background-image: none !important;
            opacity: 0 !important;
            background-color: transparent !important;
          }
          
          /* Target the footer specifically */
          elevenlabs-convai footer,
          elevenlabs-convai [class*="footer"],
          elevenlabs-convai [class*="Footer"] {
            position: relative !important;
            z-index: 999 !important;
            background-color: transparent !important;
            background: none !important;
          }
        </style>
      </head>
      <body>
        <div id="widget-container" style="background-color: transparent;"></div>
    `;
    
    // Add the appropriate widget initialization script
    if (activeWidget === 'voiceflow') {
      html += `
        <script>
          // Create and load Voiceflow widget
          const widgetDiv = document.createElement('div');
          widgetDiv.id = 'vf-widget-container';
          widgetDiv.style.width = '100%';
          widgetDiv.style.height = '100%';
          widgetDiv.style.backgroundColor = 'transparent';
          document.getElementById('widget-container').appendChild(widgetDiv);
          
          // Create the script element
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.src = "https://cdn.voiceflow.com/widget-next/bundle.mjs";
          
          script.onload = () => {
            if (window.voiceflow && window.voiceflow.chat) {
              window.voiceflow.chat.load({
                verify: { projectID: '6786e8cd358548c59f31eda8' },
                url: 'https://general-runtime.voiceflow.com',
                versionID: '6786e8cd358548c59f31eda9',
                voice: {
                  url: "https://runtime-api.voiceflow.com"
                },
                render: {
                  mode: 'embedded',
                  target: document.getElementById('vf-widget-container')
                }
              });
              
              // Notify parent that loading is complete
              setTimeout(() => {
                window.parent.postMessage('voiceflow-loaded', '*');
              }, 1000);
            } else {
              window.parent.postMessage('voiceflow-error', '*');
            }
          };
          
          script.onerror = () => {
            window.parent.postMessage('voiceflow-error', '*');
          };
          
          document.head.appendChild(script);
        </script>
      `;
    } else {
      html += `
        <script>
          // Create and load ElevenLabs widget
          const widgetContainer = document.getElementById('widget-container');
          
          // Create and append the ElevenLabs widget element
          const elevenLabsWidget = document.createElement('elevenlabs-convai');
          elevenLabsWidget.setAttribute('agent-id', '3FvBwXKJ0YFSqoIIbL07');
          widgetContainer.appendChild(elevenLabsWidget);
          
          // Load the ElevenLabs script
          const script = document.createElement('script');
          script.src = "https://elevenlabs.io/convai-widget/index.js";
          script.async = true;
          script.type = "text/javascript";
          
          script.onload = () => {
            // Give some time for the widget to initialize
            setTimeout(() => {
              // Find and remove any bottom gradient elements
              const removeGradients = () => {
                // Target selectors that might contain gradients
                const gradientSelectors = [
                  '[class*="gradient"]', 
                  '[class*="Gradient"]', 
                  '[id*="gradient"]', 
                  '[id*="Gradient"]',
                  'footer',
                  '[class*="footer"]',
                  '[class*="Footer"]',
                  '[class*="powered"]',
                  '[class*="Powered"]',
                  '[class*="bottom"]',
                  '[class*="Bottom"]'
                ];
                
                // Remove any elements with gradient in class name or ID
                const gradientElements = document.querySelectorAll(gradientSelectors.join(', '));
                gradientElements.forEach(el => {
                  // Remove backgrounds
                  el.style.background = "none";
                  el.style.backgroundImage = "none";
                  el.style.backgroundColor = "transparent";
                  
                  // For gradients, make them invisible
                  if (el.className && (
                      el.className.toLowerCase().includes('gradient') || 
                      el.className.toLowerCase().includes('overlay') ||
                      el.className.toLowerCase().includes('backdrop')
                  )) {
                    el.style.opacity = "0";
                    el.style.display = "none";
                    el.style.background = "none";
                    el.style.backgroundColor = "transparent";
                  }
                });
                
                // Apply to shadow DOM if needed
                document.querySelectorAll('elevenlabs-convai').forEach(widget => {
                  if (widget.shadowRoot) {
                    const shadowGradients = widget.shadowRoot.querySelectorAll(gradientSelectors.join(', '));
                    shadowGradients.forEach(el => {
                      // Same treatment as above - transparent backgrounds
                      el.style.background = "none";
                      el.style.backgroundImage = "none";
                      el.style.backgroundColor = "transparent";
                      
                      if (el.className && (
                          el.className.toLowerCase().includes('gradient') || 
                          el.className.toLowerCase().includes('overlay') ||
                          el.className.toLowerCase().includes('backdrop')
                      )) {
                        el.style.opacity = "0";
                        el.style.display = "none";
                        el.style.background = "none";
                        el.style.backgroundColor = "transparent";
                      }
                    });
                  }
                });
              };
              
              // Run gradient removal immediately and after a delay
              removeGradients();
              setTimeout(removeGradients, 500);
              
              // Set up mutation observer to remove gradients as they're added
              const observer = new MutationObserver((mutations) => {
                mutations.forEach(() => {
                  removeGradients();
                });
              });
              
              // Start observing the document with configured parameters
              observer.observe(document.body, { 
                childList: true, 
                subtree: true 
              });
              
              window.parent.postMessage('elevenlabs-loaded', '*');
            }, 1000);
          };
          
          script.onerror = () => {
            window.parent.postMessage('elevenlabs-error', '*');
          };
          
          document.head.appendChild(script);
        </script>
      `;
    }
    
    // Close the HTML
    html += `
      </body>
      </html>
    `;
    
    return html;
  }, [activeWidget]);
  
  // Create URL for iframe source
  const getIframeUrl = useCallback(() => {
    const html = getIframeContent();
    const blob = new Blob([html], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, [getIframeContent]);
  
  // Set initial widget based on device type when component mounts
  useEffect(() => {
    // For desktop: default to elevenlabs (voice chat)
    // For mobile: default to voiceflow (text chat)
    setActiveWidget(isMobile ? 'voiceflow' : 'elevenlabs');
    // Generate a new frame id to ensure the widget loads properly
    setFrameId(Date.now().toString());
  }, [isMobile]);
  
  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'voiceflow-loaded' || event.data === 'elevenlabs-loaded') {
        console.log(`${activeWidget} widget loaded successfully`);
        setLoadStatus('loaded');
      } else if (event.data === 'voiceflow-error' || event.data === 'elevenlabs-error') {
        console.error(`Failed to load ${activeWidget} widget`);
        setLoadStatus('error');
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [activeWidget]);
  
  // Handle widget toggle
  const handleToggle = useCallback((widget: WidgetType) => {
    // If minimized, show the widget
    if (isMinimized) {
      setIsMinimized(false);
      
      // If the clicked widget is the same as the active one, we still need to
      // show it since we're coming from minimized state
      setLoadStatus('loading');
      setActiveWidget(widget);
      setFrameId(Date.now().toString());
      return;
    }
    
    // If not minimized and clicking a widget (even the same one, reload it)
    setLoadStatus('loading');
    setActiveWidget(widget);
    
    // Generate new frameId to ensure iframe is recreated from scratch
    setFrameId(Date.now().toString());
  }, [activeWidget, isMinimized]);
  
  // Handle retry
  const handleRetry = useCallback(() => {
    setLoadStatus('loading');
    // Generate new frameId to ensure iframe is recreated from scratch
    setFrameId(Date.now().toString());
  }, []);
  
  // Helper function to get styling based on active widget (removed since we're not using borders)
  
  // Common color scheme using #8E8F70
  const getSpinnerColor = () => 'border-[#8E8F70]';
  
  const getButtonColor = () => 'bg-[#8E8F70] hover:bg-[#7A7B5F]';
  
  // Handle minimizing and maximizing the widget
  const handleMinimizeToggle = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  return (
    <div 
      className="fixed bottom-0 right-0 flex flex-col items-end z-50 widget-container" 
      style={{ pointerEvents: 'none' }}>
      <div 
        className={`relative overflow-hidden transition-opacity duration-300 ease-in-out bg-transparent widget-frame`}
        style={{
          width: '384px',
          height: '600px',
          boxShadow: 'none', 
          border: 'none',
          opacity: isMinimized ? 0 : 1,
          pointerEvents: isMinimized ? 'none' : 'auto'
        }}
      >
        {/* Use iframe with blob URL for complete isolation - always load the iframe even when minimized */}
        <iframe 
          key={frameId}
          className="w-full h-full bg-transparent"
          style={{ 
            backgroundColor: 'transparent',
            visibility: isMinimized ? 'hidden' : 'visible',
            pointerEvents: isMinimized ? 'none' : 'auto'  // Critical change: ensure no pointer events when minimized
          }}
          src={getIframeUrl()}
          title={`${activeWidget} widget`}
          frameBorder="0"
          allow="microphone"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation"
        />
        
        {/* Loading State */}
        {loadStatus === 'loading' && !isMinimized && (
          <div className="absolute inset-0 flex items-center justify-center bg-transparent">
            <div className="flex flex-col items-center">
              <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${getSpinnerColor()}`}></div>
              <p className="mt-4 text-gray-600 font-medium">
                Loading {activeWidget === 'voiceflow' ? 'Text Chat' : 'Voice Chat'}...
              </p>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {loadStatus === 'error' && !isMinimized && (
          <div className="absolute inset-0 flex items-center justify-center bg-transparent p-4">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Failed to load {activeWidget === 'voiceflow' ? 'Text Chat' : 'Voice Chat'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">Please try refreshing the page.</p>
              <div className="mt-3">
                <button 
                  onClick={handleRetry}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${getButtonColor()}`}
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Toggle buttons on the right side - always visible */}
      <div 
        className="absolute top-1/2 right-0 transform -translate-y-1/2 p-1.5 rounded-l-xl bg-transparent"
        style={{ pointerEvents: 'auto' }} /* This ensures the buttons are always clickable */
      >
        <WidgetToggle 
          activeWidget={activeWidget} 
          onToggle={handleToggle}
          onMinimize={handleMinimizeToggle}
          isMinimized={isMinimized}
        />
      </div>
    </div>
  );
}