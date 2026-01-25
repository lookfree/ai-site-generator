import '@testing-library/jest-dom';
import { afterEach } from 'vitest';

// Mock window.postMessage for iframe communication tests
const originalPostMessage = window.postMessage.bind(window);
window.postMessage = function(
  message: unknown,
  targetOriginOrOptions?: string | WindowPostMessageOptions,
  transfer?: Transferable[]
): void {
  // For tests, just dispatch as a message event
  const targetOrigin = typeof targetOriginOrOptions === 'string'
    ? targetOriginOrOptions
    : targetOriginOrOptions?.targetOrigin || '*';
  const event = new MessageEvent('message', {
    data: message,
    origin: targetOrigin,
  });
  window.dispatchEvent(event);
  // Also call original for proper behavior
  if (typeof targetOriginOrOptions === 'string') {
    originalPostMessage(message, targetOriginOrOptions, transfer);
  } else {
    originalPostMessage(message, targetOriginOrOptions);
  }
};

// Cleanup after tests
afterEach(() => {
  window.postMessage = originalPostMessage;
});
