import { describe, it, expect } from 'vitest';
import { decodeSharedCode, encodeSharedCode } from './shareCode';

/**
 * The shared payload is placed in the URL fragment. Anything the URL cannot carry
 * verbatim corrupts a shared link before it is opened, so these tests assert the
 * alphabet, the absence of padding, and that old standard-base64 links still work.
 */
describe('encodeSharedCode', () => {
  it('emits only URL-safe characters', () => {
    // Bytes chosen so standard base64 would produce '+' and '/' characters.
    const code = '\u00fb\u00ff\u00bfhello world\u00fe';
    const encoded = encodeSharedCode(code);

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
  });

  it('strips base64 padding', () => {
    for (const code of ['a', 'ab', 'abc', 'abcd', 'abcde']) {
      expect(encodeSharedCode(code)).not.toContain('=');
    }
  });

  it('round-trips utf-8 source code exactly', () => {
    const code =
      '#[contract]\npub fn hello() -> Symbol {\n  symbol_short!("Hello")\n}\n// ünïcode ✓';
    expect(decodeSharedCode(encodeSharedCode(code))).toBe(code);
  });
});

describe('decodeSharedCode', () => {
  it('accepts a previously shared standard-base64 link', () => {
    // What the old encoder produced for "hello?": '+' and '/' would break a URL,
    // but a link already in the wild must keep working.
    const legacy = window.btoa(String.fromCharCode(...new TextEncoder().encode('hello?')));
    expect(decodeSharedCode(legacy)).toBe('hello?');
  });

  it('accepts a legacy payload containing "+" and "/"', () => {
    // '~~~???' is ASCII-safe as code but its standard-base64 form is "fn5+Pz8/",
    // which carries both characters that break a copied URL. A link already in the
    // wild with those characters must keep decoding.
    const text = '~~~???';
    const legacy = window.btoa(String.fromCharCode(...new TextEncoder().encode(text)));
    expect(legacy).toMatch(/\+/);
    expect(legacy).toMatch(/\//);
    expect(decodeSharedCode(legacy)).toBe(text);
    expect(encodeSharedCode(text)).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encodeSharedCode(text)).not.toContain('+');
    expect(encodeSharedCode(text)).not.toContain('/');
  });

  it('throws on input that is not base64, so the caller can fall back', () => {
    expect(() => decodeSharedCode('not base64 at all!')).toThrow();
  });
});
