import OpenAI from 'openai';
import { transcriptStorage } from '../storage';
import { Message, Transcript, NewKnowledgeGap } from '../../shared/schema';
import axios from 'axios';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_AROHA_KEY,
});

interface TranscriptAnalysis {
  gaps: Array<{
    question: string;
    lumiResponse: string;
    severity: 'unanswered' | 'incorrect' | 'incomplete';
    aiSuggestedAnswer: string;
    sourceUrl?: string;
  }>;
}

const AROHA_PAGES = [
  { path: '/', description: 'Homepage - overview of Aro Ha retreat' },
  { path: '/the-experience/', description: 'The retreat experience details' },
  { path: '/wellness/', description: 'Wellness programs and treatments' },
  { path: '/accommodation/', description: 'Accommodation and rooms' },
  { path: '/food/', description: 'Food and dining information' },
  { path: '/retreats/', description: 'Available retreat programs' },
  { path: '/faq/', description: 'Frequently asked questions' },
  { path: '/contact/', description: 'Contact information and booking' },
  { path: '/rates/', description: 'Pricing and rates' },
];

async function fetchAroHaPage(path: string): Promise<string> {
  try {
    const url = `https://www.aro-ha.com${path}`;
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AroHaAuditBot/1.0)',
      },
    });
    
    const html = response.data as string;
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
    
    return textContent.slice(0, 8000);
  } catch (error) {
    console.error(`Error fetching ${path}:`, error);
    return `Error: Could not fetch page content from ${path}`;
  }
}

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_aroha_website',
      description: 'Search the official Aro Ha website (www.aro-ha.com) to verify information about the retreat. Use this to check if Lumi provided accurate information about pricing, policies, programs, accommodation, food, or any other retreat details.',
      parameters: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            enum: AROHA_PAGES.map(p => p.path),
            description: `Which page to search. Options: ${AROHA_PAGES.map(p => `${p.path} (${p.description})`).join(', ')}`,
          },
          query: {
            type: 'string',
            description: 'What specific information you are looking for on this page',
          },
        },
        required: ['page', 'query'],
      },
    },
  },
];

export class KnowledgeAuditService {
  async analyzeTranscript(transcript: Transcript, messages: Message[]): Promise<TranscriptAnalysis> {
    if (messages.length < 2) {
      return { gaps: [] };
    }

    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'Visitor' : 'Lumi'}: ${m.content}`)
      .join('\n');

    try {
      const systemPrompt = `You are an AI quality auditor for "Lumi", a wellness retreat assistant for Aro-Ha retreat in New Zealand.

Your task is to analyze conversation transcripts and identify knowledge gaps where Lumi:
1. Failed to answer a question (unanswered)
2. Gave incorrect information (incorrect)
3. Gave incomplete or vague information when specifics were needed (incomplete)

IMPORTANT: You have access to the search_aroha_website tool to verify information against the official Aro-Ha website. Use this tool to:
- Verify any specific claims Lumi made about pricing, dates, policies, programs
- Check if Lumi's information matches what's on the official website
- Find the correct information when Lumi gave incorrect or incomplete answers

For each potential gap, search the relevant page on aro-ha.com to verify before classifying it.

For each confirmed gap, provide:
- The visitor's question
- What Lumi said in response
- Severity classification (unanswered, incorrect, incomplete)
- The correct answer based on the official website
- The source URL where you found the correct information

Focus on substantive issues that would affect visitor experience:
- Wrong pricing, dates, or policies
- Missing key retreat information
- Deflecting when a direct answer was expected
- Providing outdated or inaccurate details

Ignore:
- Normal conversation pleasantries
- Questions Lumi appropriately redirected to staff
- Cases where Lumi correctly said they'd need to check

After verifying with the website, return your analysis as valid JSON with this structure:
{
  "gaps": [
    {
      "question": "visitor's question",
      "lumiResponse": "what Lumi said",
      "severity": "unanswered|incorrect|incomplete",
      "aiSuggestedAnswer": "correct answer from website",
      "sourceUrl": "https://www.aro-ha.com/page-where-found"
    }
  ]
}`;

      const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this conversation for knowledge gaps. Use the search tool to verify any factual claims:\n\n${conversationText}` },
      ];

      let response = await openai.chat.completions.create({
        model: 'gpt-5.2',
        messages: chatMessages,
        tools,
        tool_choice: 'auto',
        temperature: 0.2,
      });

      let assistantMessage = response.choices[0]?.message;
      
      while (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
        chatMessages.push(assistantMessage);
        
        for (const toolCall of assistantMessage.tool_calls) {
          if (toolCall.function.name === 'search_aroha_website') {
            const args = JSON.parse(toolCall.function.arguments);
            const pageContent = await fetchAroHaPage(args.page);
            
            chatMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: `Content from https://www.aro-ha.com${args.page} (searching for: ${args.query}):\n\n${pageContent}`,
            });
          }
        }
        
        response = await openai.chat.completions.create({
          model: 'gpt-5.2',
          messages: chatMessages,
          tools,
          tool_choice: 'auto',
          temperature: 0.2,
        });
        
        assistantMessage = response.choices[0]?.message;
      }

      const content = assistantMessage?.content;
      if (!content) {
        return { gaps: [] };
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { gaps: [] };
      }

      const result = JSON.parse(jsonMatch[0]);
      return {
        gaps: Array.isArray(result.gaps) ? result.gaps : []
      };
    } catch (error) {
      console.error('Error analyzing transcript with OpenAI:', error);
      return { gaps: [] };
    }
  }

  async runAudit(startDate: Date, endDate: Date): Promise<{
    transcriptsAnalyzed: number;
    gapsFound: number;
    errors: number;
  }> {
    const stats = { transcriptsAnalyzed: 0, gapsFound: 0, errors: 0 };

    try {
      const transcripts = await transcriptStorage.getTranscriptsForAudit(startDate, endDate);

      for (const { transcript, messages } of transcripts) {
        try {
          stats.transcriptsAnalyzed++;
          const analysis = await this.analyzeTranscript(transcript, messages);

          for (const gap of analysis.gaps) {
            const newGap: NewKnowledgeGap = {
              transcriptId: transcript.id,
              question: gap.question,
              lumiResponse: gap.lumiResponse,
              severity: gap.severity,
              status: 'new',
              aiSuggestedAnswer: gap.aiSuggestedAnswer,
            };

            await transcriptStorage.createKnowledgeGap(newGap);
            stats.gapsFound++;
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error processing transcript ${transcript.id}:`, error);
          stats.errors++;
        }
      }

      return stats;
    } catch (error) {
      console.error('Error running knowledge audit:', error);
      throw error;
    }
  }
}

export const knowledgeAuditService = new KnowledgeAuditService();
