interface INodeLinks<T> {
  successorNode:T|null,
  prevNode:T|null,
  nextNode:T|null
}

type MedianBufferNode<Payload> = INodeLinks<MedianBufferNode<Payload>> & { readonly payload:Payload };

export default MedianBufferNode;