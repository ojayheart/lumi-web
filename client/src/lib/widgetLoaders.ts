// Helper function to clean up widgets but keep containers
function cleanup(): void {
  // Remove all Voiceflow related elements but keep containers
  const vfWidgets = document.querySelectorAll('#vf-widget, #vf-widget-container');
  vfWidgets.forEach(widget => widget.remove());
  
  // Remove all ElevenLabs widgets
  const elWidgets = document.querySelectorAll('elevenlabs-convai');
  elWidgets.forEach(widget => widget.remove());
  
  // Remove the Voiceflow script
  const vfScripts = document.querySelectorAll('script[src*="voiceflow"]');
  vfScripts.forEach(script => script.remove());
  
  // Remove the ElevenLabs script
  const elScripts = document.querySelectorAll('script[src*="elevenlabs"]');
  elScripts.forEach(script => script.remove());
  
  // Also try to manually clean up any Voiceflow widget instances
  if (window.voiceflow && window.voiceflow.chat) {
    try {
      // Try to reset/cleanup any Voiceflow instance
      delete window.voiceflow;
    } catch (e) {
      console.error("Error cleaning up Voiceflow instance:", e);
    }
  }
}

// Function to load the Voiceflow widget
export function loadVoiceflowWidget(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // First clean up all widgets to ensure there's no conflict
      cleanup();
      
      // Create a clean div for the Voiceflow widget
      const voiceflowContainer = document.getElementById('voiceflow-widget');
      if (!voiceflowContainer) {
        reject(new Error("Voiceflow widget container not found"));
        return;
      }
      
      // Make sure the ElevenLabs widget is fully hidden
      const elevenLabsContainer = document.getElementById('elevenlabs-widget');
      if (elevenLabsContainer) {
        elevenLabsContainer.setAttribute('aria-hidden', 'true');
        elevenLabsContainer.style.visibility = 'hidden';
        elevenLabsContainer.style.opacity = '0';
        elevenLabsContainer.style.position = 'absolute';
        elevenLabsContainer.style.top = '-9999px';
        elevenLabsContainer.style.zIndex = '-100';
      }
      
      // Make the Voiceflow container fully visible
      voiceflowContainer.removeAttribute('aria-hidden');
      voiceflowContainer.style.visibility = 'visible';
      voiceflowContainer.style.opacity = '1';
      voiceflowContainer.style.position = 'relative';
      voiceflowContainer.style.top = '0';
      voiceflowContainer.style.zIndex = '100';
      
      // Clear the container
      voiceflowContainer.innerHTML = '';
      
      // Create a div specifically for the Voiceflow widget
      const widgetDiv = document.createElement('div');
      widgetDiv.id = 'vf-widget-container';
      widgetDiv.style.width = '100%';
      widgetDiv.style.height = '100%';
      voiceflowContainer.appendChild(widgetDiv);

      // Create the script element
      const script = document.createElement('script');
      script.id = 'voiceflow-script';
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
          
          // Give widget time to initialize
          setTimeout(() => {
            resolve();
          }, 1000);
        } else {
          reject(new Error("Voiceflow SDK not available"));
        }
      };
      
      script.onerror = () => {
        reject(new Error("Failed to load Voiceflow script"));
      };
      
      document.head.appendChild(script);
    } catch (error) {
      reject(error);
    }
  });
}

// Function to load the ElevenLabs widget
export function loadElevenlabsWidget(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // First clean up all widgets to ensure there's no conflict
      cleanup();
      
      // Get the container for the ElevenLabs widget
      const elevenlabsContainer = document.getElementById('elevenlabs-widget');
      if (!elevenlabsContainer) {
        reject(new Error("ElevenLabs widget container not found"));
        return;
      }
      
      // Make sure the Voiceflow widget is fully hidden
      const voiceflowContainer = document.getElementById('voiceflow-widget');
      if (voiceflowContainer) {
        voiceflowContainer.setAttribute('aria-hidden', 'true');
        voiceflowContainer.style.visibility = 'hidden';
        voiceflowContainer.style.opacity = '0';
        voiceflowContainer.style.position = 'absolute';
        voiceflowContainer.style.top = '-9999px';
        voiceflowContainer.style.zIndex = '-100';
      }
      
      // Make the ElevenLabs container fully visible
      elevenlabsContainer.removeAttribute('aria-hidden');
      elevenlabsContainer.style.visibility = 'visible';
      elevenlabsContainer.style.opacity = '1';
      elevenlabsContainer.style.position = 'relative';
      elevenlabsContainer.style.top = '0';
      elevenlabsContainer.style.zIndex = '100';
      
      // Clear the container
      elevenlabsContainer.innerHTML = '';
      
      // Create and append the ElevenLabs widget element
      const elevenLabsWidget = document.createElement('elevenlabs-convai');
      elevenLabsWidget.setAttribute('agent-id', '3FvBwXKJ0YFSqoIIbL07');
      elevenlabsContainer.appendChild(elevenLabsWidget);
      
      // Load the ElevenLabs script
      const script = document.createElement('script');
      script.id = 'elevenlabs-script';
      script.src = "https://elevenlabs.io/convai-widget/index.js";
      script.async = true;
      script.type = "text/javascript";
      
      script.onload = () => {
        // Give some time for the widget to initialize
        setTimeout(resolve, 1000);
      };
      
      script.onerror = () => {
        reject(new Error("Failed to load ElevenLabs script"));
      };
      
      document.head.appendChild(script);
    } catch (error) {
      reject(error);
    }
  });
}

// Add TypeScript declarations for window object
declare global {
  interface Window {
    voiceflow?: {
      chat: {
        load: (config: any) => void;
      };
    };
  }
}