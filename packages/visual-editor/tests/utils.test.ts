/**
 * Utils 测试
 */

import { describe, it, expect } from 'vitest';
import {
  classNames,
  parseClasses,
  addClass,
  removeClass,
  toggleClass,
  replaceClassByPrefix,
  findClassByPrefix,
  parseTailwindModifiers,
  buildTailwindClass,
  sortTailwindClasses,
} from '../src/utils/class-utils';
import {
  parseCssValue,
  formatCssValue,
  parseShorthand,
  parseColor,
  colorToHex,
} from '../src/utils/css-parser';

describe('class-utils', () => {
  describe('classNames', () => {
    it('should join class names', () => {
      expect(classNames('a', 'b', 'c')).toBe('a b c');
    });

    it('should filter falsy values', () => {
      expect(classNames('a', false, undefined, null, 'b')).toBe('a b');
    });
  });

  describe('parseClasses', () => {
    it('should parse class string', () => {
      expect(parseClasses('flex items-center gap-4')).toEqual(['flex', 'items-center', 'gap-4']);
    });

    it('should handle extra whitespace', () => {
      expect(parseClasses('  flex   items-center  ')).toEqual(['flex', 'items-center']);
    });
  });

  describe('addClass', () => {
    it('should add classes', () => {
      expect(addClass('flex', 'items-center', 'gap-4')).toBe('flex items-center gap-4');
    });

    it('should not duplicate classes', () => {
      expect(addClass('flex items-center', 'flex')).toBe('flex items-center');
    });
  });

  describe('removeClass', () => {
    it('should remove classes', () => {
      expect(removeClass('flex items-center gap-4', 'items-center')).toBe('flex gap-4');
    });

    it('should handle missing classes', () => {
      expect(removeClass('flex items-center', 'gap-4')).toBe('flex items-center');
    });
  });

  describe('toggleClass', () => {
    it('should add class when not present', () => {
      expect(toggleClass('flex', 'items-center')).toBe('flex items-center');
    });

    it('should remove class when present', () => {
      expect(toggleClass('flex items-center', 'items-center')).toBe('flex');
    });

    it('should force add', () => {
      expect(toggleClass('flex', 'items-center', true)).toBe('flex items-center');
    });

    it('should force remove', () => {
      expect(toggleClass('flex items-center', 'items-center', false)).toBe('flex');
    });
  });

  describe('replaceClassByPrefix', () => {
    it('should replace class by prefix', () => {
      expect(replaceClassByPrefix('flex text-sm text-red-500', 'text-', 'text-lg')).toBe('flex text-lg');
    });
  });

  describe('findClassByPrefix', () => {
    it('should find class by prefix', () => {
      expect(findClassByPrefix('flex text-sm gap-4', 'text-')).toBe('text-sm');
    });

    it('should return null if not found', () => {
      expect(findClassByPrefix('flex gap-4', 'text-')).toBeNull();
    });
  });

  describe('parseTailwindModifiers', () => {
    it('should parse base class', () => {
      expect(parseTailwindModifiers('text-sm')).toEqual({
        responsive: null,
        state: null,
        dark: false,
        baseClass: 'text-sm',
      });
    });

    it('should parse responsive prefix', () => {
      expect(parseTailwindModifiers('md:text-lg')).toEqual({
        responsive: 'md',
        state: null,
        dark: false,
        baseClass: 'text-lg',
      });
    });

    it('should parse state prefix', () => {
      expect(parseTailwindModifiers('hover:text-blue-500')).toEqual({
        responsive: null,
        state: 'hover',
        dark: false,
        baseClass: 'text-blue-500',
      });
    });

    it('should parse dark mode', () => {
      expect(parseTailwindModifiers('dark:bg-gray-800')).toEqual({
        responsive: null,
        state: null,
        dark: true,
        baseClass: 'bg-gray-800',
      });
    });
  });

  describe('buildTailwindClass', () => {
    it('should build base class', () => {
      expect(buildTailwindClass('text-sm')).toBe('text-sm');
    });

    it('should build with responsive', () => {
      expect(buildTailwindClass('text-lg', { responsive: 'md' })).toBe('md:text-lg');
    });

    it('should build with state', () => {
      expect(buildTailwindClass('text-blue-500', { state: 'hover' })).toBe('hover:text-blue-500');
    });

    it('should build with dark mode', () => {
      expect(buildTailwindClass('bg-gray-800', { dark: true })).toBe('dark:bg-gray-800');
    });
  });

  describe('sortTailwindClasses', () => {
    it('should sort classes by category', () => {
      const sorted = sortTailwindClasses('text-lg flex p-4 bg-white');
      expect(sorted).toBe('flex p-4 text-lg bg-white');
    });
  });
});

describe('css-parser', () => {
  describe('parseCssValue', () => {
    it('should parse pixel value', () => {
      expect(parseCssValue('16px')).toEqual({ number: 16, unit: 'px' });
    });

    it('should parse percentage', () => {
      expect(parseCssValue('50%')).toEqual({ number: 50, unit: '%' });
    });

    it('should parse rem', () => {
      expect(parseCssValue('1.5rem')).toEqual({ number: 1.5, unit: 'rem' });
    });

    it('should handle invalid value', () => {
      expect(parseCssValue('auto')).toEqual({ number: null, unit: null });
    });
  });

  describe('formatCssValue', () => {
    it('should format with px', () => {
      expect(formatCssValue(16)).toBe('16px');
    });

    it('should format with custom unit', () => {
      expect(formatCssValue(50, '%')).toBe('50%');
    });
  });

  describe('parseShorthand', () => {
    it('should parse single value', () => {
      expect(parseShorthand('16px')).toEqual({
        top: '16px', right: '16px', bottom: '16px', left: '16px'
      });
    });

    it('should parse two values', () => {
      expect(parseShorthand('10px 20px')).toEqual({
        top: '10px', right: '20px', bottom: '10px', left: '20px'
      });
    });

    it('should parse four values', () => {
      expect(parseShorthand('1px 2px 3px 4px')).toEqual({
        top: '1px', right: '2px', bottom: '3px', left: '4px'
      });
    });
  });

  describe('parseColor', () => {
    it('should parse 6-digit hex', () => {
      expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    });

    it('should parse 3-digit hex', () => {
      expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    });

    it('should parse rgb', () => {
      expect(parseColor('rgb(255, 0, 0)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    });

    it('should parse rgba', () => {
      expect(parseColor('rgba(255, 0, 0, 0.5)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
    });
  });

  describe('colorToHex', () => {
    it('should convert to hex', () => {
      expect(colorToHex({ r: 255, g: 0, b: 0 })).toBe('#ff0000');
    });

    it('should include alpha', () => {
      expect(colorToHex({ r: 255, g: 0, b: 0, a: 0.5 })).toBe('#ff000080');
    });
  });
});
