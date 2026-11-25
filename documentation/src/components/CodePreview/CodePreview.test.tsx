import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CodePreview from './CodePreview';

const SAMPLE = 'pub fn main() {\n    // hello\n}';

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    writable: true,
    value: { writeText },
  });
}

function removeClipboard() {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    writable: true,
    value: undefined,
  });
}

describe('CodePreview copy button', () => {
  let execCommand: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    execCommand = vi.fn(() => true);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      writable: true,
      value: execCommand,
    });
  });

  afterEach(() => {
    cleanup();
    removeClipboard();
    vi.restoreAllMocks();
  });

  it('writes the code through the Clipboard API and confirms the copy', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve());
    stubClipboard(writeText);

    render(<CodePreview code={SAMPLE} language="rust" title="lib.rs" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copy code to clipboard/i }));
    });

    expect(writeText).toHaveBeenCalledWith(SAMPLE);
    expect(screen.getByRole('button', { name: /copied to clipboard/i })).toBeInTheDocument();
    expect(screen.getByText('Copied!')).toBeInTheDocument();
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('asks the user to copy manually when the Clipboard API is unavailable', async () => {
    removeClipboard();

    render(<CodePreview code={SAMPLE} language="rust" title="lib.rs" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copy code to clipboard/i }));
    });

    expect(screen.getByRole('status')).toHaveTextContent(/select the code and press/i);
    expect(
      screen.getByRole('button', { name: /clipboard unavailable, copy the code manually/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
    // The deprecated path is gone: nothing writes to the clipboard behind the user's back.
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('reports a refused write instead of claiming success', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>(() =>
      Promise.reject(new Error('clipboard denied')),
    );
    stubClipboard(writeText);

    render(<CodePreview code={SAMPLE} language="rust" title="lib.rs" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copy code to clipboard/i }));
    });

    expect(writeText).toHaveBeenCalledWith(SAMPLE);
    expect(screen.getByRole('status')).toHaveTextContent(/select the code and press/i);
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
    expect(execCommand).not.toHaveBeenCalled();
  });
});
