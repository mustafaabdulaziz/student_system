/** Mentions are stored/displayed as @DisplayName. Legacy @[Name](userId) is still parsed. */

export const LEGACY_MENTION_TOKEN_RE = /@\[([^\]]+)\]\(([^)]+)\)/g;

export type MentionableUser = { id: string; name?: string | null; email?: string | null };

function safeDisplayName(name: string): string {
  return String(name || '').replace(/[\[\]@\n\r]/g, '').trim() || 'user';
}

/** Inserted into the composer / stored message text. */
export function buildMentionToken(name: string, _userId?: string): string {
  return `@${safeDisplayName(name)}`;
}

export function mentionsToPlainText(text: string): string {
  return text.replace(LEGACY_MENTION_TOKEN_RE, '@$1');
}

/** Resolve @Name and legacy @[Name](id) to user ids using known staff. */
export function extractMentionIds(text: string, users: MentionableUser[] = []): string[] {
  const ids: string[] = [];
  const add = (id: string | null | undefined) => {
    if (id && !ids.includes(id)) ids.push(id);
  };

  const legacy = new RegExp(LEGACY_MENTION_TOKEN_RE.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = legacy.exec(text)) !== null) {
    add(match[2]);
  }

  const plain = mentionsToPlainText(text);
  const byName = users
    .map((u) => ({ id: u.id, name: safeDisplayName(u.name || u.email || '') }))
    .filter((u) => u.name)
    .sort((a, b) => b.name.length - a.name.length);

  for (let i = 0; i < plain.length; i++) {
    if (plain[i] !== '@') continue;
    if (i > 0 && !/\s/.test(plain[i - 1])) continue;
    const after = plain.slice(i + 1);
    const found = byName.find((u) => after === u.name || after.startsWith(`${u.name} `) || after.startsWith(`${u.name}\n`));
    if (found) {
      add(found.id);
      i += found.name.length; // skip past name; loop +1
    }
  }

  return ids;
}

export type MentionQuery = { start: number; query: string };

/** Active @query before the cursor, if any. */
export function getActiveMentionQuery(text: string, cursorPos: number): MentionQuery | null {
  const before = text.slice(0, cursorPos);
  // Don't reopen autocomplete inside a completed legacy token
  if (/@\[[^\]]*$/.test(before)) return null;
  const match = before.match(/(^|[\s])@([^\s@[\]]*)$/);
  if (!match) return null;
  const atIndex = before.lastIndexOf('@');
  return { start: atIndex, query: match[2] || '' };
}

export function insertMentionToken(
  text: string,
  cursorPos: number,
  mentionStart: number,
  name: string,
  userId: string
): { text: string; cursor: number } {
  const token = `${buildMentionToken(name, userId)} `;
  const next = text.slice(0, mentionStart) + token + text.slice(cursorPos);
  return { text: next, cursor: mentionStart + token.length };
}

export type MentionSegment =
  | { type: 'text'; value: string }
  | { type: 'mention'; name: string; userId: string };

export function parseMentionSegments(text: string, users: MentionableUser[] = []): MentionSegment[] {
  // Normalize legacy tokens to @Name for a single pass, keep ids via lookup
  const idByName = new Map<string, string>();
  for (const u of users) {
    const n = safeDisplayName(u.name || u.email || '');
    if (n && !idByName.has(n.toLowerCase())) idByName.set(n.toLowerCase(), u.id);
  }

  const normalized = mentionsToPlainText(text);
  const byName = [...idByName.keys()].sort((a, b) => b.length - a.length);

  const segments: MentionSegment[] = [];
  let i = 0;
  let textBuf = '';

  const flushText = () => {
    if (textBuf) {
      segments.push({ type: 'text', value: textBuf });
      textBuf = '';
    }
  };

  while (i < normalized.length) {
    if (normalized[i] === '@' && (i === 0 || /\s/.test(normalized[i - 1]))) {
      const after = normalized.slice(i + 1);
      const afterLower = after.toLowerCase();
      const foundKey = byName.find(
        (n) => afterLower === n || afterLower.startsWith(`${n} `) || afterLower.startsWith(`${n}\n`)
      );
      if (foundKey) {
        flushText();
        const displayName = after.slice(0, foundKey.length);
        segments.push({
          type: 'mention',
          name: displayName,
          userId: idByName.get(foundKey) || ''
        });
        i += 1 + foundKey.length;
        continue;
      }
    }
    textBuf += normalized[i];
    i += 1;
  }
  flushText();

  if (segments.length === 0) {
    segments.push({ type: 'text', value: text });
  }
  return segments;
}
