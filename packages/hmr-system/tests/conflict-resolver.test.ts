/**
 * ConflictResolver 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictResolver } from '../src/sync/conflict-resolver';

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver({
      defaultResolution: 'keep-local',
      conflictExpiry: 60000,
    });
  });

  describe('detectConflict', () => {
    it('should detect conflict when contents differ', () => {
      const hasConflict = resolver.detectConflict(
        'src/App.tsx',
        'local content',
        'remote content'
      );

      expect(hasConflict).toBe(true);
      expect(resolver.hasConflict('src/App.tsx')).toBe(true);
    });

    it('should not detect conflict when contents are same', () => {
      const hasConflict = resolver.detectConflict(
        'src/App.tsx',
        'same content',
        'same content'
      );

      expect(hasConflict).toBe(false);
      expect(resolver.hasConflict('src/App.tsx')).toBe(false);
    });

    it('should not detect conflict when only local changed with base', () => {
      const hasConflict = resolver.detectConflict(
        'src/App.tsx',
        'local changed',
        'base content',
        'base content'
      );

      expect(hasConflict).toBe(false);
    });

    it('should not detect conflict when only remote changed with base', () => {
      const hasConflict = resolver.detectConflict(
        'src/App.tsx',
        'base content',
        'remote changed',
        'base content'
      );

      expect(hasConflict).toBe(false);
    });

    it('should detect conflict when both changed with base', () => {
      const hasConflict = resolver.detectConflict(
        'src/App.tsx',
        'local changed',
        'remote changed',
        'base content'
      );

      expect(hasConflict).toBe(true);
    });
  });

  describe('resolveConflict', () => {
    beforeEach(() => {
      resolver.detectConflict('src/App.tsx', 'local', 'remote');
    });

    it('should resolve with keep-local', async () => {
      const result = await resolver.resolveConflict('src/App.tsx', 'keep-local');

      expect(result).toBe('local');
      expect(resolver.hasConflict('src/App.tsx')).toBe(false);
    });

    it('should resolve with keep-remote', async () => {
      const result = await resolver.resolveConflict('src/App.tsx', 'keep-remote');

      expect(result).toBe('remote');
    });

    it('should resolve with manual and create conflict markers', async () => {
      const result = await resolver.resolveConflict('src/App.tsx', 'manual');

      expect(result).toContain('<<<<<<< LOCAL');
      expect(result).toContain('local');
      expect(result).toContain('=======');
      expect(result).toContain('remote');
      expect(result).toContain('>>>>>>> REMOTE');
    });

    it('should use default resolution when not specified', async () => {
      const result = await resolver.resolveConflict('src/App.tsx');

      expect(result).toBe('local'); // default is keep-local
    });

    it('should return null for non-existent conflict', async () => {
      const result = await resolver.resolveConflict('non-existent.tsx');

      expect(result).toBeNull();
    });

    it('should use user resolver when set', async () => {
      resolver.setUserResolver(async () => 'keep-remote');

      const result = await resolver.resolveConflict('src/App.tsx');

      expect(result).toBe('remote');
    });
  });

  describe('auto merge', () => {
    it('should merge with base content', async () => {
      resolver.detectConflict(
        'src/App.tsx',
        'line1\nlocal change\nline3',
        'line1\nremote change\nline3',
        'line1\noriginal\nline3'
      );

      const result = await resolver.resolveConflict('src/App.tsx', 'merge');

      // Auto merge will keep local when both changed
      expect(result).toContain('line1');
      expect(result).toContain('line3');
    });

    it('should prefer longer version without base', async () => {
      resolver.detectConflict(
        'src/App.tsx',
        'line1\nline2\nline3',
        'line1\nline2'
      );

      const result = await resolver.resolveConflict('src/App.tsx', 'merge');

      expect(result).toBe('line1\nline2\nline3');
    });
  });

  describe('getAllConflicts', () => {
    it('should return all conflicts', () => {
      resolver.detectConflict('a.tsx', 'local', 'remote');
      resolver.detectConflict('b.tsx', 'local', 'remote');

      const conflicts = resolver.getAllConflicts();

      expect(conflicts).toHaveLength(2);
    });
  });

  describe('clearConflict', () => {
    it('should clear specific conflict', () => {
      resolver.detectConflict('a.tsx', 'local', 'remote');
      resolver.detectConflict('b.tsx', 'local', 'remote');

      resolver.clearConflict('a.tsx');

      expect(resolver.hasConflict('a.tsx')).toBe(false);
      expect(resolver.hasConflict('b.tsx')).toBe(true);
    });
  });

  describe('clearAllConflicts', () => {
    it('should clear all conflicts', () => {
      resolver.detectConflict('a.tsx', 'local', 'remote');
      resolver.detectConflict('b.tsx', 'local', 'remote');

      resolver.clearAllConflicts();

      expect(resolver.getConflictCount()).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should remove expired conflicts', async () => {
      const shortExpiryResolver = new ConflictResolver({
        conflictExpiry: 10,
      });

      shortExpiryResolver.detectConflict('a.tsx', 'local', 'remote');

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 50));

      const cleaned = shortExpiryResolver.cleanup();

      expect(cleaned).toBe(1);
      expect(shortExpiryResolver.getConflictCount()).toBe(0);
    });
  });

  describe('getResolvedHistory', () => {
    it('should track resolved conflicts', async () => {
      resolver.detectConflict('a.tsx', 'local', 'remote');
      await resolver.resolveConflict('a.tsx', 'keep-local');

      const history = resolver.getResolvedHistory();

      expect(history).toHaveLength(1);
      expect(history[0].resolution).toBe('keep-local');
      expect(history[0].resolvedContent).toBe('local');
    });
  });
});
