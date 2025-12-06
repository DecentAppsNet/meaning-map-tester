import { describe, it, expect, vi } from 'vitest';

vi.mock('sl-web-ogg')

import SpeechDetector from '../SpeechDetector';

describe('SpeechDetector', () => {
  describe('after construction', () => {
    it('has noise floor of 0', () => {
      const sd = new SpeechDetector(100);
      expect(sd.noiseFloor).toEqual(0);
    });

    it('constructs okay with values that would create an odd frame size', () => {
      const sd = new SpeechDetector(501, {frameDurationMSecs: 1});
      expect(sd).toBeDefined();
    });
  });

  describe('processing samples affecting noise floor', () => {
    // Internal implementation coupling - chunk size is 2 samples when constructing with default options and 100 Hz sample rate.

    it('sets noise floor to above zero after processing one chunk of samples', () => {
      const sd = new SpeechDetector(100); 
      sd.processAudioSamples(new Float32Array([1,1])); 
      expect(sd.noiseFloor).toEqual(2);
    });

    it('sets noise floor to a smoothed between value after two chunks with different energy processed', () => {
      const sd = new SpeechDetector(100);
      sd.processAudioSamples(new Float32Array([1,1, 0,0]));
      expect(sd.noiseFloor).toBeGreaterThan(0);
      expect(sd.noiseFloor).toBeLessThan(2);
    });

    it('sets noise floor across two calls to processAudioSamples()', () => {
      const sd = new SpeechDetector(100);
      sd.processAudioSamples(new Float32Array([1,1]));
      expect(sd.noiseFloor).toEqual(2);
      sd.processAudioSamples(new Float32Array([0,0]));
      expect(sd.noiseFloor).toBeGreaterThan(0);
      expect(sd.noiseFloor).toBeLessThan(2);
    });

    it('uses leftover samples from first call to processAudioSamples() in second call', () => {
      const sd = new SpeechDetector(200, {maximumSpeechDurationMSecs:40}); // double sample rate to make hop size of 2 samples
      sd.processAudioSamples(new Float32Array([1,1,1,1, 0]));
      expect(sd.noiseFloor).toEqual(4);
      sd.processAudioSamples(new Float32Array([0]));
      expect(sd.noiseFloor).toBeGreaterThan(0);
      expect(sd.noiseFloor).toBeLessThan(4);
    });

    it('processes more samples than can fit in the buffer at one time', () => {
      const sd = new SpeechDetector(200, {maximumSpeechDurationMSecs:40}); // double sample rate to make hop size of 2 samples
      sd.processAudioSamples(new Float32Array([1,1,1,1, 1,1,1]));
      sd.processAudioSamples(new Float32Array([1, 0,0,0,0, 0,0,0,0, 0,0,0]));
      expect(sd.noiseFloor).toBeGreaterThan(0);
      expect(sd.noiseFloor).toBeLessThan(4);
    });

    it('is unaffected by passing empty sample array', () => {
      const sd = new SpeechDetector(100);
      expect(sd.noiseFloor).toEqual(0);
      sd.processAudioSamples(new Float32Array([]));
      expect(sd.noiseFloor).toEqual(0);
    });
  });

  describe('speech events', () => {
    it('detects speech after a period of flatness followed by a spike', () => {
      let speechFired = false;
      function onSpeech() { speechFired = true; }
      const sd = new SpeechDetector(100, {speechThresholdMultiplier: 2, detectSpeechDelayMSecs: 0, onSpeech});
      sd.processAudioSamples(new Float32Array([1,1,10,10]));
      expect(speechFired).toBeTruthy();
    });

    it('does not detect speech for a period of flatness', () => {
      let speechFired = false;
      function onSpeech() { speechFired = true; }
      const sd = new SpeechDetector(100, {speechThresholdMultiplier: 2, detectSpeechDelayMSecs: 0, onSpeech});
      sd.processAudioSamples(new Float32Array([1,1,1,1,1,1,1,1]));
      expect(speechFired).toBeFalsy();
    });

    it('slowly rising power in samples does not trigger speech event', () => {
      let speechFired = false;
      function onSpeech() { speechFired = true; }
      const sd = new SpeechDetector(100, {speechThresholdMultiplier: 2, detectSpeechDelayMSecs: 0, onSpeech});
      sd.processAudioSamples(new Float32Array([1, 1.1, 1.1, 1.1, 1.1, 1.2, 1.2, 1.2, 1.2, 1.3, 1.3, 1.3, 1.3, 1.4, 1.4, 1.4, 1.4, 1.5]));
      expect(speechFired).toBeFalsy();
    });

    it('quickly rising power in samples does trigger speech event', () => {
      let speechFired = false;
      function onSpeech() { speechFired = true; }
      const sd = new SpeechDetector(100, {speechThresholdMultiplier: 2, detectSpeechDelayMSecs: 0, onSpeech});
      sd.processAudioSamples(new Float32Array([1, 1, 1.5, 1.5]));
      expect(speechFired).toBeTruthy();
    });

    it('does not detect speech when power spike is above threshold but too short', () => {
      let speechFired = false;
      function onSpeech() { speechFired = true; }
      const sd = new SpeechDetector(100, {speechThresholdMultiplier: 2, detectSpeechDelayMSecs: 20, onSpeech});
      sd.processAudioSamples(new Float32Array([1,1,10,10]));
      expect(speechFired).toBeFalsy();
    });

    it('detects speech when power spike is above threshold over duration of speech delay', () => {
      let speechFired = false;
      function onSpeech() { speechFired = true; }
      const sd = new SpeechDetector(100, {speechThresholdMultiplier: 2, detectSpeechDelayMSecs: 20, onSpeech});
      sd.processAudioSamples(new Float32Array([1,1,10,10,10]));
      expect(speechFired).toBeTruthy();
    });
  });

  describe('silence events', () => {
    it('detects silence after speech', () => {
      let speechFireCount = 0, silenceFireCount = 0;
      function onSpeech() { speechFireCount++; }
      function onSilence() { silenceFireCount++; }
      const sd = new SpeechDetector(100, {speechThresholdMultiplier: 2, detectSilenceDelayMSecs: 20, detectSpeechDelayMSecs: 0, onSpeech, onSilence});
      sd.processAudioSamples(new Float32Array([1,1,10,10])); // initial silence followed by speech
      expect(silenceFireCount).toEqual(0);
      expect(speechFireCount).toEqual(1);
      sd.processAudioSamples(new Float32Array([1,1])); // silence starts
      expect(silenceFireCount).toEqual(0);
      expect(speechFireCount).toEqual(1);
      sd.processAudioSamples(new Float32Array([1,1])); // silence continues beyond 20ms delay.
      expect(silenceFireCount).toEqual(1);
      expect(speechFireCount).toEqual(1);
    });

    it('ignores a too-short silence period during speech', () => {
      let speechFireCount = 0, silenceFireCount = 0;
      function onSpeech() { speechFireCount++; }
      function onSilence() { silenceFireCount++; }
      const sd = new SpeechDetector(100, {speechThresholdMultiplier: 2, detectSilenceDelayMSecs: 20, detectSpeechDelayMSecs: 0, onSpeech, onSilence});
      sd.processAudioSamples(new Float32Array([1,1,10,10])); // initial silence followed by speech
      expect(silenceFireCount).toEqual(0);
      expect(speechFireCount).toEqual(1);
      sd.processAudioSamples(new Float32Array([1,1])); // silence starts
      expect(silenceFireCount).toEqual(0);
      expect(speechFireCount).toEqual(1);
      sd.processAudioSamples(new Float32Array([10,10])); // speech resumes before 20ms delay.
      expect(silenceFireCount).toEqual(0);
      expect(speechFireCount).toEqual(1);
    });

    it('ignoress a too-short speech period during silence', () => {
      let speechFireCount = 0, silenceFireCount = 0;
      function onSpeech() { speechFireCount++; }
      function onSilence() { silenceFireCount++; }
      const sd = new SpeechDetector(100, {speechThresholdMultiplier: 2, detectSilenceDelayMSecs: 0, detectSpeechDelayMSecs: 40, onSpeech, onSilence});
      sd.processAudioSamples(new Float32Array([1,1,10,10])); // initial silence followed by short blip of energy above speech threshold
      expect(silenceFireCount).toEqual(0);
      expect(speechFireCount).toEqual(0);
      sd.processAudioSamples(new Float32Array([1,1])); // silence continues
      expect(silenceFireCount).toEqual(0);
      expect(speechFireCount).toEqual(0);
    });

    it('provides preceding speech samples to onSilence callback', () => {
      let receivedSamples:Float32Array|null = null;
      function onSilence(samples:Float32Array) { receivedSamples = samples; }
      const sd = new SpeechDetector(100, {speechThresholdMultiplier: 2, detectSilenceDelayMSecs: 20, detectSpeechDelayMSecs: 0, onSilence});
      sd.processAudioSamples(new Float32Array([1,1,10,10])); // initial silence followed by speech
      sd.processAudioSamples(new Float32Array([1,1])); // silence starts
      sd.processAudioSamples(new Float32Array([1,1])); // silence continues beyond 20ms delay.
      expect(receivedSamples).not.toBeNull();
      expect(receivedSamples).toEqual(new Float32Array([1,10,10]));
    });

    it('processes silence without error when onSilence callback is null', () => {
      const sd = new SpeechDetector(100, {speechThresholdMultiplier: 2, detectSilenceDelayMSecs: 20, detectSpeechDelayMSecs: 0});
      sd.processAudioSamples(new Float32Array([1,1,10,10])); // initial silence followed by speech
      sd.processAudioSamples(new Float32Array([1,1])); // silence starts
      sd.processAudioSamples(new Float32Array([1,1])); // silence continues beyond 20ms delay.
      // Contrived to hit an execution path without onSilence defined. Not much to test here.
    });
  });
});