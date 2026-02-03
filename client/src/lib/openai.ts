import OpenAI from 'openai';

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;

// Function to get or initialize the OpenAI client
const getOpenAIClient = async (): Promise<OpenAI> => {
  if (openaiClient) {
    return openaiClient;
  }

  // Get API key from the server
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    
    if (!config || !config.openai || !config.openai.apiKey) {
      throw new Error('OpenAI API key not found in configuration');
    }
    
    openaiClient = new OpenAI({
      apiKey: config.openai.apiKey,
      dangerouslyAllowBrowser: true // Only for client-side usage
    });
    
    return openaiClient;
  } catch (error) {
    console.error('Failed to initialize OpenAI client:', error);
    throw new Error('Could not initialize OpenAI client');
  }
};

/**
 * Process HTML content from ElevenLabs to make it more user-friendly
 * @param htmlContent The HTML content to process
 * @returns Processed user-friendly text with links preserved
 */
export const processHtmlContent = async (htmlContent: string): Promise<string> => {
  try {
    // Quick check if the content contains HTML
    if (!htmlContent.includes('<') && !htmlContent.includes('>')) {
      return htmlContent; // Not HTML, return as is
    }

    // Get the OpenAI client
    const openai = await getOpenAIClient();
    
    // Call OpenAI to process the HTML
    const completion = await openai.chat.completions.create({
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an HTML processor that converts HTML snippets into natural language while preserving links and important information. 
          For retreat information, format it in a conversational way. Here are examples:
          
          Input: <div class="retreat-info p-2 my-2 border-l-4 border-[#767657]"> <div class="font-semibold">Winter Wellness</div> <div>June 8, 2025 to June 13, 2025</div> <a href="https://retreat-reservations.aro-ha.com/en/product/winter-wellness" target="_blank" class="text-[#767657] underline block mt-2">View retreat details</a> </div>
          
          Output: "We have a Winter Wellness retreat from June 8 to June 13, 2025. You can [book this retreat here](https://retreat-reservations.aro-ha.com/en/product/winter-wellness)."
          
          Make sure to use markdown links [text](url) format instead of HTML links. Keep your response concise, natural, and conversational.`
        },
        {
          role: "user",
          content: `Process this HTML content into natural language while preserving links and important information: ${htmlContent}`
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent formatting
      max_tokens: 500,
    });
    
    // Return the processed text
    return completion.choices[0].message.content || htmlContent;
  } catch (error) {
    console.error('Error processing HTML content:', error);
    // In case of error, return the original content
    return htmlContent;
  }
};

/**
 * Detect if a string contains HTML markup
 */
export const containsHtml = (text: string): boolean => {
  // Basic check for HTML tags
  const htmlRegex = /<\/?[a-z][\s\S]*>/i;
  return htmlRegex.test(text);
};