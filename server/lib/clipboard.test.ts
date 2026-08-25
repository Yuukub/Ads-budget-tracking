import assert from 'node:assert/strict';
import test from 'node:test';
import { copyText } from '../../src/lib/clipboard.js';

test('copyText uses the Clipboard API when available', async () => {
  let copied = '';
  const result = await copyText('secret', { navigator: { clipboard: { writeText: async (text) => { copied = text; } } } });
  assert.equal(result, true);
  assert.equal(copied, 'secret');
});

test('copyText falls back to execCommand and removes the temporary field', async () => {
  let removed = false;
  let selected = false;
  const textarea = {
    value: '', style: {}, setAttribute: () => undefined, select: () => { selected = true; },
    setSelectionRange: () => undefined, remove: () => { removed = true; },
  };
  const document = {
    body: { appendChild: () => undefined },
    createElement: () => textarea,
    execCommand: (command: string) => command === 'copy',
  } as unknown as Document;
  const result = await copyText('fallback', { navigator: { clipboard: { writeText: async () => { throw new Error('blocked'); } } }, document });
  assert.equal(result, true);
  assert.equal(textarea.value, 'fallback');
  assert.equal(selected, true);
  assert.equal(removed, true);
});
