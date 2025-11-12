import { assert, assertNonNullable } from 'decent-portal';

import MedianBufferNode from './types/MedianBufferNode';

function _clampMedianPercent(medianPercent:number):number {
  if (medianPercent < 0) return 0;
  if (medianPercent > .99999) return .99999; // Avoid edge case of 1 causing median balancing to put median one past end.
  return medianPercent;
}

function _getMedianDeltaToBalance(leftNodeCount:number, rightNodeCount:number, medianPercent:number):number {
  const nodeCount = leftNodeCount + rightNodeCount;
  const targetI = Math.floor(nodeCount * medianPercent);
  return targetI - leftNodeCount;
}

export const MIN_MEDIAN_BUFFER_NODE_COUNT = 3;

class RollingMedianBuffer<PayloadType> {
  _oldestNode:MedianBufferNode<PayloadType>|null;
  _newestNode:MedianBufferNode<PayloadType>|null;
  _medianNode:MedianBufferNode<PayloadType>|null;
  _maxNodeCount:number;
  _nodeCount:number;
  _leftNodeCount:number;
  _rightNodeCount:number;
  _medianPercent:number;
  _comparator:(a:PayloadType, b:PayloadType) => number;

  constructor(maxNodeCount:number, payloadComparator:(a:PayloadType, b:PayloadType) => number, medianPercent:number = .5) {
    if (maxNodeCount < MIN_MEDIAN_BUFFER_NODE_COUNT) throw Error(`maxNodeCount must be at least ${MIN_MEDIAN_BUFFER_NODE_COUNT}`); // Avoids edge case handling in code.
    this._oldestNode = null;
    this._newestNode = null;
    this._medianNode = null;
    this._maxNodeCount = maxNodeCount;
    this._nodeCount = 0;
    this._leftNodeCount = 0;
    this._rightNodeCount = 0;
    this._medianPercent = _clampMedianPercent(medianPercent);
    this._comparator = payloadComparator;
  }

  private _insertNodeBefore(seekNode:MedianBufferNode<PayloadType>, nodeToInsert:MedianBufferNode<PayloadType>) {
    while(seekNode.prevNode) {
      if (this._comparator(seekNode.prevNode.payload, nodeToInsert.payload) <= 0) break;
      seekNode = seekNode.prevNode;
    }
    nodeToInsert.nextNode = seekNode;
    nodeToInsert.prevNode = seekNode.prevNode;
    if (nodeToInsert.prevNode) nodeToInsert.prevNode.nextNode = nodeToInsert;
    seekNode.prevNode = nodeToInsert;
  }

  private _insertNodeAfter(seekNode:MedianBufferNode<PayloadType>, nodeToInsert:MedianBufferNode<PayloadType>) {
    while(seekNode.nextNode) {
      if (this._comparator(seekNode.nextNode.payload, nodeToInsert.payload) >= 0) break;
      seekNode = seekNode.nextNode;
    }
    nodeToInsert.prevNode = seekNode;
    nodeToInsert.nextNode = seekNode.nextNode;
    if (nodeToInsert.nextNode) nodeToInsert.nextNode.prevNode = nodeToInsert;
    seekNode.nextNode = nodeToInsert;
  }

  private _insertNode(nodeToInsert:MedianBufferNode<PayloadType>) {
    assertNonNullable(this._medianNode);
    if (this._comparator(nodeToInsert.payload, this._medianNode.payload) < 0) {
      ++this._leftNodeCount;
      this._insertNodeBefore(this._medianNode, nodeToInsert);
    } else {
      ++this._rightNodeCount;
      this._insertNodeAfter(this._medianNode, nodeToInsert);
    }
  }

  private _doesNodePrecede(check:MedianBufferNode<PayloadType>, against:MedianBufferNode<PayloadType>):boolean {
    let seek = against.prevNode;
    while(seek && this._comparator(seek.payload, check.payload) === 0) {
      if (seek === check) return true;
      seek = seek.prevNode;
    }
    return false;
  }

