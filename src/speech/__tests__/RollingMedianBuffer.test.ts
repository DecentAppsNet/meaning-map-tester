import { describe, it, expect } from 'vitest';
import RollingMedianBuffer from '../RollingMedianBuffer';

describe('RollingMediaBuffer', () => {
  describe('constructor', () => {
    it('creates an instance', () => {
      const buffer = new RollingMedianBuffer<number>(5, (a, b) => a - b);
      expect(buffer).toBeInstanceOf(RollingMedianBuffer);
    });

    it('creates an instance with different payload type', () => {
      const buffer = new RollingMedianBuffer<{ value: number }>(5, (a, b) => a.value - b.value);
      expect(buffer).toBeInstanceOf(RollingMedianBuffer);
    });

    it('toArray() returns empty array when no nodes added', () => {
      const buffer = new RollingMedianBuffer<number>(5, (a, b) => a - b);
      const values:number[] = buffer.toArray(); // Type compilation test.
      expect(values).toEqual([]);
    });

    it('size is 0 when no nodes added', () => {
      const buffer = new RollingMedianBuffer<number>(5, (a, b) => a - b);
      expect(buffer.size).toBe(0);
    });

    it('median is null when no nodes added', () => {
      const buffer = new RollingMedianBuffer<number>(5, (a, b) => a - b);
      expect(buffer.median).toBeNull();
    });

    it('throws if maxNodeCount < 3', () => {
      expect(() => new RollingMedianBuffer<number>(2, (a, b) => a - b)).toThrow();
    });
  });

  describe('adding nodes with sorting', () => {
    it('adds a single node', () => {
      const buffer = new RollingMedianBuffer<number>(5, (a, b) => a - b);
      const median = buffer.addNode(10);
      expect(median).toBe(10);
      expect(buffer.size).toBe(1);
      expect(buffer.toArray()).toEqual([10]);
    });

    it('adds one node and then a second with a smaller value', () => {
      const buffer = new RollingMedianBuffer<number>(5, (a, b) => a - b);
      buffer.addNode(10);
      const median = buffer.addNode(5);
      expect(median).toBe(10);
      expect(buffer.size).toBe(2);
      expect(buffer.toArray()).toEqual([5, 10]);
    });

    it('adds one node and then a second with a larger value', () => {
      const buffer = new RollingMedianBuffer<number>(5, (a, b) => a - b);
      buffer.addNode(5);
      buffer.addNode(10);
      expect(buffer.size).toBe(2);
      expect(buffer.toArray()).toEqual([5, 10]);
    });

    it('adds one node and then a second with same value', () => {
      const buffer = new RollingMedianBuffer<{value:number, index:number}>(5, (a, b) => a.value - b.value);
      buffer.addNode({value:5, index:1});
      buffer.addNode({value:5, index:2});
      expect(buffer.size).toBe(2);
      expect(buffer.toArray()).toEqual([{value:5, index:1}, {value:5, index:2}]);
    });

    it('adds multiple nodes', () => {
      const buffer = new RollingMedianBuffer<number>(5, (a, b) => a - b);
      buffer.addNode(3);
      buffer.addNode(2);
      buffer.addNode(5);
      buffer.addNode(4);
      buffer.addNode(1);
      expect(buffer.size).toBe(5);
      expect(buffer.toArray()).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('adding nodes with removal', () => {
    it('removes oldest node when max size reached', () => {
      const buffer = new RollingMedianBuffer<number>(3, (a, b) => a - b);
      buffer.addNode(3); // Oldest
      buffer.addNode(1);
      buffer.addNode(2);
      expect(buffer.size).toBe(3);
      expect(buffer.toArray()).toEqual([1, 2, 3]);
      buffer.addNode(4); // Removes 3
      expect(buffer.size).toBe(3);
      expect(buffer.toArray()).toEqual([1, 2, 4]);
    });

    it('removes multiple oldest nodes when max size reached', () => {
      const buffer = new RollingMedianBuffer<number>(3, (a, b) => a - b);
      buffer.addNode(5);
      buffer.addNode(3);
      buffer.addNode(4);
      expect(buffer.size).toBe(3);
      expect(buffer.toArray()).toEqual([3, 4, 5]);
      buffer.addNode(2); // Removes 5
      buffer.addNode(6); // Removes 3
      expect(buffer.size).toBe(3);
      expect(buffer.toArray()).toEqual([2, 4, 6]);
    });

    it('removes oldest node from left of median', () => {
      const buffer = new RollingMedianBuffer<number>(3, (a, b) => a - b);
      buffer.addNode(1); // Oldest
      buffer.addNode(2);
      buffer.addNode(3);
      buffer.addNode(4); // Removes 1
      expect(buffer.size).toBe(3);
      expect(buffer.toArray()).toEqual([2, 3, 4]);
    });

    it('removes oldest node from right of median', () => {
      const buffer = new RollingMedianBuffer<number>(3, (a, b) => a - b);
      buffer.addNode(4); // Oldest
      buffer.addNode(3);
      buffer.addNode(2);
      buffer.addNode(1); // Removes 4
      expect(buffer.size).toBe(3);
      expect(buffer.toArray()).toEqual([1, 2, 3]);
    });

    it('removes oldest node that is median', () => {
      const buffer = new RollingMedianBuffer<number>(3, (a, b) => a - b);
      buffer.addNode(2); // Oldest
      buffer.addNode(1);
      buffer.addNode(3);
      buffer.addNode(4); // Removes 2
      expect(buffer.size).toBe(3);
      expect(buffer.toArray()).toEqual([1, 3, 4]);
    });
  });

  describe('medians', () => {
    it('correct median with odd number of nodes', () => {
      const buffer = new RollingMedianBuffer<number>(5, (a, b) => a - b);
      expect(buffer.addNode(3)).toBe(3); // !3
      expect(buffer.addNode(2)).toBe(3); // 2 !3
      expect(buffer.addNode(1)).toBe(2); // 1 !2 3
      expect(buffer.addNode(5)).toBe(3); // 1 2 !3 5
      expect(buffer.addNode(4)).toBe(3); // 1 2 !3 4 5
    });

    it('correct median with even number of nodes', () => {
      const buffer = new RollingMedianBuffer<number>(4, (a, b) => a - b);
      expect(buffer.addNode(4)).toBe(4); // !4
      expect(buffer.addNode(2)).toBe(4); // 2 !4
      expect(buffer.addNode(3)).toBe(3); // 2 !3 4
      expect(buffer.addNode(1)).toBe(3); // 1 2 !3 4
    });

    it('correct median when median node is removed', () => {
      const buffer = new RollingMedianBuffer<number>(3, (a, b) => a - b);
      expect(buffer.addNode(2)).toBe(2); // !2
      expect(buffer.addNode(1)).toBe(2); // 1 !2
      expect(buffer.addNode(3)).toBe(2); // 1 !2 3
      expect(buffer.addNode(4)).toBe(3); // 1 !3 4 (median 2 removed)
    });

    it('correct median when median node is removed and new node replaces it', () => {
      const buffer = new RollingMedianBuffer<number>(3, (a, b) => a - b);
      expect(buffer.addNode(3)).toBe(3); // !3
      expect(buffer.addNode(1)).toBe(3); // 1 !3
      expect(buffer.addNode(5)).toBe(3); // 1 !3 5
      expect(buffer.addNode(4)).toBe(4); // 1 !4 5 (median 3 removed, replaced with 4)
    });

    it('correct median when node preceding the median node with same compare value is removed', () => {
      const buffer = new RollingMedianBuffer<string>(3, (a, b) => a.charCodeAt(0) - b.charCodeAt(0));
      expect(buffer.addNode('2a')).toEqual('2a'); // !2a
      expect(buffer.addNode('2b')).toEqual('2b'); // 2a !2b
      expect(buffer.addNode('3')).toEqual('2b'); // 2a !2b 3
      expect(buffer.addNode('1')).toEqual('2b'); // 1 !2b 3
    });

    it('correct median when node following the median node with same compare value is removed', () => {
      const buffer = new RollingMedianBuffer<string>(4, (a, b) => a.charCodeAt(0) - b.charCodeAt(0));
      expect(buffer.addNode('3a')).toEqual('3a'); // !3a
      expect(buffer.addNode('1')).toEqual('3a'); // 1 !3a
      expect(buffer.addNode('2')).toEqual('2'); // 1 !2 3a
      expect(buffer.addNode('3b')).toEqual('3b'); // 1 2 !3b 3a
      expect(buffer.addNode('4')).toEqual('3b'); // 1 2 !3b 4
    });

    it('correct median when multiple nodes with same compare value precede the median node when oldest is removed', () => {
      const buffer = new RollingMedianBuffer<string>(4, (a, b) => a.charCodeAt(0) - b.charCodeAt(0));
      expect(buffer.addNode('3a')).toEqual('3a'); // !3a
      expect(buffer.addNode('3b')).toEqual('3b'); // 3a !3b
      expect(buffer.addNode('3c')).toEqual('3b'); // 3a !3b 3c
      expect(buffer.addNode('3d')).toEqual('3d'); // 3a 3b !3d 3c
      expect(buffer.addNode('4')).toEqual('3c'); // 3b 3d !3c 4
    });

    it('correct median when multiple nodes with same compare value follow the median node when oldest is removed', () => {
      const buffer = new RollingMedianBuffer<string>(6, (a, b) => a.charCodeAt(0) - b.charCodeAt(0));
      expect(buffer.addNode('3a')).toEqual('3a'); // !3a
      expect(buffer.addNode('1')).toEqual('3a'); // 1 !3a
      expect(buffer.addNode('2a')).toEqual('2a'); // 1 !2a 3a
      expect(buffer.addNode('3b')).toEqual('3b'); // 1 2a !3b 3a
      expect(buffer.addNode('2b')).toEqual('2b'); // 1 2a !2b 3b 3a
      expect(buffer.addNode('3c')).toEqual('3c'); // 1 2a 2b !3c 3b 3a
      expect(buffer.addNode('4')).toEqual('3c'); // 1 2a 2b !3c 3b 4
    });

    it('median property returns correct median', () => {
      const buffer = new RollingMedianBuffer<number>(5, (a, b) => a - b);
      buffer.addNode(3);
      expect(buffer.median).toBe(3);
      buffer.addNode(1);
      expect(buffer.median).toBe(3);
      buffer.addNode(2);
      expect(buffer.median).toBe(2);
    });
  });

  describe('toString()', () => {
    it('represents empty buffer', () => {
      const buffer = new RollingMedianBuffer<number>(5, (a, b) => a - b);
      expect(buffer.toString()).toBe('');
    });

    it('represents buffer with nodes', () => {
      const buffer = new RollingMedianBuffer<number>(5, (a, b) => a - b);
      buffer.addNode(3);
      buffer.addNode(1);
      buffer.addNode(2);
      expect(buffer.toString()).toBe('1 !2 3');
    });
  });

  describe('changing median percent', () => {
    it('creates buffer with different median percent', () => {
      const buffer = new RollingMedianBuffer<number>(5, (a, b) => a - b, 0.25);
      buffer.addNode(4);
      buffer.addNode(2);
      buffer.addNode(3);
      expect(buffer.median).toBe(2); // !2 3 4
      buffer.addNode(1);
      expect(buffer.median).toBe(2); // 1 !2 3 4
      buffer.addNode(5);
      expect(buffer.median).toBe(2); // 1 !2 3 4 5
    });

    it('0% median always returns smallest value', () => {
      const buffer = new RollingMedianBuffer<number>(5, (a, b) => a - b, 0);
      buffer.addNode(3);
      expect(buffer.median).toBe(3);
      buffer.addNode(1);
      expect(buffer.median).toBe(1);
      buffer.addNode(2);
      expect(buffer.median).toBe(1);
      buffer.addNode(4);
      expect(buffer.median).toBe(1);
    });

    it('100% median always returns largest value', () => {
      const buffer = new RollingMedianBuffer<number>(5, (a, b) => a - b, 1);
      buffer.addNode(3);
      expect(buffer.median).toBe(3);
      buffer.addNode(1);
      expect(buffer.median).toBe(3);
      buffer.addNode(2);
      expect(buffer.median).toBe(3);
      buffer.addNode(4);
      expect(buffer.median).toBe(4);
    });

    it('changing median percent rebalances median correctly', () => {
      const buffer = new RollingMedianBuffer<number>(5, (a, b) => a - b);
      buffer.addNode(3);
      buffer.addNode(1);
      buffer.addNode(2);
      expect(buffer.median).toBe(2); // 1 !2 3
      buffer.setMedianPercent(0.25);
      expect(buffer.median).toBe(1); // !1 2 3
      buffer.setMedianPercent(0.75);
      expect(buffer.median).toBe(3); // 1 2 !3
    });

    it('out of range median percent values are clamped', () => {
      const buffer = new RollingMedianBuffer<number>(5, (a, b) => a - b);
      buffer.addNode(3);
      buffer.addNode(1);
      buffer.addNode(2);
      expect(buffer.median).toBe(2); // 1 !2 3
      buffer.setMedianPercent(-0.5);
      expect(buffer.median).toBe(1); // !1 2 3
      buffer.setMedianPercent(1.5);
      expect(buffer.median).toBe(3); // 1 2 !3
    });
  });
});