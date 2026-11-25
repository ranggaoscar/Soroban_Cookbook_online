/**
 * Soroban Remote Compilation Service Client
 * Provides interfaces and API handlers for server-side compilation of Soroban contracts.
 */

export interface CompilationRequest {
  contractName: string;
  sourceCode: string;
  cargoToml?: string;
  sorobanSdkVersion?: string;
}

export interface CompilationResponse {
  success: boolean;
  wasmBase64?: string;
  hash?: string;
  abi?: Record<string, unknown>;
  buildLogs?: string;
  error?: string;
}

/**
 * Validates whether a value is a valid, non-empty base64 string.
 */
export function isValidBase64(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }

  // Base64 strings must have a length divisible by 4 (including '=' padding)
  if (value.length % 4 !== 0) {
    return false;
  }

  // Matches valid standard base64 characters with 0, 1, or 2 padding '=' characters
  const base64Regex =
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;

  if (!base64Regex.test(value)) {
    return false;
  }

  // Additional sanity check using atob if available
  if (typeof atob === 'function') {
    try {
      atob(value);
      return true;
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * Sends contract source code to a remote compilation server to build and optimize
 * WASM bytecode for deployment.
 *
 * `apiEndpoint` has no default: there is no public compilation service, and the
 * previous placeholder (`api.sorobancookbook.org`) does not resolve in DNS, so
 * every caller that relied on it silently failed at network time. A caller must
 * name the compiler it is talking to, and a missing endpoint is reported before
 * any request is attempted.
 */
export async function compileContractRemote(
  request: CompilationRequest,
  apiEndpoint?: string,
): Promise<CompilationResponse> {
  const endpoint = typeof apiEndpoint === 'string' ? apiEndpoint.trim() : '';
  if (endpoint === '') {
    return {
      success: false,
      error:
        'No compilation endpoint configured: pass the endpoint of a Soroban compilation service explicitly.',
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Server compilation failed [HTTP ${response.status}]: ${errorText}`,
      };
    }

    const data: CompilationResponse = await response.json();

    if (data.success) {
      if (
        !data.wasmBase64 ||
        typeof data.wasmBase64 !== 'string' ||
        data.wasmBase64.trim().length === 0
      ) {
        return {
          ...data,
          success: false,
          error: data.error || 'Compilation response succeeded but missing wasmBase64 payload',
        };
      }

      if (!isValidBase64(data.wasmBase64)) {
        return {
          ...data,
          success: false,
          error:
            data.error ||
            'Compilation response succeeded but wasmBase64 is not a valid base64 string',
        };
      }
    }

    return data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Network request failed: ${message}`,
    };
  }
}
