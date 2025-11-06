import { describe, it, expect, vi } from 'vitest';

// Mocks first before importing modules that may use them.
vi.mock("sl-web-audio", async () => ({
  calcRmsForSamples: vi.fn(() => theRms)
}));

import { TestExports, setMaxChunkCount } from '../speechDetectionUtil';

const { _theMedianChunk, _findFirstChunk } = TestExports;

let theRms = 0;

function _describeChunks() {
  let chunk = _findFirstChunk();
  let concat = '';
  while(chunk) {
    if (concat.length) concat += ' ';
    if (chunk === _theMedianChunk()) concat += '!';
    concat += chunk.rms;
    chunk = chunk.nextChunk;
  }
  console.log('Chunks: ' + concat);
  return concat;
}

function _addChunk(rmsValue:number) {
  theRms = rmsValue;
  const array = new Float32Array([0]);
  return TestExports._addChunk(array);
}

describe('speechDetectionUtil', () => {
  it('adhoc', () => {
    setMaxChunkCount(5);
    const chunk5 = _addChunk(5);
    expect(_describeChunks()).toBe('!5');
    const chunk3 = _addChunk(3);
    expect(_describeChunks()).toBe('3 !5');
    const chunk7 = _addChunk(7);
    expect(_describeChunks()).toBe('3 !5 7');
    const chunk8 = _addChunk(8);
    expect(_describeChunks()).toBe('3 5 !7 8');
    const chunk9 = _addChunk(9);
    expect(_describeChunks()).toBe('3 5 !7 8 9');
    const chunk1 = _addChunk(1);
    expect(_describeChunks()).toBe('1 3 !7 8 9'); // remove 5
    const chunk2 = _addChunk(2);
    expect(_describeChunks()).toBe('1 2 !7 8 9'); // remove 3
    const chunk4 = _addChunk(4);
    expect(_describeChunks()).toBe('1 2 !4 8 9'); // remove 7
    const chunk6 = _addChunk(6);
    expect(_describeChunks()).toBe('1 2 !4 6 9'); // remove 8
  });
});