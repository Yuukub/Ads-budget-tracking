import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultNoteLinkLabel, getNoteLinkKind } from '../../src/lib/noteLinks.js';

test('classifies supported Google document URLs without fetching them', () => {
  assert.equal(getNoteLinkKind('https://docs.google.com/spreadsheets/d/abc/edit'), 'GOOGLE_SHEETS');
  assert.equal(getNoteLinkKind('https://docs.google.com/document/d/abc/edit'), 'GOOGLE_DOCS');
  assert.equal(getNoteLinkKind('https://docs.google.com/presentation/d/abc/edit'), 'GOOGLE_SLIDES');
  assert.equal(getNoteLinkKind('https://drive.google.com/file/d/abc/view'), 'GOOGLE_DRIVE');
  assert.equal(getNoteLinkKind('https://example.com/guide'), 'WEBSITE');
});

test('uses a useful default label for a Smart Link', () => {
  assert.equal(defaultNoteLinkLabel('https://docs.google.com/spreadsheets/d/abc/edit', 'GOOGLE_SHEETS'), 'Google Sheets');
  assert.equal(defaultNoteLinkLabel('https://example.com/path', 'WEBSITE'), 'example.com');
});
