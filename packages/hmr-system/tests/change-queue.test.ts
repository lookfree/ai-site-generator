/**
 * ChangeQueue 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChangeQueue } from '../src/sync/change-queue';

describe('ChangeQueue', () => {
  let queue: ChangeQueue;

  beforeEach(() => {
    queue = new ChangeQueue({
      maxLength: 100,
      processInterval: 10,
      maxRetries: 2,
      retryDelay: 50,
    });
  });

  afterEach(() => {
    queue.stop();
  });

  describe('enqueue', () => {
    it('should add change to queue', () => {
      const id = queue.enqueue('project1', 'src/App.tsx', 'update', 'content');

      expect(id).toBeDefined();
      expect(queue.getStats().length).toBe(1);
    });

    it('should merge changes for same file', () => {
      queue.enqueue('project1', 'src/App.tsx', 'update', 'content1');
      queue.enqueue('project1', 'src/App.tsx', 'update', 'content2');

      expect(queue.getStats().length).toBe(1);

      const queued = queue.getQueued();
      expect(queued[0].content).toBe('content2');
    });

    it('should respect priority', () => {
      queue.enqueue('project1', 'low.tsx', 'update', 'low', 0);
      queue.enqueue('project1', 'high.tsx', 'update', 'high', 10);
      queue.enqueue('project1', 'medium.tsx', 'update', 'medium', 5);

      const queued = queue.getQueued();
      expect(queued[0].filePath).toBe('high.tsx');
      expect(queued[1].filePath).toBe('medium.tsx');
      expect(queued[2].filePath).toBe('low.tsx');
    });

    it('should drop lowest priority when queue is full', () => {
      const smallQueue = new ChangeQueue({ maxLength: 2 });

      smallQueue.enqueue('p1', 'a.tsx', 'update', 'a', 1);
      smallQueue.enqueue('p1', 'b.tsx', 'update', 'b', 2);
      smallQueue.enqueue('p1', 'c.tsx', 'update', 'c', 3);

      const queued = smallQueue.getQueued();
      expect(queued.length).toBe(2);
      expect(queued.map(q => q.filePath)).not.toContain('a.tsx');
    });
  });

  describe('enqueueBatch', () => {
    it('should add multiple changes', () => {
      const ids = queue.enqueueBatch([
        { projectId: 'p1', filePath: 'a.tsx', changeType: 'update', content: 'a' },
        { projectId: 'p1', filePath: 'b.tsx', changeType: 'update', content: 'b' },
        { projectId: 'p1', filePath: 'c.tsx', changeType: 'create', content: 'c' },
      ]);

      expect(ids).toHaveLength(3);
      expect(queue.getStats().length).toBe(3);
    });
  });

  describe('processing', () => {
    it('should process changes with processor', async () => {
      const processed: string[] = [];

      queue.setProcessor(async (change) => {
        processed.push(change.filePath);
        return true;
      });

      queue.enqueue('p1', 'a.tsx', 'update', 'a');
      queue.enqueue('p1', 'b.tsx', 'update', 'b');

      queue.start();

      // 等待处理
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(processed).toContain('a.tsx');
      expect(processed).toContain('b.tsx');
      expect(queue.getStats().length).toBe(0);
    });

    it('should retry on failure', async () => {
      let attempts = 0;

      queue.setProcessor(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Simulated failure');
        }
        return true;
      });

      queue.enqueue('p1', 'a.tsx', 'update', 'a');
      queue.start();

      // 等待重试
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(attempts).toBeGreaterThanOrEqual(2);
    });

    it('should mark as failed after max retries', async () => {
      queue.setProcessor(async () => {
        throw new Error('Always fails');
      });

      const id = queue.enqueue('p1', 'a.tsx', 'update', 'a');
      queue.start();

      // 等待重试耗尽
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(queue.getStatus(id)).toBe('failed');
      expect(queue.getFailureReason(id)).toBe('Always fails');
    });
  });

  describe('getStatus', () => {
    it('should return correct status', () => {
      const id = queue.enqueue('p1', 'a.tsx', 'update', 'a');

      expect(queue.getStatus(id)).toBe('queued');
      expect(queue.getStatus('unknown')).toBe('unknown');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      queue.enqueue('p1', 'a.tsx', 'update', 'a');
      queue.enqueue('p1', 'b.tsx', 'update', 'b');

      const stats = queue.getStats();
      expect(stats.length).toBe(2);
      expect(stats.pending).toBe(2);
      expect(stats.processing).toBe(0);
    });
  });

  describe('remove', () => {
    it('should remove change from queue', () => {
      const id = queue.enqueue('p1', 'a.tsx', 'update', 'a');

      expect(queue.remove(id)).toBe(true);
      expect(queue.getStats().length).toBe(0);
    });

    it('should return false for non-existent id', () => {
      expect(queue.remove('non-existent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all queued changes', () => {
      queue.enqueue('p1', 'a.tsx', 'update', 'a');
      queue.enqueue('p1', 'b.tsx', 'update', 'b');

      queue.clear();

      expect(queue.getStats().length).toBe(0);
    });
  });
});
