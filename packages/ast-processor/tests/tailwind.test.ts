/**
 * Tailwind 模块测试
 */

import { describe, it, expect } from 'vitest';
import {
  cssToTailwind,
  cssObjectToTailwind,
  parseCSSString,
  cssStringToTailwind,
} from '../src/tailwind/mapper';
import {
  mergeClasses,
  removeClasses,
  normalizeClassString,
  classesToString,
  mergeClassStrings,
  findConflict,
  deduplicateClasses,
  sortClasses,
} from '../src/tailwind/merger';
import {
  getPreset,
  getPresetClasses,
  searchPresets,
  getPresetsByCategory,
} from '../src/tailwind/presets';

describe('CSS to Tailwind Mapper', () => {
  describe('cssToTailwind', () => {
    it('should map font-size', () => {
      expect(cssToTailwind('font-size', '16px')).toBe('text-base');
      expect(cssToTailwind('font-size', '14px')).toBe('text-sm');
      expect(cssToTailwind('font-size', '24px')).toBe('text-2xl');
      expect(cssToTailwind('font-size', '18px')).toBe('text-lg');
      expect(cssToTailwind('font-size', '99px')).toBe('text-[99px]');
    });

    it('should map font-weight', () => {
      expect(cssToTailwind('font-weight', '400')).toBe('font-normal');
      expect(cssToTailwind('font-weight', '700')).toBe('font-bold');
      expect(cssToTailwind('font-weight', '600')).toBe('font-semibold');
    });

    it('should map colors', () => {
      expect(cssToTailwind('color', '#ffffff')).toBe('text-[#ffffff]');
      expect(cssToTailwind('background-color', '#000000')).toBe('bg-[#000000]');
      expect(cssToTailwind('background-color', 'red')).toBe('bg-red');
    });

    it('should map padding', () => {
      expect(cssToTailwind('padding', '16px')).toBe('p-4');
      expect(cssToTailwind('padding', '8px')).toBe('p-2');
      expect(cssToTailwind('padding-top', '4px')).toBe('pt-1');
      expect(cssToTailwind('padding', '15px')).toBe('p-[15px]');
    });

    it('should map margin', () => {
      expect(cssToTailwind('margin', '0')).toBe('m-0');
      expect(cssToTailwind('margin', 'auto')).toBe('m-auto');
      expect(cssToTailwind('margin-bottom', '24px')).toBe('mb-6');
    });

    it('should map display', () => {
      expect(cssToTailwind('display', 'flex')).toBe('flex');
      expect(cssToTailwind('display', 'grid')).toBe('grid');
      expect(cssToTailwind('display', 'none')).toBe('hidden');
      expect(cssToTailwind('display', 'block')).toBe('block');
    });

    it('should map flex properties', () => {
      expect(cssToTailwind('flex-direction', 'column')).toBe('flex-col');
      expect(cssToTailwind('justify-content', 'center')).toBe('justify-center');
      expect(cssToTailwind('align-items', 'center')).toBe('items-center');
      expect(cssToTailwind('flex-wrap', 'wrap')).toBe('flex-wrap');
    });

    it('should map border-radius', () => {
      expect(cssToTailwind('border-radius', '4px')).toBe('rounded');
      expect(cssToTailwind('border-radius', '8px')).toBe('rounded-lg');
      expect(cssToTailwind('border-radius', '9999px')).toBe('rounded-full');
    });

    it('should map position', () => {
      expect(cssToTailwind('position', 'absolute')).toBe('absolute');
      expect(cssToTailwind('position', 'relative')).toBe('relative');
      expect(cssToTailwind('position', 'fixed')).toBe('fixed');
    });

    it('should map width and height', () => {
      expect(cssToTailwind('width', '100%')).toBe('w-full');
      expect(cssToTailwind('height', '100vh')).toBe('h-screen');
      expect(cssToTailwind('width', '200px')).toBe('w-[200px]');
    });

    it('should return null for unknown properties', () => {
      expect(cssToTailwind('unknown-property', 'value')).toBeNull();
    });
  });

  describe('cssObjectToTailwind', () => {
    it('should convert CSS object to Tailwind classes', () => {
      const styles = {
        'display': 'flex',
        'flex-direction': 'column',
        'padding': '16px',
        'background-color': '#fff',
      };

      const classes = cssObjectToTailwind(styles);

      expect(classes).toContain('flex');
      expect(classes).toContain('flex-col');
      expect(classes).toContain('p-4');
      expect(classes).toContain('bg-[#fff]');
    });
  });

  describe('parseCSSString', () => {
    it('should parse CSS string to object', () => {
      const css = 'display: flex; padding: 16px; color: red;';
      const result = parseCSSString(css);

      expect(result.display).toBe('flex');
      expect(result.padding).toBe('16px');
      expect(result.color).toBe('red');
    });
  });

  describe('cssStringToTailwind', () => {
    it('should convert CSS string to Tailwind classes', () => {
      const css = 'display: flex; justify-content: center;';
      const result = cssStringToTailwind(css);

      expect(result).toContain('flex');
      expect(result).toContain('justify-center');
    });
  });
});

