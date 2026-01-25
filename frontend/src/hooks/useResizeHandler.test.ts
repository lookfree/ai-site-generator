import { describe, it, expect } from 'vitest';
import {
  widthToTailwind,
  heightToTailwind,
  removeWidthHeightClasses,
} from './useResizeHandler';

describe('useResizeHandler utility functions', () => {
  describe('widthToTailwind', () => {
    it('should convert common pixel widths to Tailwind classes', () => {
      expect(widthToTailwind(64)).toBe('w-16');
      expect(widthToTailwind(128)).toBe('w-32');
      expect(widthToTailwind(256)).toBe('w-64');
      expect(widthToTailwind(384)).toBe('w-96');
    });

    it('should use arbitrary values for non-standard widths', () => {
      // Values that are clearly outside 20% tolerance of any Tailwind class
      expect(widthToTailwind(500)).toBe('w-[500px]');
      expect(widthToTailwind(600)).toBe('w-[600px]');
      expect(widthToTailwind(1000)).toBe('w-[1000px]');
    });

    it('should match close values to Tailwind classes', () => {
      // Within 20% tolerance
      expect(widthToTailwind(65)).toBe('w-16'); // Close to 64
      expect(widthToTailwind(130)).toBe('w-32'); // Close to 128
    });
  });

  describe('heightToTailwind', () => {
    it('should convert common pixel heights to Tailwind classes', () => {
      expect(heightToTailwind(64)).toBe('h-16');
      expect(heightToTailwind(128)).toBe('h-32');
      expect(heightToTailwind(256)).toBe('h-64');
      expect(heightToTailwind(384)).toBe('h-96');
    });

    it('should use arbitrary values for non-standard heights', () => {
      // Values that are clearly outside 20% tolerance of any Tailwind class
      expect(heightToTailwind(500)).toBe('h-[500px]');
      expect(heightToTailwind(600)).toBe('h-[600px]');
      expect(heightToTailwind(1000)).toBe('h-[1000px]');
    });
  });

  describe('removeWidthHeightClasses', () => {
    it('should remove width classes', () => {
      expect(removeWidthHeightClasses('p-4 w-full text-white')).toBe('p-4 text-white');
      expect(removeWidthHeightClasses('w-1/2 flex')).toBe('flex');
      expect(removeWidthHeightClasses('w-[200px] bg-blue-500')).toBe('bg-blue-500');
    });

    it('should remove height classes', () => {
      expect(removeWidthHeightClasses('p-4 h-full text-white')).toBe('p-4 text-white');
      expect(removeWidthHeightClasses('h-screen flex')).toBe('flex');
      expect(removeWidthHeightClasses('h-[300px] bg-blue-500')).toBe('bg-blue-500');
    });

    it('should remove both width and height classes', () => {
      expect(removeWidthHeightClasses('w-full h-screen p-4')).toBe('p-4');
      expect(removeWidthHeightClasses('w-1/2 h-64 flex items-center')).toBe('flex items-center');
    });

    it('should handle empty className', () => {
      expect(removeWidthHeightClasses('')).toBe('');
    });

    it('should preserve unrelated classes', () => {
      expect(removeWidthHeightClasses('flex items-center justify-center')).toBe('flex items-center justify-center');
    });
  });
});
