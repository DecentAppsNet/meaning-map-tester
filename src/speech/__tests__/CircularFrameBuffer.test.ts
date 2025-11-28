import { describe, it, expect } from 'vitest';

import CircularFrameBuffer from "../CircularFrameBuffer";

describe('CircularFrameBuffer', () => {
  describe('after construction', () => {
    it('has no frame available', () => {
      const cfb = new CircularFrameBuffer(10);
      expect(cfb.isFrameAvailable).toBeFalsy();
    });

    it('throws when calculating frame energy', () => {
      const cfb = new CircularFrameBuffer(10);
      expect(() => cfb.calcFrameEnergy()).toThrow();
    });

    it('throws when hopping', () => {
      const cfb = new CircularFrameBuffer(10);
      expect(() => cfb.hop()).toThrow();
    });

    it('throws when constructed with frame size < 2', () => {
      expect(() => new CircularFrameBuffer(1)).toThrow();
      expect(() => new CircularFrameBuffer(0)).toThrow();
      expect(() => new CircularFrameBuffer(-1)).toThrow();
    });

    it('throws when constructed with odd frame size', () => {
      expect(() => new CircularFrameBuffer(3)).toThrow();
    });

    it('returns hop sample count of half frame size', () => {
      const frameSize = 12;
      const cfb = new CircularFrameBuffer(frameSize);
      expect(cfb.hopSampleCount).toBe(6);
    });

    it('returns available sample count of zero', () => {
      const cfb = new CircularFrameBuffer(10);
      expect(cfb.availableSampleCount).toBe(0);
    });
  });

  describe('adding samples', () => {
    it('has frame available if added enough samples', () => {
      const cfb = new CircularFrameBuffer(4);
      cfb.addSamples(new Float32Array([0, 0, 0, 0]), 0, 4);
      expect(cfb.isFrameAvailable).toBeTruthy();
    });

    it('does not have frame available if added one less than needed samples', () => {
      const cfb = new CircularFrameBuffer(4);
      cfb.addSamples(new Float32Array([0, 0, 0]), 0, 3);
      expect(cfb.isFrameAvailable).toBeFalsy();
    });

    it('has frame available after adding samples in two chunks', () => {
      const cfb = new CircularFrameBuffer(4);
      cfb.addSamples(new Float32Array([0, 0]), 0, 2);
      cfb.addSamples(new Float32Array([0, 0]), 0, 2);
      expect(cfb.isFrameAvailable).toBeTruthy();
    });

    it('adds maximum number of samples that space allows', () => {
      const cfb = new CircularFrameBuffer(4);
      const addCount = cfb.availableSpaceCount;
      expect(addCount).toEqual(8);
      cfb.addSamples(new Float32Array([0, 0, 0, 0, 0, 0, 0, 0]), 0, 8);
      expect(cfb.availableSpaceCount).toEqual(0);
    });

    it('throws when adding more samples than buffer can hold', () => {
      const cfb = new CircularFrameBuffer(4);
      expect(() => cfb.addSamples(new Float32Array(9), 0, 9)).toThrow();
    });

    it('throws when adding samples past start of next frame', () => {
      const cfb = new CircularFrameBuffer(4);
      cfb.addSamples(new Float32Array([0, 0, 0, 0]), 0, 4);
      cfb.addSamples(new Float32Array([0, 0, 0, 0]), 0, 4);
      expect(cfb.availableSampleCount).toBe(8);
      expect(() => cfb.addSamples(new Float32Array(1), 0, 1)).toThrow();
    });

    it('hopping reduces available sample count', () => {
      const cfb = new CircularFrameBuffer(4);
      cfb.addSamples(new Float32Array([0, 0, 0, 0, 0, 0]), 0, 6);
      expect(cfb.availableSampleCount).toBe(6);
      cfb.hop();
      expect(cfb.availableSampleCount).toBe(6 - cfb.hopSampleCount);
    });
  });

  describe('calculating frame energy', () => {
    it('calculates energy of a frame added in one chunk', () => {
      const cfb = new CircularFrameBuffer(4);
      cfb.addSamples(new Float32Array([1, 2, 3, 4]), 0, 4);
      const energy = cfb.calcFrameEnergy();
      expect(energy).toBe(1*1 + 2*2 + 3*3 + 4*4);
    });

    it('calculates energy of first frame-sized chunk when two added', () => {
      const cfb = new CircularFrameBuffer(4);
      cfb.addSamples(new Float32Array([1, 1, 1, 1]), 0, 4);
      cfb.addSamples(new Float32Array([2, 2, 2, 2]), 0, 4);
      const energy = cfb.calcFrameEnergy();
      expect(energy).toBe(1 + 1 + 1 + 1);
    });

    it('calculates energy of frame between two frame-sized chunks', () => {
      const cfb = new CircularFrameBuffer(4);
      cfb.addSamples(new Float32Array([1, 1, 1, 1]), 0, 4);
      cfb.addSamples(new Float32Array([2, 2, 2, 2]), 0, 4);
      cfb.hop();
      const energy = cfb.calcFrameEnergy();
      expect(energy).toBe(1 + 1 + 2*2 + 2*2);
    });

    it('calculates energy of second of two frame-sized chunks after two hops', () => {
      const cfb = new CircularFrameBuffer(4);
      cfb.addSamples(new Float32Array([1, 1, 1, 1]), 0, 4);
      cfb.addSamples(new Float32Array([2, 2, 2, 2]), 0, 4);
      cfb.hop();
      cfb.hop();
      const energy = cfb.calcFrameEnergy();
      expect(energy).toBe(2*2 + 2*2 + 2*2 + 2*2);
    });

    it('calculates energy of frame that wraps around buffer end', () => {
      const cfb = new CircularFrameBuffer(4);
      cfb.addSamples(new Float32Array([1, 1, 1, 1]), 0, 4);
      cfb.addSamples(new Float32Array([2, 2, 2, 2]), 0, 4);
      cfb.hop();
      cfb.hop();
      cfb.addSamples(new Float32Array([3, 3]), 0, 2);
      cfb.hop();
      const energy = cfb.calcFrameEnergy();
      expect(energy).toBe(2*2 + 2*2 + 3*3 + 3*3);
    });

    it('hops around buffer end', () => {
      const cfb = new CircularFrameBuffer(4);
      cfb.addSamples(new Float32Array([1, 1, 1, 1]), 0, 4);
      cfb.addSamples(new Float32Array([2, 2, 2, 2]), 0, 4);
      cfb.hop();
      cfb.hop();
      cfb.addSamples(new Float32Array([3, 3, 3, 3]), 0, 4);
      cfb.hop();
      cfb.hop();
      const energy = cfb.calcFrameEnergy();
      expect(energy).toBe(3*3 + 3*3 + 3*3 + 3*3);
    });
  });
});