import { useEffect, useState } from "react";
import { MeaningMap } from "meaning-map";

import styles from './HomeScreen.module.css';
import { init } from "./interactions/initialization";
import LoadScreen from '@/loadScreen/LoadScreen';
import TopBar from '@/components/topBar/TopBar';
import MeaningMapView from "@/components/meaningMapView/MeaningMapView";
import MeaningMapInput from "./MeaningMapInput";
import MatchTextInput from "./MatchTextInput";
import Session from '@/persistence/types/Session';
import { updateMatchText, updatingMeaningMap } from "./interactions/updates";

function HomeScreen() {
  const [meaningMap, setMeaningMap] = useState<MeaningMap|null>(null);
  const [session, setSession] = useState<Session|null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMeaningMapLoading, setIsMeaningMapLoading] = useState<boolean>(true);
  const [replacedMatchText, setReplacedMatchText] = useState<string>('');
  
  useEffect(() => {
    if (session || isLoading) return;
    init().then(initResults => {
      if (!initResults) return;
      setSession(initResults.session);
      setMeaningMap(initResults.meaningMap);
      setIsMeaningMapLoading(false);
    });
  }, [session, isLoading]);

  if (isLoading) return <LoadScreen onComplete={() => setIsLoading(false)} />;
  
  const meaningMapContent = meaningMap ? (
    <MeaningMapView meaningMap={meaningMap} matchText={session?.matchText ?? ''} />
  ) : isMeaningMapLoading ? (
    <p>Loading meaning map...</p>
  ) : (
    <p>Meaning map not loaded.</p>
  );
  return (
    <div className={styles.container}>
      <TopBar />
      <MeaningMapInput 
          meaningMapText={session?.meaningMapText ?? ''} 
          onCreateMeaningMap={(nextMeaningMap, meaningMapText) => 
            updatingMeaningMap(nextMeaningMap, meaningMapText, setMeaningMap, session, setSession)}
          onBusyStatus={setIsMeaningMapLoading}
      />
      <div className={styles.content}>
        <MatchTextInput onChange={(nextMatchText) => updateMatchText(nextMatchText, session, setSession, setReplacedMatchText, meaningMap)} />
        <p className={styles.replacedText}>Replaced: {replacedMatchText}</p>
        {meaningMapContent}
      </div>
    </div>
  );
}

export default HomeScreen;