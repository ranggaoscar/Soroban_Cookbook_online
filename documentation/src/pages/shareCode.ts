/**
 * Share-link codec for the Playground.
 *
 * The shared payload travels in the URL fragment, so it must be URL-safe base64.
 * Standard base64 emits `+`, `/` and `=`; `+` is read as a space by form and email
 * linkification, and `/` collides with path separators, so a copied link can be
 * silently corrupted before it is ever opened. This encodes to base64url
 * (RFC 4648 §5) and strips the `=` padding.
 *
 * Decoding accepts both alphabets: links produced by older builds used standard
 * base64, and those must keep working.
 */

const BASE64URL = /^[A-Za-z0-9_-]*$/;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = window.atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** Encode code for the `#code=` fragment: base64url, no padding. */
export function encodeSharedCode(value: string): string {
  const base64 = bytesToBase64(new TextEncoder().encode(value));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode a value taken from the `#code=` fragment.
 *
 * Throws on input that is not base64 at all, so the caller can fall back to the
 * default template. Standard-base64 characters are normalised to base64url before
 * decoding, which keeps previously shared links working.
 */
export function decodeSharedCode(value: string): string {
  if (!BASE64URL.test(value) && !/^[A-Za-z0-9+/=]*$/.test(value)) {
    throw new Error('shared code is not base64');
  }

  const normalised = value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const padded = normalised.replace(/-/g, '+').replace(/_/g, '/');
  const restored = padded + '='.repeat((4 - (padded.length % 4)) % 4);

  return new TextDecoder().decode(base64ToBytes(restored));
}
