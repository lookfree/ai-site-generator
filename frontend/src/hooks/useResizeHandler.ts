/**
 * Hook for handling element resize events from the visual editor
 * Converts pixel sizes to Tailwind classes
 */

import { useEffect, useCallback } from 'react';

interface ResizeInfo {
  jsxId: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

interface UseResizeHandlerOptions {
  projectId: string | undefined;
  onResize?: (info: ResizeInfo) => void;
  onResizeEnd?: (info: ResizeInfo) => void;
}

// Tailwind width classes mapping
const TAILWIND_WIDTHS: Record<number, string> = {
  0: 'w-0',
  4: 'w-1',
  8: 'w-2',
  12: 'w-3',
  16: 'w-4',
  20: 'w-5',
  24: 'w-6',
  28: 'w-7',
  32: 'w-8',
  36: 'w-9',
  40: 'w-10',
  44: 'w-11',
  48: 'w-12',
  56: 'w-14',
  64: 'w-16',
  80: 'w-20',
  96: 'w-24',
  112: 'w-28',
  128: 'w-32',
  144: 'w-36',
  160: 'w-40',
  176: 'w-44',
  192: 'w-48',
  208: 'w-52',
  224: 'w-56',
  240: 'w-60',
  256: 'w-64',
  288: 'w-72',
  320: 'w-80',
  384: 'w-96',
};

// Tailwind height classes mapping
const TAILWIND_HEIGHTS: Record<number, string> = {
  0: 'h-0',
  4: 'h-1',
  8: 'h-2',
  12: 'h-3',
  16: 'h-4',
  20: 'h-5',
  24: 'h-6',
  28: 'h-7',
  32: 'h-8',
  36: 'h-9',
  40: 'h-10',
  44: 'h-11',
  48: 'h-12',
  56: 'h-14',
  64: 'h-16',
  80: 'h-20',
  96: 'h-24',
  112: 'h-28',
  128: 'h-32',
  144: 'h-36',
  160: 'h-40',
  176: 'h-44',
  192: 'h-48',
  208: 'h-52',
  224: 'h-56',
  240: 'h-60',
  256: 'h-64',
  288: 'h-72',
  320: 'h-80',
  384: 'h-96',
};

// Find closest Tailwind size class
function findClosestSize(
  value: number,
  mapping: Record<number, string>
): string | null {
  const sizes = Object.keys(mapping)
    .map(Number)
    .sort((a, b) => a - b);

  let closest = sizes[0];
  let minDiff = Math.abs(value - closest);

  for (const size of sizes) {
    const diff = Math.abs(value - size);
    if (diff < minDiff) {
      minDiff = diff;
      closest = size;
    }
  }

  // Only use Tailwind class if within 20% tolerance
  if (minDiff / value < 0.2) {
    return mapping[closest];
  }

  return null;
}

// Convert width to Tailwind class or arbitrary value
function widthToTailwind(width: number): string {
  const tailwindClass = findClosestSize(width, TAILWIND_WIDTHS);
  if (tailwindClass) return tailwindClass;

  // Use arbitrary value for non-standard sizes
  return `w-[${Math.round(width)}px]`;
}

// Convert height to Tailwind class or arbitrary value
function heightToTailwind(height: number): string {
  const tailwindClass = findClosestSize(height, TAILWIND_HEIGHTS);
  if (tailwindClass) return tailwindClass;

  // Use arbitrary value for non-standard sizes
  return `h-[${Math.round(height)}px]`;
}

// Remove existing width/height classes from className
function removeWidthHeightClasses(className: string): string {
  return className
    .split(/\s+/)
    .filter((cls) => {
      // Remove w-* and h-* classes
      if (/^w-/.test(cls) || /^h-/.test(cls)) {
        return false;
      }
      return true;
    })
    .join(' ');
}

export function useResizeHandler({
  projectId,
  onResize,
  onResizeEnd,
}: UseResizeHandlerOptions) {
  const handleResizeMessage = useCallback(
    async (event: MessageEvent) => {
      if (!projectId) return;

      const { type, payload } = event.data || {};

      if (type === 'ELEMENT_RESIZING') {
        const info = payload as ResizeInfo;
        onResize?.(info);
      }

      if (type === 'ELEMENT_RESIZED') {
        const info = payload as ResizeInfo;
        onResizeEnd?.(info);

        // Convert to Tailwind classes and update via AST
        try {
          // Get current className from the component
          // We'll update with new width/height classes
          const widthClass = widthToTailwind(info.width);
          const heightClass = heightToTailwind(info.height);

          // Fetch current component to get existing className
          // For now, we'll just send the size update message
          console.log(`[ResizeHandler] Resize completed: ${widthClass} ${heightClass}`);

          // Post message to update the component
          // The actual className update will be handled by the PropertyPanel
          // which has access to the selected component's className
        } catch (error) {
          console.error('[ResizeHandler] Failed to update size:', error);
        }
      }
    },
    [projectId, onResize, onResizeEnd]
  );

  useEffect(() => {
    window.addEventListener('message', handleResizeMessage);
    return () => window.removeEventListener('message', handleResizeMessage);
  }, [handleResizeMessage]);

  // Helper function to apply resize to className
  const applyResizeToClassName = useCallback(
    (
      currentClassName: string,
      width: number,
      height: number
    ): string => {
      const cleanedClassName = removeWidthHeightClasses(currentClassName);
      const widthClass = widthToTailwind(width);
      const heightClass = heightToTailwind(height);
      return `${cleanedClassName} ${widthClass} ${heightClass}`.trim();
    },
    []
  );

  return {
    applyResizeToClassName,
    widthToTailwind,
    heightToTailwind,
  };
}

export { widthToTailwind, heightToTailwind, removeWidthHeightClasses };
