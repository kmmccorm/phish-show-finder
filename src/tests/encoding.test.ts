/**
 * Tests for encoding repair
 */

import { describe, expect, test } from 'vitest';
import { fixEncodingIssues } from '../lib/encoding';

/** Produce mojibake the way it happens for real: UTF-8 bytes read as Latin-1. */
const garble = (text: string) =>
  Array.from(new TextEncoder().encode(text), (byte) => String.fromCharCode(byte)).join('');

describe('fixEncodingIssues', () => {
  test('leaves clean text alone', () => {
    expect(fixEncodingIssues('Trey teased "Stash" in Tweezer.')).toBe('Trey teased "Stash" in Tweezer.');
    expect(fixEncodingIssues('')).toBe('');
  });

  test('keeps legitimately accented characters', () => {
    expect(fixEncodingIssues('Théâtre St-Denis, Montréal')).toBe('Théâtre St-Denis, Montréal');
    expect(fixEncodingIssues('Pâté')).toBe('Pâté');
  });

  test('decodes Windows-1252 mojibake', () => {
    expect(fixEncodingIssues('didnâ€™t')).toBe('didn’t');
    expect(fixEncodingIssues('â€œHarry Hoodâ€\u009d')).toBe('“Harry Hood”');
    expect(fixEncodingIssues('1997â€“1998â€¦')).toBe('1997–1998…');
    expect(fixEncodingIssues('MontrÃ©al')).toBe('Montréal');
  });

  test('decodes Latin-1 mojibake with invisible control characters', () => {
    expect(fixEncodingIssues(garble('didn’t'))).toBe('didn’t');
    expect(fixEncodingIssues(garble('“Harry Hood” — a first'))).toBe('“Harry Hood” — a first');
    expect(fixEncodingIssues(garble('Théâtre'))).toBe('Théâtre');
  });

  test('cleans up stray non-breaking-space remains', () => {
    expect(fixEncodingIssues('first set.Â Second set')).toBe('first set. Second set');
    expect(fixEncodingIssues(garble('one two'))).toBe('one two');
  });

  test('falls back for sequences that lost their trailing bytes', () => {
    expect(fixEncodingIssues('didnât play')).toBe("didn't play");
    expect(fixEncodingIssues("the clockâs chime")).toBe("the clock's chime");
    expect(fixEncodingIssues('said â€œhiâ€')).toBe('said “hi"');
  });
});