describe('Class Merger', () => {
  describe('mergeClasses', () => {
    it('should merge non-conflicting classes', () => {
      const existing = ['p-4', 'bg-white'];
      const incoming = ['m-2', 'text-black'];

      const result = mergeClasses(existing, incoming);

      expect(result).toContain('p-4');
      expect(result).toContain('bg-white');
      expect(result).toContain('m-2');
      expect(result).toContain('text-black');
    });

    it('should replace conflicting text size classes', () => {
      const existing = ['text-sm', 'font-bold'];
      const incoming = ['text-lg'];

      const result = mergeClasses(existing, incoming);

      expect(result).toContain('text-lg');
      expect(result).not.toContain('text-sm');
      expect(result).toContain('font-bold');
    });

    it('should replace conflicting display classes', () => {
      const existing = ['block', 'p-4'];
      const incoming = ['flex'];

      const result = mergeClasses(existing, incoming);

      expect(result).toContain('flex');
      expect(result).not.toContain('block');
    });

    it('should replace conflicting padding classes', () => {
      const existing = ['p-4', 'text-sm'];
      const incoming = ['p-8'];

      const result = mergeClasses(existing, incoming);

      expect(result).toContain('p-8');
      expect(result).not.toContain('p-4');
    });
  });

  describe('removeClasses', () => {
    it('should remove specified classes', () => {
      const existing = ['p-4', 'm-2', 'bg-white'];
      const toRemove = ['m-2'];

      const result = removeClasses(existing, toRemove);

      expect(result).toContain('p-4');
      expect(result).toContain('bg-white');
      expect(result).not.toContain('m-2');
    });
  });

  describe('normalizeClassString', () => {
    it('should split and trim class string', () => {
      const result = normalizeClassString('  p-4   m-2  bg-white  ');

      expect(result).toEqual(['p-4', 'm-2', 'bg-white']);
    });
  });

  describe('classesToString', () => {
    it('should join classes with space', () => {
      const result = classesToString(['p-4', 'm-2', 'bg-white']);

      expect(result).toBe('p-4 m-2 bg-white');
    });
  });

  describe('mergeClassStrings', () => {
    it('should merge class strings', () => {
      const result = mergeClassStrings('p-4 text-sm', 'text-lg m-2');

      expect(result).toContain('p-4');
      expect(result).toContain('text-lg');
      expect(result).toContain('m-2');
      expect(result).not.toContain('text-sm');
    });
  });

  describe('findConflict', () => {
    it('should find conflicting class', () => {
      const result = findConflict('text-sm font-bold', 'text-lg');

      expect(result).toBe('text-sm');
    });

    it('should return null for non-conflicting class', () => {
      const result = findConflict('p-4 m-2', 'bg-white');

      expect(result).toBeNull();
    });
  });

  describe('deduplicateClasses', () => {
    it('should remove duplicate classes', () => {
      const result = deduplicateClasses(['p-4', 'm-2', 'p-4', 'bg-white', 'm-2']);

      expect(result).toEqual(['p-4', 'm-2', 'bg-white']);
    });
  });
});

describe('Presets', () => {
  describe('getPreset', () => {
    it('should return preset by name', () => {
      const preset = getPreset('center');

      expect(preset).toBeDefined();
      expect(preset?.name).toBe('center');
      expect(preset?.classes).toContain('flex');
      expect(preset?.classes).toContain('items-center');
      expect(preset?.classes).toContain('justify-center');
    });

    it('should return undefined for unknown preset', () => {
      const preset = getPreset('unknown-preset');

      expect(preset).toBeUndefined();
    });
  });

  describe('getPresetClasses', () => {
    it('should return classes for preset', () => {
      const classes = getPresetClasses('card');

      expect(classes).toContain('bg-white');
      expect(classes).toContain('rounded-lg');
    });

    it('should return empty array for unknown preset', () => {
      const classes = getPresetClasses('unknown-preset');

      expect(classes).toEqual([]);
    });
  });

  describe('searchPresets', () => {
    it('should find presets by name', () => {
      const results = searchPresets('btn');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(p => p.name.includes('btn'))).toBe(true);
    });

    it('should find presets by description', () => {
      const results = searchPresets('居中');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getPresetsByCategory', () => {
    it('should return layout presets', () => {
      const presets = getPresetsByCategory('layout');

      expect(presets.length).toBeGreaterThan(0);
      expect(presets.some(p => p.name === 'center')).toBe(true);
    });

    it('should return button presets', () => {
      const presets = getPresetsByCategory('button');

      expect(presets.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown category', () => {
      const presets = getPresetsByCategory('unknown');

      expect(presets).toEqual([]);
    });
  });
});
