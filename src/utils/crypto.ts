/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Calculates SHA-256 hex checksum of a File or Blob using native Web Crypto API.
 * Guarantees zero alteration of the underlying binary data.
 */
export async function calculateSHA256(fileOrBlob: Blob): Promise<string> {
  const arrayBuffer = await fileOrBlob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexString = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hexString;
}

/**
 * Downloads exact binary original file without any re-encoding, transcoding, or compression.
 */
export function downloadOriginalFile(file: File | Blob, originalFileName: string): void {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = originalFileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Clean up object URL after brief delay
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Formats byte size to human readable string (KB, MB).
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
