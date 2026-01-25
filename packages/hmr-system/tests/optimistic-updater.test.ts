/**
 * OptimisticUpdater 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OptimisticUpdater } from '../src/client/optimistic-updater';

describe('OptimisticUpdater', () => {
  let updater: OptimisticUpdater;

  beforeEach(() => {
    updater = new OptimisticUpdater({
      maxPendingUpdates: 10,
      confirmTimeout: 100,
      cleanupInterval: 1000,
    });
  });

  afterEach(() => {
    updater.destroy();
  });

  describe('applyUpdate', () => {
    it('should create pending update', () => {
      const updateId = updater.applyUpdate('jsx-1', 'text', 'new text');

      expect(updateId).toBeDefined();
      expect(updater.getPendingCount()).toBe(1);

      const update = updater.getPendingUpdate(updateId);
      expect(update).toBeDefined();
      expect(update?.jsxId).toBe('jsx-1');
      expect(update?.type).toBe('text');
      expect(update?.newValue).toBe('new text');
      expect(update?.status).toBe('pending');
    });

    it('should limit pending updates', () => {
      const smallUpdater = new OptimisticUpdater({ maxPendingUpdates: 2 });

      smallUpdater.applyUpdate('jsx-1', 'text', 'a');
      smallUpdater.applyUpdate('jsx-2', 'text', 'b');
      smallUpdater.applyUpdate('jsx-3', 'text', 'c');

      // Should have rolled back the oldest
      expect(smallUpdater.getPendingCount()).toBe(2);

      smallUpdater.destroy();
    });
  });

  describe('applyBatchUpdate', () => {
    it('should apply multiple updates', () => {
      const ids = updater.applyBatchUpdate([
        { jsxId: 'jsx-1', type: 'text', newValue: 'a' },
        { jsxId: 'jsx-2', type: 'className', newValue: 'class-a' },
      ]);

      expect(ids).toHaveLength(2);
      expect(updater.getPendingCount()).toBe(2);
    });
  });

  describe('confirmUpdate', () => {
    it('should confirm pending update', () => {
      const updateId = updater.applyUpdate('jsx-1', 'text', 'new');

      updater.confirmUpdate(updateId);

      expect(updater.getPendingCount()).toBe(0);
    });

    it('should do nothing for non-existent update', () => {
      expect(() => updater.confirmUpdate('non-existent')).not.toThrow();
    });
  });

  describe('confirmBatchUpdate', () => {
    it('should confirm multiple updates', () => {
      const id1 = updater.applyUpdate('jsx-1', 'text', 'a');
      const id2 = updater.applyUpdate('jsx-2', 'text', 'b');

      updater.confirmBatchUpdate([id1, id2]);

      expect(updater.getPendingCount()).toBe(0);
    });
  });

  describe('rollbackUpdate', () => {
    it('should rollback pending update', () => {
      const updateId = updater.applyUpdate('jsx-1', 'text', 'new');

      updater.rollbackUpdate(updateId);

      expect(updater.getPendingCount()).toBe(0);
    });
  });

  describe('rollbackAll', () => {
    it('should rollback all pending updates', () => {
      updater.applyUpdate('jsx-1', 'text', 'a');
      updater.applyUpdate('jsx-2', 'text', 'b');

      updater.rollbackAll();

      expect(updater.getPendingCount()).toBe(0);
    });
  });

  describe('timeout behavior', () => {
    it('should auto-rollback after timeout', async () => {
      const updateId = updater.applyUpdate('jsx-1', 'text', 'new');

      expect(updater.getPendingCount()).toBe(1);

      // 等待超时
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(updater.getPendingCount()).toBe(0);
    });

    it('should not rollback if confirmed before timeout', async () => {
      const events: string[] = [];
      updater.on('update-confirmed', () => events.push('confirmed'));
      updater.on('update-rolled-back', () => events.push('rolled-back'));

      const updateId = updater.applyUpdate('jsx-1', 'text', 'new');

      // 快速确认
      updater.confirmUpdate(updateId);

      // 等待超时时间过去
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(events).toContain('confirmed');
      expect(events).not.toContain('rolled-back');
    });
  });

  describe('getAllPendingUpdates', () => {
    it('should return all pending updates', () => {
      updater.applyUpdate('jsx-1', 'text', 'a');
      updater.applyUpdate('jsx-2', 'text', 'b');

      const pending = updater.getAllPendingUpdates();

      expect(pending).toHaveLength(2);
    });
  });

  describe('hasPendingUpdates', () => {
    it('should return true when updates pending', () => {
      expect(updater.hasPendingUpdates()).toBe(false);

      updater.applyUpdate('jsx-1', 'text', 'a');

      expect(updater.hasPendingUpdates()).toBe(true);
    });
  });

  describe('getPendingUpdatesForElement', () => {
    it('should return updates for specific element', () => {
      updater.applyUpdate('jsx-1', 'text', 'a');
      updater.applyUpdate('jsx-1', 'className', 'b');
      updater.applyUpdate('jsx-2', 'text', 'c');

      const jsx1Updates = updater.getPendingUpdatesForElement('jsx-1');

      expect(jsx1Updates).toHaveLength(2);
    });
  });

  describe('events', () => {
    it('should emit update-applied event', () => {
      const handler = vi.fn();
      updater.on('update-applied', handler);

      updater.applyUpdate('jsx-1', 'text', 'new');

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should emit update-confirmed event', () => {
      const handler = vi.fn();
      updater.on('update-confirmed', handler);

      const id = updater.applyUpdate('jsx-1', 'text', 'new');
      updater.confirmUpdate(id);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should emit update-rolled-back event', () => {
      const handler = vi.fn();
      updater.on('update-rolled-back', handler);

      const id = updater.applyUpdate('jsx-1', 'text', 'new');
      updater.rollbackUpdate(id);

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
