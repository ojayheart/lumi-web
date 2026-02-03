/**
 * Text Link Enhancer
 * 
 * This utility transforms plain text "Book here" or "Find out more here" phrases
 * into proper markdown links that can be rendered as clickable elements.
 */

const BOOKING_URL = 'https://aro-ha.com/book-now';
const INFO_URL = 'https://aro-ha.com/experiences';

/**
 * Enhances text by converting "Book here" and similar phrases into markdown links
 */
export function enhanceTextWithLinks(text: string): string {
  if (!text) return text;
  
  // Replace "Book here" with a proper markdown link
  let enhanced = text.replace(
    /\b(Book here)\b/gi, 
    `[$1](${BOOKING_URL})`
  );
  
  // Replace "Find out more here" with a proper markdown link
  enhanced = enhanced.replace(
    /\b(Find out more here)\b/gi, 
    `[$1](${INFO_URL})`
  );
  
  // Replace "Find out more" with a proper markdown link
  enhanced = enhanced.replace(
    /\b(Find out more)\b/gi, 
    `[$1](${INFO_URL})`
  );
  
  // Handle "Learn more here" variations
  enhanced = enhanced.replace(
    /\b(Learn more here)\b/gi, 
    `[$1](${INFO_URL})`
  );

  return enhanced;
}