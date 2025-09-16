export const dynamic = 'force-dynamic';

import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, generateObject, ModelMessage, tool, stepCountIs } from 'ai';
import { streamResponse, verifySignature } from '@layercode/node-server-sdk';
import { WELCOME_MESSAGE, SYSTEM_PROMPT } from '@/app/prompt';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const gemini = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });
type MessageWithTurnId = ModelMessage & { turn_id?: string };
const conversationMessages = {} as Record<string, MessageWithTurnId[]>;
type WebhookRequest = {
  conversation_id: string;
  text: string;
  turn_id: string;
  interruption_context?: {
    previous_turn_interrupted: boolean;
    words_heard: number;
    text_heard: string;
    assistant_turn_id?: string;
  };
  type: 'message' | 'session.start' | 'session.update' | 'session.end';
};

export const fetch_prequalification_questions = tool({
  description: 'Fetch pre-qualification screening questions for rental applicants',
  inputSchema: z.object({
    monthlyIncome: z.string().describe('Monthly income'),
    hasPets: z.string().describe('Do you have pets'),
    isSmoker: z.string().describe('Are you a smoker? yes or no')
  }),
  execute: async (data) => {
    if (data.isSmoker == 'yes') {
      return { qualified: 'no', why: 'None of our property accept smokers' };
    } else {
      return { qualified: 'yes' };
    }
  }
});

export const get_units = tool({
  description: 'Fetch available units and properties based on budget, bedrooms, and amenity requirements',
  inputSchema: z.object({
    cityAndState: z.string().optional().describe('City, State'),
    maxBudget: z.number().optional().describe('Maximum monthly rent budget in dollars'),
    minBedrooms: z.number().optional().describe('Minimum number of bedrooms required'),
    maxBedrooms: z.number().optional().describe('Maximum number of bedrooms'),
    amenities: z.array(z.string()).optional().describe('List of required amenities (e.g., "parking", "gym", "in-unit laundry", "pool", "pet-friendly")')
  }),
  execute: async ({ cityAndState, maxBudget, minBedrooms, maxBedrooms, amenities }) => {
    // Generate mock results using an LLM. In a real implemented, you would call your internal API or database instead.
    const { object } = await generateObject({
      model: gemini('gemini-2.5-flash-lite'),
      schema: z.object({
        units: z.array(
          z.object({
            id: z.string(),
            address: z.string().describe('Short address of the property consisting of house number, street, city, and state'),
            bedrooms: z.number(),
            bathrooms: z.number(),
            monthlyRent: z.number().describe('Monthly rent in dollars'),
            squareFeet: z.number(),
            amenities: z.array(z.string()).describe('3 amenities available in the unit'),
            upcomingAppointmentTimes: z.array(z.string()).describe('3 upcoming appointment times over the coming 7 days in ISO format')
          })
        )
      }),
      prompt: `Generate 5 rental unit listings that match these criteria:
      - City and State: ${cityAndState || 'Any'}
      - Maximum budget: ${maxBudget ? `$${maxBudget}/month` : 'No limit'}
      - Bedrooms: ${minBedrooms ? `At least ${minBedrooms}` : 'Any'} ${maxBedrooms ? `up to ${maxBedrooms}` : ''}
      - Required amenities: ${amenities?.join(', ') || 'None specified'}

      Create realistic apartment/house listings with varied prices, sizes, and features.`
    });

    return object.units;
  }
});

export const book_appointment = tool({
  description: 'Book a property tour appointment',
  inputSchema: z.object({
    name: z.string().describe('Full name of the caller'),
    phoneNumber: z.string().describe('10-digit phone number'),
    unitId: z.string().describe('Unit ID of the property'),
    appointmentTime: z.string().describe('Time of appointment in ISO format')
  }),
  execute: async (data) => {
    // In a real implementation, you would call your internal booking API here.
    return { success: true };
  }
});

