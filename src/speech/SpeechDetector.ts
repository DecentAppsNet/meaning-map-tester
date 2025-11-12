import { calcRmsForSamples, sampleCountToTime } from 'sl-web-audio';

import RollingMedianBuffer, { MIN_MEDIAN_BUFFER_NODE_COUNT } from './RollingMedianBuffer';
import AudioChunk from './types/AudioChunk';

export type SpeechCallback = () => void;
export type SilenceCallback = (precedingSpeechSamples:Float32Array) => void;

export type SpeechDetectorOptions = {
  bufferSecs:number,
  detectSpeechDelayMSecs:number,
  detectSilenceDelayMSecs:number,
  onSpeech:SpeechCallback|null,
  onSilence:SilenceCallback|null
};

const DEFAULT_OPTIONS:SpeechDetectorOptions = {
  bufferSecs: 3,
  detectSpeechDelayMSecs: 400,
  detectSilenceDelayMSecs: 1000,
  onSpeech:null,
  onSilence:null
};

function _calcMedianBufferMaxNodeCount(chunkSampleCount:number, sampleRate:number, bufferSecs:number):number {
  const chunkTime = sampleCountToTime(sampleRate, chunkSampleCount);
  const nodeCount = Math.ceil(bufferSecs / chunkTime);
  return nodeCount >= MIN_MEDIAN_BUFFER_NODE_COUNT ? nodeCount : MIN_MEDIAN_BUFFER_NODE_COUNT;
}

class SpeechDetector {
  _medianBuffer:RollingMedianBuffer<AudioChunk>;
  _sampleRate:number;
  _chunkSampleCount:number;
  _speechThresholdRms:number;
  _onSpeech:SpeechCallback|null;
  _onSilence:SilenceCallback|null;
  _detectSpeechDelayMSecs:number;
  _detectSilenceDelayMSecs:number;
  _isInSpeech:boolean;
  _startSilenceTime:number;
  _startSpeechTime:number;

  constructor(sampleRate:number, chunkSampleCount:number, options:Partial<SpeechDetectorOptions> = {}) {
    this._sampleRate = sampleRate;
    this._chunkSampleCount = chunkSampleCount;
    const maxNodeCount = _calcMedianBufferMaxNodeCount(chunkSampleCount, sampleRate, options.bufferSecs ?? DEFAULT_OPTIONS.bufferSecs);
    this._medianBuffer = new RollingMedianBuffer<AudioChunk>(maxNodeCount, (a, b) => a.rms - b.rms, .5);
    this._speechThresholdRms = 1;
    this._onSpeech = options.onSpeech ?? DEFAULT_OPTIONS.onSpeech;
    this._onSilence = options.onSilence ?? DEFAULT_OPTIONS.onSilence;
    this._detectSpeechDelayMSecs = options.detectSpeechDelayMSecs ?? DEFAULT_OPTIONS.detectSpeechDelayMSecs;
    this._detectSilenceDelayMSecs = options.detectSilenceDelayMSecs ?? DEFAULT_OPTIONS.detectSilenceDelayMSecs;
    this._isInSpeech = false;
    this._startSilenceTime = -1;
    this._startSpeechTime = -1;
  }

  addAudioChunkToBuffer(samples:Float32Array):void {
    if (samples.length !== this._chunkSampleCount) throw Error(`Expected chunk of ${this._chunkSampleCount} samples, got ${samples.length}`);
    const rms = calcRmsForSamples(samples);
    const chunk = { samples, rms };
    const medianChunk = this._medianBuffer.addNode(chunk);
    this._speechThresholdRms = medianChunk.rms * 4;
    if (this._isInSpeech) {
      if (rms < this._speechThresholdRms) {
        if (this._startSilenceTime === -1) { this._startSilenceTime = performance.now(); return; }
        const elapsedSilenceTime = performance.now() - this._startSilenceTime;
        if (elapsedSilenceTime < this._detectSilenceDelayMSecs) return;
        this._startSilenceTime = -1;
        this._isInSpeech = false;
        if (this._onSilence) this._onSilence(samples); // TODO get the right samples, combine, etc.
      }
    } else {
      if (rms >= this._speechThresholdRms) {
        if (this._startSpeechTime === -1) { this._startSpeechTime = performance.now(); return; }
        const elapsedSpeechTime = performance.now() - this._startSpeechTime;
        if (elapsedSpeechTime < this._detectSpeechDelayMSecs) return;
        this._startSpeechTime = -1;
        this._isInSpeech = true;
        if (this._onSpeech) this._onSpeech();
      }
    }
  }
}

export default SpeechDetector;