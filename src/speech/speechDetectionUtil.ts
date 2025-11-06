import { assert, assertNonNullable } from 'decent-portal';
import { calcRmsForSamples } from 'sl-web-audio';

let theOldestChunk:Chunk|null = null;
let theNewestChunk:Chunk|null = null;
let theMedianChunk:Chunk|null = null;
let theMaxChunkCount = 100;
let theChunkCount = 0;
let theLeftChunkCount = 0;
let theRightChunkCount = 0;

type Chunk = {
  samples:Float32Array,
  rms:number,
  successorChunk:Chunk|null,
  prevChunk:Chunk|null,
  nextChunk:Chunk|null
}

function _insertChunkBefore(seekChunk:Chunk, chunkToInsert:Chunk) {
  while(seekChunk.prevChunk) {
    if (seekChunk.prevChunk.rms < chunkToInsert.rms) break;
    seekChunk = seekChunk.prevChunk;
  }
  chunkToInsert.nextChunk = seekChunk;
  chunkToInsert.prevChunk = seekChunk.prevChunk;
  if (chunkToInsert.prevChunk) chunkToInsert.prevChunk.nextChunk = chunkToInsert;
  seekChunk.prevChunk = chunkToInsert;
}

function _insertChunkAfter(seekChunk:Chunk, chunkToInsert:Chunk) {
  while(seekChunk.nextChunk) {
    if (seekChunk.nextChunk.rms > chunkToInsert.rms) break;
    seekChunk = seekChunk.nextChunk;
  }
  chunkToInsert.prevChunk = seekChunk;
  chunkToInsert.nextChunk = seekChunk.nextChunk;
  if (chunkToInsert.nextChunk) chunkToInsert.nextChunk.prevChunk = chunkToInsert;
  seekChunk.nextChunk = chunkToInsert;
}

function _insertChunk(chunkToInsert:Chunk) {
  assertNonNullable(theMedianChunk);
  if (chunkToInsert.rms < theMedianChunk.rms) {
    ++theLeftChunkCount;
    _insertChunkBefore(theMedianChunk, chunkToInsert);
   } else {
    ++theRightChunkCount;
    _insertChunkAfter(theMedianChunk, chunkToInsert);
   }
}

function _doesChunkPrecede(check:Chunk, against:Chunk):boolean {
  let seek = against.prevChunk;
  while(seek && seek.rms === check.rms) {
    if (seek === check) return true;
    seek = seek.prevChunk;
  }
  return false;
}

function _removeChunk(chunk:Chunk) {
  assertNonNullable(theMedianChunk);
  const prev = chunk.prevChunk;
  const next = chunk.nextChunk;
  if (prev) prev.nextChunk = next;
  if (next) next.prevChunk = prev;
  if (chunk.rms < theMedianChunk.rms) {
    --theLeftChunkCount;
  } else if (chunk.rms > theMedianChunk.rms) {
    --theRightChunkCount;
  } else {
    if (chunk === theMedianChunk || _doesChunkPrecede(chunk, theMedianChunk)) {
      --theLeftChunkCount;
      if (chunk === theMedianChunk) theMedianChunk = theMedianChunk.prevChunk;
    } else {
      --theRightChunkCount;
    }
  }
}

function _moveMedianLeft(count:number) {
  theLeftChunkCount -= count;
  theRightChunkCount += count;
  while(count--) {
    assertNonNullable(theMedianChunk);
    theMedianChunk = theMedianChunk.prevChunk;
  }
  assert(theLeftChunkCount >= 0);
}

function _moveMedianRight(count:number) {
  theLeftChunkCount += count;
  theRightChunkCount -= count;
  while(count--) {
    assertNonNullable(theMedianChunk);
    theMedianChunk = theMedianChunk.nextChunk;
  }
  assert(theRightChunkCount >= 0);
}

function _addChunk(samples:Float32Array):Chunk {
  const rms = calcRmsForSamples(samples);
  const nextChunk = { samples, rms, successorChunk:null, prevChunk:null, nextChunk:null };

  if (!theMedianChunk) {
    theMedianChunk = theOldestChunk = theNewestChunk = nextChunk;
    theChunkCount = theRightChunkCount = 1;
    return nextChunk;
  }

  assertNonNullable(theNewestChunk);
  assert(theNewestChunk.successorChunk === null);
  theNewestChunk.successorChunk = nextChunk;
  theNewestChunk = nextChunk;

  _insertChunk(nextChunk);
  let removedChunk:Chunk|null = null;
  ++theChunkCount;
  while(theChunkCount > theMaxChunkCount) { // Might be more than 1 chunk removed if a call to setMaxChunkCount() was made.
    removedChunk = theOldestChunk;
    assertNonNullable(theOldestChunk);
    theOldestChunk = theOldestChunk.successorChunk;
    assertNonNullable(theOldestChunk);
    _removeChunk(removedChunk!);
    --theChunkCount;
  }

  let medianDelta = theRightChunkCount - theLeftChunkCount;
  if (medianDelta > 1) _moveMedianRight(medianDelta - 1);
  if (medianDelta < 0) _moveMedianLeft(-medianDelta);

  return nextChunk;
}

export function setMaxChunkCount(chunkCount:number) {
  assert(chunkCount > 2); // There is logic that assumes the median chunk always has a preceding and succeeding chunk.
  theMaxChunkCount = chunkCount;
}

// TODO begin section of functions to delete after not used for testing.
function _findFirstChunk():Chunk|null { 
  if (!theMedianChunk) return null;
  let chunk = theMedianChunk;
  while(chunk.prevChunk) { chunk = chunk.prevChunk; }
  return chunk;
}

function _theMedianChunk():Chunk|null {
  return theMedianChunk;
}

function _theLeftChunkCount():number {
  return theLeftChunkCount;
}

function _theRightChunkCount():number {
  return theRightChunkCount;
}

export const TestExports = {
  _addChunk,
  _findFirstChunk,
  _theLeftChunkCount,
  _theRightChunkCount,
  _theMedianChunk
}