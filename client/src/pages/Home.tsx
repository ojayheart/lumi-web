import CustomChatWidgetContainer from "@/components/CustomChatWidgetContainer";
import { useEffect } from "react";

export default function Home() {
  // Apply the same transparent styling as the widget-only page
  useEffect(() => {
    // Make the body and html transparent
    document.body.style.background = "transparent";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
    document.documentElement.style.background = "transparent";
    
    // Remove any headers or extra margins
    const htmlStyle = document.createElement('style');
    htmlStyle.innerHTML = `
      * {
        box-sizing: border-box;
      }
      html, body {
        background-color: transparent !important;
        overflow: hidden;
        margin: 0 !important;
        padding: 0 !important;
      }
      #root {
        width: 100% !important;
        height: 100% !important;
        position: relative !important;
        background: transparent !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    `;
    document.head.appendChild(htmlStyle);
    
    return () => {
      document.head.removeChild(htmlStyle);
    };
  }, []);

  return <CustomChatWidgetContainer />;
}
