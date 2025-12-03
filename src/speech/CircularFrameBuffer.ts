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
  private _startFrameSampleNo:number;
  private _firstAvailableSampleNo:number;
  private _writeSampleNo:number;
  private _frameSampleCount:number;
  private _hopSampleCount:number;

  _sampleNoToPos(sampleNo:number) { return sampleNo % this._buffer.length; }
  
  constructor(frameSampleCount:number, totalSampleCount:number = 0) {
    if (frameSampleCount <= 1) throw Error('Frame sample count must by >1.');
    if (frameSampleCount % 2 !== 0) throw Error('Frame sample count must be even.');
    if (totalSampleCount < frameSampleCount * 2) totalSampleCount = frameSampleCount * 2;
    this._buffer = new Float32Array(totalSampleCount);
    this._startFrameSampleNo = this._firstAvailableSampleNo = this._writeSampleNo = 0;
    this._frameSampleCount = Math.floor(frameSampleCount); // Make sure it's an integer.
    this._hopSampleCount = this._frameSampleCount >> 1;
  }

  public addSamples(samples:Float32Array, fromPos:number, sampleCount:number):void { 
    if (sampleCount > this.availableWriteSpace) throw new Error('not enough space in buffer to add samples');
    const writePos = this._sampleNoToPos(this._writeSampleNo);
    if (writePos + sampleCount <= this._buffer.length) {
      this._buffer.set(samples.subarray(fromPos, fromPos + sampleCount), writePos);
    } else {
      const firstPartLength = this._buffer.length - writePos;
      this._buffer.set(samples.subarray(fromPos, fromPos + firstPartLength), writePos);
      const secondPartPos = fromPos + firstPartLength; 
      const secondPartLength = Math.min(sampleCount - firstPartLength, this._sampleNoToPos(this._startFrameSampleNo));
      this._buffer.set(samples.subarray(secondPartPos, secondPartPos + secondPartLength), 0);
    }
    this._writeSampleNo += sampleCount;
    const availableSampleCount = this._writeSampleNo - this._firstAvailableSampleNo;
    if (availableSampleCount > this._buffer.length) this._firstAvailableSampleNo += (availableSampleCount - this._buffer.length);
    assert(this._firstAvailableSampleNo <= this._writeSampleNo);
  }

  public calcFrameEnergy():number {
    if (this.availableFrameSampleCount < this._frameSampleCount) throw new Error('no frame available');
    let frameStartPos = this._sampleNoToPos(this._startFrameSampleNo);
    const rolledOver = frameStartPos + this._frameSampleCount > this._buffer.length;
    let frameEndPos = rolledOver ? this._buffer.length : frameStartPos + this._frameSampleCount;
    let energy = _calcEnergyOverRange(this._buffer, frameStartPos, frameEndPos);
    if (!rolledOver) return energy;
    frameEndPos = this._frameSampleCount - (frameEndPos - frameStartPos);
    energy += _calcEnergyOverRange(this._buffer, 0, frameEndPos);
    return energy;
  }

  public hop():void {
    if (this.availableFrameSampleCount < this._hopSampleCount) throw new Error('not enough samples to hop');
    this._startFrameSampleNo += this._hopSampleCount;
  }

  _clampSampleNoToAvailable(sampleNo:number):number {
    if (sampleNo <= this._firstAvailableSampleNo) return this._firstAvailableSampleNo;
    if (sampleNo > this._writeSampleNo) return this._writeSampleNo;
    return sampleNo;
  }

  public copySamples(fromSampleNo:number, toSampleNo:number):Float32Array {
    assert(fromSampleNo <= toSampleNo);
    fromSampleNo = this._clampSampleNoToAvailable(fromSampleNo);
    toSampleNo = this._clampSampleNoToAvailable(toSampleNo);
    if (fromSampleNo === toSampleNo) return new Float32Array([]);
    const fromPos = this._sampleNoToPos(fromSampleNo);
    const toPos = this._sampleNoToPos(toSampleNo);
    if (fromPos < toPos) return this._buffer.subarray(fromPos, toPos);
    const copyArray = new Float32Array(toSampleNo - fromSampleNo);
    const firstPartLength = this._buffer.length - fromPos;
    copyArray.set(this._buffer.subarray(fromPos, this._buffer.length), 0);
    const secondPartLength = toPos;
    copyArray.set(this._buffer.subarray(0, secondPartLength), firstPartLength);
    return copyArray;
  }

  public get hopSampleCount():number { return this._hopSampleCount; }
  public get availableFrameSampleCount():number { return this._writeSampleNo - this._startFrameSampleNo; }
  public get availableWriteSpace():number { return this._buffer.length - this.availableFrameSampleCount; } 
  public get isFrameAvailable():boolean { return this.availableFrameSampleCount >= this._frameSampleCount; }
  public get frameSampleNo():number { return this._startFrameSampleNo; }
  public get frameSampleCount():number { return this._frameSampleCount; }
}

export default CircularFrameBuffer;