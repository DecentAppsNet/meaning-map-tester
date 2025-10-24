import { matchMeaningWithStats, MeaningMap, MeaningMatch } from 'meaning-map';
import { useState, useEffect } from 'react';

import styles from './MeaningMapView.module.css';
import MeaningMapNodeView from './MeaningMapNodeView';

type Props = {
  meaningMap:MeaningMap,
  matchText:string
}

function MeaningMapView({meaningMap, matchText}:Props) {
  const [meaningMatch, setMeaningMatch] = useState<MeaningMatch|null>(null);

  useEffect(() => {
    setMeaningMatch(null);
    if (matchText === '') return;
    matchMeaningWithStats(matchText.toLowerCase(), meaningMap).then(setMeaningMatch);
  }, [meaningMap, matchText]);

  return <div className={styles.container}>
    <ul>
      <MeaningMapNodeView meaningId={meaningMap.root.id} meaningMap={meaningMap} meaningMatch={meaningMatch} />
    </ul>
  </div>;
}

export default MeaningMapView;