  private _removeNode(node:MedianBufferNode<PayloadType>) {
    assertNonNullable(this._medianNode);
    if (this._comparator(node.payload, this._medianNode.payload) < 0) {
      --this._leftNodeCount;
    } else if (this._comparator(node.payload, this._medianNode.payload) > 0) {
      --this._rightNodeCount;
    } else {
      if (node === this._medianNode || this._doesNodePrecede(node, this._medianNode)) {
        --this._leftNodeCount;
        if (node === this._medianNode) this._medianNode = this._medianNode.prevNode;
      } else { 
        --this._rightNodeCount;
      }
    } 
    const prev = node.prevNode;
    const next = node.nextNode;
    if (prev) prev.nextNode = next;
    if (next) next.prevNode = prev;
  }

  private _moveMedianLeft(count:number) {
    this._leftNodeCount -= count;
    this._rightNodeCount += count;
    while(count--) {
      assertNonNullable(this._medianNode);
      this._medianNode = this._medianNode.prevNode;
    }
    assert(this._leftNodeCount >= 0);
  }

  private _moveMedianRight(count:number) {
    this._leftNodeCount += count;
    this._rightNodeCount -= count;
    while(count--) {
      assertNonNullable(this._medianNode);
      this._medianNode = this._medianNode.nextNode;
    }
    assert(this._rightNodeCount >= 0);
  }

  private _findFirstNode():MedianBufferNode<PayloadType>|null {
    if (!this._medianNode) return null;
    let seek = this._medianNode;
    while(seek.prevNode !== null) { seek = seek.prevNode; }
    return seek;
  }

  private _balanceMedian() {
    let medianDelta = _getMedianDeltaToBalance(this._leftNodeCount, this._rightNodeCount, this._medianPercent);
    if (medianDelta > 0) this._moveMedianRight(medianDelta);
    else if (medianDelta < 0) this._moveMedianLeft(-medianDelta);
  }

  setMedianPercent(medianPercent:number) {
    this._medianPercent = _clampMedianPercent(medianPercent);
    this._balanceMedian();
  }

  addNode(payload:PayloadType):PayloadType {
    const nextNode:MedianBufferNode<PayloadType> = { payload, successorNode:null, prevNode:null, nextNode:null };
  
    if (!this._medianNode) {
      this._medianNode = this._oldestNode = this._newestNode = nextNode;
      this._nodeCount = this._rightNodeCount = 1;
      return payload;
    }
  
    assertNonNullable(this._newestNode);
    assert(this._newestNode.successorNode === null);
    this._newestNode.successorNode = nextNode;
    this._newestNode = nextNode;
  
    this._insertNode(nextNode);
    let removedNode:MedianBufferNode<PayloadType>|null = null;
    ++this._nodeCount;
    while(this._nodeCount > this._maxNodeCount) { // Might be more than 1 chunk removed if a call to setMaxNodeCount() was made.
      removedNode = this._oldestNode;
      assertNonNullable(this._oldestNode);
      this._oldestNode = this._oldestNode.successorNode;
      assertNonNullable(this._oldestNode);
      this._removeNode(removedNode!);
      --this._nodeCount;
    }
  
    this._balanceMedian();

    return this._medianNode.payload;
  }

  toArray():PayloadType[] {
    let seek = this._findFirstNode();
    let result:PayloadType[] = [];
    while(seek) {
      result.push(seek.payload);
      seek = seek.nextNode;
    }
    return result;
  }

  toString():string {
    let concat = '';
    let seek = this._findFirstNode();
    while(seek) {
      if (concat.length) concat += ' ';
      if (seek === this._medianNode) concat += '!';
      concat += '' + seek.payload;
      seek = seek.nextNode;
    }
    return concat;
  }

  get median():PayloadType|null { return this._medianNode ? this._medianNode.payload : null; }

  get size():number { return this._nodeCount; }
}

export default RollingMedianBuffer;