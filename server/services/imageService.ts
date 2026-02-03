import OpenAI from 'openai';
import Airtable from 'airtable';

const AIRTABLE_BASE_ID = 'appnNWO7ArRjVGM2E';
const AIRTABLE_TABLE_ID = 'tbljIVt6J7PQpJ9FR';

interface ImageRecord {
  url: string;
  category: string;
  description: string;
}

export class ImageService {
  private openai: OpenAI;
  private airtable: Airtable.Base;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_AROHA_KEY
    });

    this.airtable = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(AIRTABLE_BASE_ID);
  }

  private async fetchAllImageRecords(): Promise<ImageRecord[]> {
    try {
      if (!process.env.AIRTABLE_API_KEY) {
        console.error('Airtable API key not found');
        return [];
      }

      console.log('Fetching images from Airtable:', { baseId: AIRTABLE_BASE_ID, tableId: AIRTABLE_TABLE_ID });
      
      const records = await this.airtable(AIRTABLE_TABLE_ID)
        .select({
          fields: ['Image', 'Category', 'Description'],
          maxRecords: 100
        })
        .all();

      console.log('Raw Airtable records received:', records.length);
      
      const mappedRecords = records
        .map(record => {
          const imageUrl = record.get('Image')?.[0]?.url;
          const category = record.get('Category') as string;
          const description = record.get('Description') as string;
          
          console.log('Processing image record:', {
            url: imageUrl,
            category,
            description,
            hasUrl: !!imageUrl,
            hasCategory: !!category,
            hasDescription: !!description
          });
          
          return {
            url: imageUrl,
            category: category,
            description: description
          };
        })
        .filter(record => record.url && record.category && record.description);

      console.log('Filtered image records:', mappedRecords.length);
      return mappedRecords;
    } catch (error) {
      console.error('Error fetching images from Airtable:', error);
      if (error.response) {
        console.error('Airtable error details:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      return [];
    }
  }

  async shouldShowImage(userQuestion: string): Promise<boolean> {
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a decision maker that determines if a question would benefit from an image response. Respond with just 'true' or 'false'."
        },
        {
          role: "user",
          content: `Question: "${userQuestion}". Would this question benefit from showing an image?`
        }
      ],
      temperature: 0.1,
    });

    return completion.choices[0].message.content?.toLowerCase() === 'true';
  }

  async findRelevantImages(question: string): Promise<ImageRecord[]> {
    try {
      // Get all image records from Airtable
      const imageData = await this.fetchAllImageRecords();

      if (imageData.length === 0) {
        console.log('No images found in Airtable');
        return [];
      }

      // Create array of image metadata for AI
      const imageMetadata = imageData.map((img, index) => ({
        id: index,
        category: img.category,
        description: img.description
      }));

      // Use LLM to find relevant images
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an image selection system. Given a question and a set of images with their descriptions, select up to 4 most relevant images that would help answer the question or illustrate the response. Return your selection as an array of image indices in a JSON object with an 'indices' field."
          },
          {
            role: "user", 
            content: `Question: "${question}"\n\nAvailable Images:\n${JSON.stringify(imageMetadata, null, 2)}\n\nSelect up to 4 most relevant images.`
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0].message.content || '{"indices":[]}';
      console.log('Found images:', content);
      
      try {
        const response = JSON.parse(content);
        const selectedIndices = response.indices || [];
        
        if (!Array.isArray(selectedIndices)) {
          console.warn('Invalid response format from OpenAI:', content);
          return [];
        }

        // Get valid images
        const validImages = selectedIndices
          .filter(index => typeof index === 'number' && index >= 0 && index < imageData.length)
          .map(index => imageData[index])
          .filter(image => image && image.url && image.category);

        console.log(`Found ${validImages.length} relevant images for question`);
        return validImages;

      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Error finding relevant images:', error);
      return [];
    }
  }
}

export const imageService = new ImageService();