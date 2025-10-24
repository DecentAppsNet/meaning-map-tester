import { MeaningMap, MeaningMapNode, MeaningMatch } from 'meaning-map';

import styles from './MeaningMapNodeView.module.css';
import { assertNonNullable } from 'decent-portal';

type Props = {
  meaningId:number;
  meaningMap:MeaningMap;
  meaningMatch:MeaningMatch|null;
}

function _isMatchedNode(meaningMap:MeaningMap, meaningId:number, meaningMatch:MeaningMatch|null):boolean {
  if (!meaningMatch) return false;
  let node:MeaningMapNode|null = meaningMap.nodes[meaningMatch.meaningId];
  while (node !== meaningMap.root) {
    assertNonNullable(node);
    if (node.id === meaningId) return true;
    node = node.parent;
  }
  return false;
}

function _getMatchStatsText(meaningId:number, meaningMatch:MeaningMatch|null):string {
  if (!meaningMatch || !meaningMatch.stats) return '';
  const nodeStats = meaningMatch.stats.nodeStats[meaningId];
  if (!nodeStats) return '';
  function _toPercent(value:number):string {
    return (Math.round(value * 10000) / 100).toFixed(1);
  }
  return ` (${_toPercent(nodeStats.childMatchScore)}% with ${_toPercent(nodeStats.childMatchSeparation)}% separation)`;
}

function MeaningMapNodeView({meaningId, meaningMap, meaningMatch}:Props) {
  const node = meaningMap.nodes[meaningId];
  const parentMeaningId = node.parent ? node.parent.id : -1;
  const matchStatsText = _getMatchStatsText(parentMeaningId, meaningMatch);
  const isMatched = _isMatchedNode(meaningMap, meaningId, meaningMatch);
  const descriptionClassName = isMatched ? styles.matched : '';

  const childNodes = node.children.length > 0 ? (
    <ul>
      {node.children.map(child => (
        <MeaningMapNodeView 
          key={child.id} 
          meaningId={child.id} 
          meaningMap={meaningMap} 
          meaningMatch={meaningMatch} 
        />
      ))}
    </ul>) : null;
  
  const matchStats = isMatched ? <span className={styles.matchStats}>{matchStatsText}</span> : '';
  
  return <li className={styles.container}>
    <span className={descriptionClassName}>{node.description}</span>
    {matchStats}
    {childNodes}
  </li>;
}

export default MeaningMapNodeView;