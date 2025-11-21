/**
 * Token utility functions for secure KPI update links
 */

/**
 * Generates a cryptographically secure random token
 * @returns A 32-character random string suitable for URLs
 */
export function generateUpdateToken(): string {
    // Generate a random token using crypto-random values
    const array = new Uint8Array(24); // 24 bytes = 32 base64 characters (approx)

    if (typeof window !== 'undefined' && window.crypto) {
        // Browser environment
        window.crypto.getRandomValues(array);
    } else if (typeof global !== 'undefined' && global.crypto) {
        // Node environment (Next.js server)
        global.crypto.getRandomValues(array);
    } else {
        // Fallback - less secure but functional
        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
    }

    // Convert to base64 and make URL-safe
    const base64 = btoa(String.fromCharCode(...array));
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * Validates that a token has the correct format
 * @param token The token to validate
 * @returns true if the token format is valid
 */
export function validateToken(token: string): boolean {
    // Check if token exists and has reasonable length
    if (!token || token.length < 20 || token.length > 50) {
        return false;
    }

    // Check if token only contains URL-safe base64 characters
    const validPattern = /^[A-Za-z0-9\-_]+$/;
    return validPattern.test(token);
}

/**
 * Builds the full update URL for a KPI
 * @param token The KPI's update token
 * @param baseUrl Optional base URL (defaults to current origin)
 * @returns Full URL for the update interface
 */
export function buildUpdateUrl(token: string, baseUrl?: string): string {
    const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}/update/${token}`;
}