export const POST = async (request: Request) => {
  // Verify the request is from Layercode
  const requestBody = await request.json();
  const signature = request.headers.get('layercode-signature') || '';
  const secret = process.env.LAYERCODE_WEBHOOK_SECRET || '';
  const isValid = verifySignature({
    payload: JSON.stringify(requestBody),
    signature,
    secret
  });
  // if (!isValid) return new Response('Unauthorized', { status: 401 });

  const { conversation_id, text: userText, turn_id, type, interruption_context } = requestBody as WebhookRequest;

  // Store system message if this is a new conversation
  if (!conversationMessages[conversation_id]) {
    conversationMessages[conversation_id] = [{ role: 'system', content: SYSTEM_PROMPT }];
  }

  // Immediately store user msg
  console.log('--- stored user msg ---');
  conversationMessages[conversation_id].push({ role: 'user', turn_id, content: userText });

  switch (type) {
    case 'session.update':
    case 'session.end':
      return new Response('OK', { status: 200 });
    case 'session.start':
      // If this is the start of the session, respond with a welcome message
      return streamResponse(requestBody as WebhookRequest, async ({ stream }) => {
        stream.tts(WELCOME_MESSAGE);
        // stream.data({ message: `test data msg` });
        conversationMessages[conversation_id].push({ role: 'assistant', turn_id, content: WELCOME_MESSAGE });
        console.log('--- session.start received ---');
        console.log(conversationMessages[conversation_id]);
        stream.end();
      });
    case 'message':
      // If webhook includes interruption context, it means our previous assistant response was interrupted mid-generation or mid-being-spoken to user. So we update the matching assistant message with ammended text.
      if (interruption_context?.previous_turn_interrupted) {
        // Search backward through the conversation history to find the latest user message with the matching turn_id and update or append the interrupted assistant response message
        console.log('--- interruption context received ---');
        const matchingAssistantMsg = conversationMessages[conversation_id].findLast((m) => m.role === 'assistant' && m.turn_id === interruption_context.assistant_turn_id);
        const matchingUserMsg = conversationMessages[conversation_id].findLast((m) => m.role === 'user' && m.turn_id === interruption_context.assistant_turn_id);
        if (matchingUserMsg) {
          if (matchingAssistantMsg) {
            conversationMessages[conversation_id].push({ role: 'assistant', turn_id, content: interruption_context.text_heard });
            console.log('--- added missing assistant msg ---');
            console.log(conversationMessages[conversation_id]);
          } else {
            console.log('--- updating assisant msg with interruption_context.text_heard ---');
            console.log(conversationMessages[conversation_id]);
          }
        } else {
          console.warn(`Could not find matching user msg with turn_id ${interruption_context.assistant_turn_id} to update with interrupted assistant response`);
        }
      }

      // Generate the assistant response
      return streamResponse(requestBody as WebhookRequest, async ({ stream }) => {
        const { textStream } = streamText({
          // model: openai('gpt-4o-mini'),
          model: gemini('gemini-2.5-flash-lite'),
          system: SYSTEM_PROMPT,
          messages: conversationMessages[conversation_id],
          tools: {
            fetch_prequalification_questions,
            get_units,
            book_appointment
          },
          stopWhen: stepCountIs(10),
          onStepFinish({ text, toolCalls, toolResults, finishReason, usage }) {
            // TODO ideally we save msg history at each step instead of just onFinish (so that we don't loose everything when interrupted mid-conversation)

            // Sent tool call logs to the frontned for debugging
            toolResults.entries().forEach(([toolName, result]) => {
              const resultPretty = JSON.stringify(result, null, 2);
              stream.data({ message: `Tool call result:\n${resultPretty}` });
            });
          },
          onFinish: async ({ response }) => {
            // Search backward through the conversation history to find the latest assistant message with the matching turn_id and update it with the final text
            console.log('--- onFinish response.messages ---');
            console.log(response.messages);
            conversationMessages[conversation_id].push(...response.messages);
            console.log('--- onFinish final message history ---');
            console.log(conversationMessages[conversation_id]);
            stream.end();
          }
        });

        await stream.ttsTextStream(textStream);
      });
    default:
      console.log('Unhandled event type:', requestBody);
      return new Response('OK', { status: 200 });
  }
};
