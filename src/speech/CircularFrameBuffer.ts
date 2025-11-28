import { assert } from 'decent-portal';

function _calcEnergyOverRange(samples:Float32Array, fromI:number, toI:number):number {
  let energy = 0;
  for(let i = fromI; i < toI; ++i) {
    const sample = samples[i];
    energy += (sample * sample);
  }
  return energy;
}

class CircularFrameBuffer {
  private _buffer:Float32Array;
  private _startFramePos:number;
  private _writePos:number;
  private _frameSampleCount:number;
  private _hopSampleCount:number;
  private _availableSampleCount:number;
  
  constructor(frameSampleCount:number) {
    if (frameSampleCount <= 1) throw Error('Frame sample count must by >1.');
    if (frameSampleCount % 2 !== 0) throw Error('Frame sample count must be even.');
    this._buffer = new Float32Array(frameSampleCount * 2);
    this._startFramePos = 0;
    this._writePos = 0;
    this._frameSampleCount = Math.floor(frameSampleCount); // Make sure it's an integer.
    this._hopSampleCount = this._frameSampleCount >> 1;
    this._availableSampleCount = 0;
  }

  public addSamples(samples:Float32Array, fromPos:number, sampleCount:number):void {
    if (sampleCount > this._buffer.length - this._availableSampleCount) throw new Error('not enough space in buffer to add samples');
    if (this._writePos + sampleCount <= this._buffer.length) {
      this._buffer.set(samples.subarray(fromPos, fromPos + sampleCount), this._writePos);
      this._writePos += sampleCount;
      if (this._writePos === this._buffer.length) this._writePos = 0;
      assert(this._writePos < this._buffer.length);
    } else {
      const firstPartLength = this._buffer.length - this._writePos;
      this._buffer.set(samples.subarray(fromPos, firstPartLength), this._writePos);
      const secondPartLength = Math.min(sampleCount - firstPartLength, this._startFramePos);
      this._buffer.set(samples.subarray(fromPos + firstPartLength, secondPartLength), 0);
      this._writePos = secondPartLength;
    }
    this._availableSampleCount += sampleCount;
  }

  public calcFrameEnergy():number {
    if (this._availableSampleCount < this._frameSampleCount) throw new Error('no frame available');
    let frameStartPos = this._startFramePos;
    const rolledOver = frameStartPos + this._frameSampleCount > this._buffer.length;
    let frameEndPos = rolledOver ? this._buffer.length : frameStartPos + this._frameSampleCount;
    let energy = _calcEnergyOverRange(this._buffer, frameStartPos, frameEndPos);
    if (!rolledOver) return energy;
    frameEndPos = this._frameSampleCount - (frameEndPos - frameStartPos);
    energy += _calcEnergyOverRange(this._buffer, 0, frameEndPos);
    return energy;
  }

  public hop():void {
    if (this._availableSampleCount < this._hopSampleCount) throw new Error('not enough samples to hop');
    this._startFramePos += this._hopSampleCount;
    if (this._startFramePos >= this._buffer.length) this._startFramePos -= this._buffer.length;
    this._availableSampleCount -= this._hopSampleCount;
  }

  public get hopSampleCount():number { return this._hopSampleCount; }
  public get availableSampleCount():number { return this._availableSampleCount; }
  public get availableSpaceCount():number { return this._buffer.length - this._availableSampleCount; }
  public get neededSampleCountForFrame():number { return Math.max(this._frameSampleCount - this._availableSampleCount, 0); } 
  public get isFrameAvailable():boolean { return this._availableSampleCount >= this._frameSampleCount; }
}

export default CircularFrameBuffer;