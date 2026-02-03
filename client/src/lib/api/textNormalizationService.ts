import OpenAI from "openai";

// Define a class for the text normalization service
export class TextNormalizationService {
  private client: OpenAI | null = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  // Initialize the OpenAI client
  async initialize(): Promise<void> {
    // If already initialized, return
    if (this.client) {
      return;
    }

    // If initialization is in progress, wait for it to complete
    if (this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = new Promise<void>(async (resolve, reject) => {
      try {
        console.log('Fetching OpenAI API key from server...');
        // Fetch API key from server
        const response = await fetch('/api/config');
        const config = await response.json();
        
        // Check if OpenAI API key is available
        if (!config || !config.openai || !config.openai.apiKey) {
          console.error('OpenAI API key is missing in config');
          throw new Error('OpenAI API key is missing');
        }
        
        // Log config information (without exposing the actual key)
        console.log('Config received for text normalization:', JSON.stringify({
          hasOpenAI: !!config.openai,
          hasApiKey: !!config.openai.apiKey,
          apiKeyLength: config.openai.apiKey.length,
          isEmbedded: !!config.isEmbedded
        }));
        
        // Initialize OpenAI client
        console.log('Initializing OpenAI client for text normalization...');
        this.client = new OpenAI({ 
          apiKey: config.openai.apiKey,
          dangerouslyAllowBrowser: true
        });
        
        // Test the connection
        console.log('Testing OpenAI connection...');
        const testResult = await this.client.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [{ role: "user", content: "Respond with the word TEST only" }],
        });
        
        const testResponse = testResult.choices[0].message.content;
        console.log('OpenAI test result:', testResponse);
        
        if (!testResponse || !testResponse.includes('TEST')) {
          throw new Error('Failed to get expected response from OpenAI');
        }
        
        console.log('OpenAI client initialized successfully for text normalization');
        resolve();
      } catch (error) {
        console.error('Error initializing OpenAI client:', error);
        this.client = null;
        reject(error);
      } finally {
        this.isInitializing = false;
      }
    });
    
    return this.initPromise;
  }

  // Normalize text using OpenAI
  async normalizeText(text: string): Promise<string> {
    if (!text) return text;
    
    try {
      // Initialize client if not already done
      await this.initialize();
      
      if (!this.client) {
        console.error('OpenAI client not initialized for text normalization');
        return text;
      }

      console.log('Normalizing text with OpenAI:', JSON.stringify(text));
      
      // Call OpenAI API for text normalization
      const response = await this.client.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a text normalizer that formats dates and numbers correctly. 
            
            RULES:
            1. Convert spelled-out numbers to numerals (e.g., "twenty-five" to "25")
            2. Format dates properly (e.g., "august third" to "August 3rd")
            3. Format times properly (e.g., "three pm" to "3 PM")
            4. Format currencies properly (e.g., "five dollars" to "$5")
            5. IMPORTANT: Do not change or paraphrase anything else in the text
            6. Return the exact same text with only the specified formatting changes
            
            Example conversions:
            - "twenty-five dollars" → "$25"
            - "august third two thousand twenty-four" → "August 3rd 2024"
            - "three pm on friday" → "3 PM on Friday"
            - "fifty-two point five percent" → "52.5%"
            
            REMEMBER: Do not change ANY other wording or meaning of the text.
            `
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.1, // Low temperature for more consistent outputs
      });
      
      const normalizedText = response.choices[0].message.content || text;
      console.log('OpenAI normalized result:', JSON.stringify(normalizedText));
      
      return normalizedText;
    } catch (error) {
      console.error('Error normalizing text:', error);
      // Fall back to original text
      return text;
    }
  }
  
  // Preload by running a sample normalization
  async preload(): Promise<void> {
    try {
      console.log('Preloading text normalization service...');
      // Run a simple normalization to fully initialize the service
      const result = await this.normalizeText('test twenty-five on august third');
      console.log('Text normalization service preloaded successfully:', JSON.stringify(result));
      
      // Attach the service to the window object for global access
      if (typeof window !== 'undefined') {
        (window as any).textNormalizationService = this;
      }
    } catch (error) {
      console.error('Error preloading text normalization service:', error);
    }
  }
}

// Create a singleton instance
export const textNormalizationService = new TextNormalizationService();

// Create a singleton instance but don't automatically preload
// The service will be initialized only when needed by ElevenLabs