import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// ---- Types ----

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMConfig {
  provider: 'anthropic' | 'deepseek';
  model: string;
}

// ---- Provider Implementations ----

async function callAnthropic(
  messages: ChatMessage[],
  system: string,
  model: string
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Anthropic expects system separately, user+assistant as messages
  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    temperature: 0.1,
    system,
    messages: messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
  });

  return response.content
    .filter(block => block.type === 'text')
    .map(block => (block as Anthropic.TextBlock).text)
    .join('\n');
}

async function callDeepSeek(
  messages: ChatMessage[],
  _system: string,
  model: string
): Promise<string> {
  const client = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY,
  });

  // DeepSeek uses OpenAI-compatible format — all messages in one array
  const response = await client.chat.completions.create({
    model,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    max_tokens: 2048,
    temperature: 0.1,
    stream: false,
  });

  return response.choices[0]?.message?.content || '';
}

// ---- Config Detection ----

export function detectLLMConfig(): LLMConfig | null {
  // DeepSeek first (preferred if key is set)
  if (process.env.DEEPSEEK_API_KEY) {
    return {
      provider: 'deepseek',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
    };
  }

  // Anthropic fallback
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: 'anthropic',
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
    };
  }

  return null;
}

// ---- Unified Interface ----

export async function chat(
  messages: ChatMessage[],
  system: string = ''
): Promise<string> {
  const config = detectLLMConfig();

  if (!config) {
    throw new Error(
      'No LLM provider configured. Set DEEPSEEK_API_KEY or ANTHROPIC_API_KEY in .env'
    );
  }

  console.log(`🤖 LLM: ${config.provider}/${config.model}`);

  if (config.provider === 'deepseek') {
    return callDeepSeek(messages, system, config.model);
  }

  return callAnthropic(messages, system, config.model);
}
