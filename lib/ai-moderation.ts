/**
 * AI-powered content moderation using OpenAI API
 * Detects toxicity, auto-tags threads, and generates TL;DR summaries
 * 
 * Requires OPENAI_API_KEY environment variable
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

interface ModerationResult {
  is_toxic: boolean;
  toxicity_score: number; // 0-1
  categories: string[]; // e.g. ['spam', 'harassment']
  reason?: string;
}

interface AutoTagResult {
  tags: string[];
  category?: string;
}

interface SummaryResult {
  summary: string;
}

async function callOpenAI(systemPrompt: string, userContent: string, maxTokens = 200): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;

  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent.slice(0, 2000) },
        ],
        max_tokens: maxTokens,
        temperature: 0.1,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

/**
 * Check content for toxicity before saving
 */
export async function moderateContent(content: string): Promise<ModerationResult> {
  const defaultResult: ModerationResult = {
    is_toxic: false,
    toxicity_score: 0,
    categories: [],
  };

  if (!OPENAI_API_KEY) return defaultResult;

  const systemPrompt = `You are a content moderator for an adult forum. Analyze the following post for:
- spam or advertising
- extreme harassment or threats
- illegal content
- doxxing (sharing personal info)

Respond ONLY with valid JSON: {"is_toxic": boolean, "toxicity_score": number 0-1, "categories": string[], "reason": "brief reason or empty string"}

Note: Adult content and explicit language is ALLOWED on this forum. Only flag genuinely harmful content.`;

  const result = await callOpenAI(systemPrompt, content);
  if (!result) return defaultResult;

  try {
    const parsed = JSON.parse(result);
    return {
      is_toxic: parsed.is_toxic === true,
      toxicity_score: typeof parsed.toxicity_score === 'number' ? parsed.toxicity_score : 0,
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      reason: parsed.reason || undefined,
    };
  } catch {
    return defaultResult;
  }
}

/**
 * Auto-generate tags for a thread based on its content
 */
export async function autoTagThread(title: string, content: string): Promise<AutoTagResult> {
  const defaultResult: AutoTagResult = { tags: [] };

  if (!OPENAI_API_KEY) return defaultResult;

  const systemPrompt = `You tag forum threads. Given a thread title and first post, suggest 2-5 relevant tags in Spanish.
Respond ONLY with valid JSON: {"tags": ["tag1", "tag2"], "category": "optional category"}
Tags should be lowercase, single or two words, relevant to the content.`;

  const result = await callOpenAI(systemPrompt, `Title: ${title}\n\nContent: ${content}`);
  if (!result) return defaultResult;

  try {
    const parsed = JSON.parse(result);
    return {
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
      category: parsed.category || undefined,
    };
  } catch {
    return defaultResult;
  }
}

/**
 * Generate TL;DR summary for long threads
 */
export async function generateThreadSummary(
  title: string,
  posts: { author: string; content: string }[]
): Promise<SummaryResult> {
  const defaultResult: SummaryResult = { summary: '' };

  if (!OPENAI_API_KEY || posts.length < 3) return defaultResult;

  const systemPrompt = `Summarize this forum discussion in 2-3 sentences in Spanish. Be concise and neutral.
Respond ONLY with valid JSON: {"summary": "your summary here"}`;

  const postsText = posts
    .slice(0, 10)
    .map((p) => `@${p.author}: ${p.content.replace(/<[^>]*>/g, '').slice(0, 300)}`)
    .join('\n\n');

  const result = await callOpenAI(systemPrompt, `Thread: ${title}\n\n${postsText}`, 300);
  if (!result) return defaultResult;

  try {
    const parsed = JSON.parse(result);
    return { summary: parsed.summary || '' };
  } catch {
    return defaultResult;
  }
}
