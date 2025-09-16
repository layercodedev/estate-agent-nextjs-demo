import { MessageWithTurnId } from '@/app/api/agent/route';

export const prettyPrintMsgs = (msgs: MessageWithTurnId[]) => {
  // Create a transformed copy of messages where arrays of TextPart are concatenated into strings.
  const transformed = msgs.map((msg) => {
    const copy: any = { ...msg };
    const content = (msg as any).content;
    if (msg.role === 'system') {
      return { ...msg, content: msg.content.slice(0, 100) + '...[truncated for readability]' };
    }
    if (Array.isArray(content)) {
      // Collect text parts
      const textParts = content
        .filter((p) => p && (p.type === 'text' || (p as any).type === 'text'))
        .map((p) => (p as any).text)
        .filter((t) => typeof t === 'string');

      // If the array contains only text parts, replace with single concatenated string
      if (textParts.length > 0 && content.every((p) => p && (p.type === 'text' || (p as any).type === 'text'))) {
        copy.content = textParts.join('');
      } else if (textParts.length > 0) {
        // If mixed parts, replace contiguous text parts with concatenated strings while keeping non-text parts
        const newContent: any[] = [];
        let buffer = '';

        for (const part of content) {
          if (part && (part.type === 'text' || (part as any).type === 'text')) {
            buffer += (part as any).text || '';
          } else {
            if (buffer) {
              newContent.push(buffer);
              buffer = '';
            }
            newContent.push(part);
          }
        }
        if (buffer) newContent.push(buffer);
        copy.content = newContent;
      } else {
        // No text parts found; leave content as-is
        copy.content = content;
      }
    } else {
      // content is not an array (string or other) — leave as-is
      copy.content = content;
    }

    return copy;
  });

  console.log(JSON.stringify(transformed, null, 2));
};
