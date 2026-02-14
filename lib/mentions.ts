// Utility functions for @mentions system

// Regex to match @username mentions
export const MENTION_REGEX = /@([a-zA-Z0-9_]+)/;

// Extract all usernames from text
export function extractMentions(text: string): string[] {
  const globalRegex = /@([a-zA-Z0-9_]+)/g;
  const matches = text.match(globalRegex);
  if (!matches) return [];
  
  // Remove @ and deduplicate
  return Array.from(new Set(matches.map(m => m.slice(1).toLowerCase())));
}

// Check if text contains mentions
export function hasMentions(text: string): boolean {
  return MENTION_REGEX.test(text);
}

// Replace @mentions with links in text (for rendering)
export function renderMentions(text: string): string {
  const globalRegex = /@([a-zA-Z0-9_]+)/g;
  return text.replace(globalRegex, (match, username) => {
    return `<a href="/user/${username}" class="mention-link text-[hsl(var(--forum-accent))] hover:underline font-medium">@${username}</a>`;
  });
}

// Parse text and return array of segments (text and mentions)
export type MentionSegment = 
  | { type: 'text'; content: string }
  | { type: 'mention'; username: string };

export function parseMentions(text: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let lastIndex = 0;
  
  const regex = /@([a-zA-Z0-9_]+)/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      });
    }
    
    // Add mention
    segments.push({
      type: 'mention',
      username: match[1]
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }
  
  return segments;
}

// Autocomplete helper - filter usernames that start with query
export function filterUsernames(usernames: string[], query: string): string[] {
  const lowerQuery = query.toLowerCase();
  return usernames
    .filter(u => u.toLowerCase().startsWith(lowerQuery))
    .slice(0, 5); // Limit to 5 suggestions
}
