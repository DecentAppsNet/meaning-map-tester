import CircularFrameBuffer from './CircularFrameBuffer';

/* It would be nice to import this from sl-web-audio, but...
  When you import mSecsToSampleCount() from sl-web-audio, it loads sl-web-ogg. This is fine for web build, but for the test runner,
  it will complain that the WASM in sl-web-ogg wasn't built for web. I wasted some hours trying different mocking/alias options to 
  get around it. In the end, just in-lining this needed function makes test run again.

  If you run into this problem again, the cleanest solution is making the WASM file interoperable with Node. Alternatively, 
  you could just remove sl-web-ogg from sl-web-audio. Nothing important is depending on it. Also, maybe you just refactor all the speech detection
  stuff into sl-web-audio - the same problem is not there because no import from lib entrypoint of index.ts.
*/
const mSecsToSampleCount = (mSecs:number, sampleRate:number) => Math.round((mSecs / 1000) * sampleRate);
const sampleCountToMSecs = (sampleCount:number, sampleRate:number) => Math.round((sampleCount / sampleRate) * 1000);

export type SpeechCallback = () => void;
export type SilenceCallback = (precedingSpeechSamples:Float32Array) => void;

export type SpeechDetectorOptions = {
  detectSilenceDelayMSecs:number,
  detectSpeechDelayMSecs:number,
  frameDurationMSecs:number,
  speechThresholdMultiplier:number,
  maximumSpeechDurationMSecs:number,
  onSpeech:SpeechCallback|null,
  onSilence:SilenceCallback|null
};

const DEFAULT_OPTIONS:SpeechDetectorOptions = {
  detectSilenceDelayMSecs: 1000,
  detectSpeechDelayMSecs: 40,
  frameDurationMSecs: 20,
  speechThresholdMultiplier: 20,
  maximumSpeechDurationMSecs: 10 * 1000,
  onSpeech: null,
  onSilence: null
};

function _moveNoiseFloor(frameEnergy:number, currentNoiseFloor:number, minNoiseFloor:number):number {
  if (currentNoiseFloor === UNSPECIFIED_NOISE_FLOOR) return Math.max(frameEnergy, minNoiseFloor); // No need for smoothing if it hasn't been set before.
  const changeWeight = (frameEnergy > currentNoiseFloor) ? .01 : .1; // Raise noise floor slowly, but drop it fast.
  return Math.max(currentNoiseFloor * (1-changeWeight) + frameEnergy * changeWeight, minNoiseFloor);
}

const UNSPECIFIED_NOISE_FLOOR = 0;
const UNSPECIFIED_TIME = -1;

class SpeechDetector {
  _sampleRate:number;
  _noiseFloor:number;
  _onSpeech:SpeechCallback|null;
  _onSilence:SilenceCallback|null;
  _detectSpeechDelayMSecs:number;
  _detectSilenceDelayMSecs:number;
  _isInSpeech:boolean;
  _startSilenceTime:number;
  _startSpeechTime:number;
  _frameSampleCount:number;
  _speechThresholdMultiplier:number;
  _minNoiseFloor:number;
  _circularFrameBuffer:CircularFrameBuffer;
  _processedSampleCount:number;

  constructor(sampleRate:number, options:Partial<SpeechDetectorOptions> = {}) {
    options = {...DEFAULT_OPTIONS, ...options};
    this._onSpeech = options.onSpeech!;
    this._onSilence = options.onSilence!;
    this._detectSilenceDelayMSecs = options.detectSilenceDelayMSecs!;
    this._detectSpeechDelayMSecs = options.detectSpeechDelayMSecs!;
    const frameDurationMSecs = options.frameDurationMSecs!;
    this._speechThresholdMultiplier = options.speechThresholdMultiplier!;
    this._sampleRate = sampleRate;
    this._noiseFloor = UNSPECIFIED_NOISE_FLOOR;
    this._isInSpeech = false;
    this._startSilenceTime = this._startSpeechTime = UNSPECIFIED_TIME;
    this._frameSampleCount = mSecsToSampleCount(frameDurationMSecs, sampleRate);
    this._minNoiseFloor = 1 / sampleRate;
    if (this._frameSampleCount % 2 === 1) ++this._frameSampleCount; // Make it even so that frame hops can be half.
    const totalSampleCount = Math.max(mSecsToSampleCount(options.maximumSpeechDurationMSecs!, sampleRate), this._frameSampleCount * 2);
    this._circularFrameBuffer = new CircularFrameBuffer(this._frameSampleCount, totalSampleCount);
    this._processedSampleCount = 0;
  }

  processAudioSamples(samples:Float32Array):void {
    let sampleReadOffset = 0;
    while(true) {
      if (!this._circularFrameBuffer.isFrameAvailable) {
        const availableSampleCount = samples.length - sampleReadOffset;
        const addCount = Math.min(availableSampleCount, this._circularFrameBuffer.availableWriteSpace);
        if (addCount < 1) return;
        this._circularFrameBuffer.addSamples(samples, sampleReadOffset, addCount);
        sampleReadOffset += addCount;
        if (!this._circularFrameBuffer.isFrameAvailable) return; // Some samples are in buffer that can be used in next call.
      }
      const frameEnergy = this._circularFrameBuffer.calcFrameEnergy();
      this._processedSampleCount = this._processedSampleCount === 0 ? this._frameSampleCount : this._processedSampleCount + this._circularFrameBuffer.hopSampleCount;
      
      if (!this._isInSpeech) this._noiseFloor = _moveNoiseFloor(frameEnergy, this._noiseFloor, this._minNoiseFloor); // Doesn't make sense to update noise floor during speech -- too much variation.
      const speechThreshold = this._noiseFloor * this._speechThresholdMultiplier;
      
      if (frameEnergy > speechThreshold) {
        this._startSilenceTime = UNSPECIFIED_TIME;
        if (!this._isInSpeech) {
          const now = sampleCountToMSecs(this._processedSampleCount - this._frameSampleCount, this._sampleRate);
          if (this._startSpeechTime === UNSPECIFIED_TIME) this._startSpeechTime = now;
          const speechDurationMSecs = now - this._startSpeechTime;
          if (speechDurationMSecs >= this._detectSpeechDelayMSecs) {
            this._isInSpeech = true;
            if (this._onSpeech) this._onSpeech();
          }
        }
      } else {
        if (this._isInSpeech) {
          const now = sampleCountToMSecs(this._processedSampleCount - this._frameSampleCount, this._sampleRate);
          if (this._startSilenceTime === UNSPECIFIED_TIME) this._startSilenceTime = now;
          const silenceDurationMSecs = now - this._startSilenceTime;
          if (silenceDurationMSecs >= this._detectSilenceDelayMSecs) {
            this._isInSpeech = false;
            if (this._onSilence) {
              const startSpeechSampleNo = mSecsToSampleCount(this._startSpeechTime, this._sampleRate);
              const startSilenceSampleNo = mSecsToSampleCount(this._startSilenceTime + this._frameSampleCount, this._sampleRate); // The +frameSampleCount is to include the last frame that fell below threshold, but maybe still had the end of speech. Without it, ends of words are truncated.
              const precedingSpeechSamples = this._circularFrameBuffer.copySamples(startSpeechSampleNo, startSilenceSampleNo);
              this._onSilence(precedingSpeechSamples);
            }
            this._startSpeechTime = this._startSilenceTime = UNSPECIFIED_TIME;
          }
        }
      }

      this._circularFrameBuffer.hop();
    }
  }

  public get noiseFloor() { return this._noiseFloor; }
}

export default SpeechDetector;