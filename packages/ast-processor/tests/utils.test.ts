/**
 * 工具函数测试
 */

import { describe, it, expect } from 'vitest';
import {
  cloneDeep,
  cloneShallow,
  cloneWith,
  deepFreeze,
} from '../src/utils/clone';
import {
  isEqual,
  diff,
  isNodeType,
  getNodeType,
  hasSpan,
} from '../src/utils/compare';

describe('Clone Utils', () => {
  describe('cloneDeep', () => {
    it('should clone primitive values', () => {
      expect(cloneDeep(42)).toBe(42);
      expect(cloneDeep('hello')).toBe('hello');
      expect(cloneDeep(true)).toBe(true);
      expect(cloneDeep(null)).toBeNull();
      expect(cloneDeep(undefined)).toBeUndefined();
    });

    it('should deep clone objects', () => {
      const original = {
        a: 1,
        b: { c: 2 },
        d: [1, 2, 3],
      };

      const cloned = cloneDeep(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
      expect(cloned.d).not.toBe(original.d);
    });

    it('should clone arrays', () => {
      const original = [1, [2, 3], { a: 4 }];

      const cloned = cloneDeep(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned[1]).not.toBe(original[1]);
      expect(cloned[2]).not.toBe(original[2]);
    });

    it('should clone nested AST-like structure', () => {
      const original = {
        type: 'Module',
        body: [
          {
            type: 'VariableDeclaration',
            declarations: [{ type: 'VariableDeclarator', id: { type: 'Identifier', value: 'x' } }],
          },
        ],
      };

      const cloned = cloneDeep(original);

      expect(cloned).toEqual(original);
      expect(cloned.body[0]).not.toBe(original.body[0]);
    });

    it('should clone Map', () => {
      const original = new Map([['a', 1], ['b', 2]]);

      const cloned = cloneDeep(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });

    it('should clone Set', () => {
      const original = new Set([1, 2, 3]);

      const cloned = cloneDeep(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });

    it('should clone Date', () => {
      const original = new Date('2024-01-01');

      const cloned = cloneDeep(original);

      expect(cloned.getTime()).toBe(original.getTime());
      expect(cloned).not.toBe(original);
    });
  });

  describe('cloneShallow', () => {
    it('should shallow clone objects', () => {
      const inner = { c: 2 };
      const original = { a: 1, b: inner };

      const cloned = cloneShallow(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).toBe(inner); // Same reference
    });

    it('should shallow clone arrays', () => {
      const inner = [2, 3];
      const original = [1, inner];

      const cloned = cloneShallow(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned[1]).toBe(inner); // Same reference
    });
  });

  describe('cloneWith', () => {
    it('should clone and apply modifications', () => {
      const original = { a: 1, b: 2, c: 3 };

      const cloned = cloneWith(original, { b: 20, d: 4 } as any);

      expect(cloned.a).toBe(1);
      expect(cloned.b).toBe(20);
      expect(cloned.c).toBe(3);
      expect((cloned as any).d).toBe(4);
      expect(original.b).toBe(2); // Original unchanged
    });
  });

  describe('deepFreeze', () => {
    it('should freeze object deeply', () => {
      const obj = { a: 1, b: { c: 2 } };

      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.b)).toBe(true);
    });
  });
});

describe('Compare Utils', () => {
  describe('isEqual', () => {
    it('should compare primitives', () => {
      expect(isEqual(1, 1)).toBe(true);
      expect(isEqual(1, 2)).toBe(false);
      expect(isEqual('a', 'a')).toBe(true);
      expect(isEqual(null, null)).toBe(true);
      expect(isEqual(undefined, undefined)).toBe(true);
      expect(isEqual(null, undefined)).toBe(false);
    });

    it('should compare objects', () => {
      expect(isEqual({ a: 1 }, { a: 1 })).toBe(true);
      expect(isEqual({ a: 1 }, { a: 2 })).toBe(false);
      expect(isEqual({ a: 1 }, { b: 1 })).toBe(false);
      expect(isEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
    });

    it('should compare arrays', () => {
      expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(isEqual([1, 2, 3], [1, 2])).toBe(false);
      expect(isEqual([1, 2], [1, 3])).toBe(false);
    });

    it('should compare nested structures', () => {
      const a = { x: { y: [1, 2] } };
      const b = { x: { y: [1, 2] } };
      const c = { x: { y: [1, 3] } };

      expect(isEqual(a, b)).toBe(true);
      expect(isEqual(a, c)).toBe(false);
    });
  });

  describe('diff', () => {
    it('should return empty array for equal values', () => {
      const result = diff({ a: 1 }, { a: 1 });
      expect(result).toEqual([]);
    });

    it('should detect additions', () => {
      const result = diff({ a: 1 }, { a: 1, b: 2 });

      expect(result.length).toBe(1);
      expect(result[0].type).toBe('add');
      expect(result[0].path).toBe('b');
    });

    it('should detect removals', () => {
      const result = diff({ a: 1, b: 2 }, { a: 1 });

      expect(result.length).toBe(1);
      expect(result[0].type).toBe('remove');
      expect(result[0].path).toBe('b');
    });

    it('should detect modifications', () => {
      const result = diff({ a: 1 }, { a: 2 });

      expect(result.length).toBe(1);
      expect(result[0].type).toBe('modify');
      expect(result[0].oldValue).toBe(1);
      expect(result[0].newValue).toBe(2);
    });

    it('should detect type changes', () => {
      const result = diff({ a: 1 }, { a: '1' });

      expect(result.length).toBe(1);
      expect(result[0].type).toBe('type-change');
    });

    it('should diff arrays', () => {
      const result = diff([1, 2], [1, 2, 3]);

      expect(result.length).toBe(1);
      expect(result[0].type).toBe('add');
    });
  });

  describe('isNodeType', () => {
    it('should check node type', () => {
      const node = { type: 'Identifier', value: 'x' };

      expect(isNodeType(node, 'Identifier')).toBe(true);
      expect(isNodeType(node, 'StringLiteral')).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(isNodeType(null, 'Identifier')).toBe(false);
      expect(isNodeType('string', 'Identifier')).toBe(false);
    });
  });

  describe('getNodeType', () => {
    it('should get node type', () => {
      const node = { type: 'Identifier', value: 'x' };

      expect(getNodeType(node)).toBe('Identifier');
    });

    it('should return undefined for non-objects', () => {
      expect(getNodeType(null)).toBeUndefined();
      expect(getNodeType('string')).toBeUndefined();
    });
  });

  describe('hasSpan', () => {
    it('should check for span', () => {
      const nodeWithSpan = { type: 'Identifier', span: { start: 0, end: 1 } };
      const nodeWithoutSpan = { type: 'Identifier', value: 'x' };

      expect(hasSpan(nodeWithSpan)).toBe(true);
      expect(hasSpan(nodeWithoutSpan)).toBe(false);
    });
  });
});
