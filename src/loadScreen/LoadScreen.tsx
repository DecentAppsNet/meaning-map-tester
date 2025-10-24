import {useState, useEffect} from "react";

import styles from './LoadScreen.module.css';
import { init } from "./interactions/initialization";
import ProgressBar from '@/components/progressBar/ProgressBar';
import TopBar from '@/components/topBar/TopBar';

type Props = {
  onComplete: () => void;
}

function LoadScreen(props:Props) {
  const [percentComplete, setPercentComplete] = useState(.5);
  const [currentTask] = useState('Loading');
  const {onComplete} = props;
  
  useEffect(() => {
    init().then((isInitialized) => { if (isInitialized) { setPercentComplete(1); onComplete(); } });
  }, []);
  
  return (
    <div className={styles.container}>
      <TopBar />
      <div className={styles.content}>
        <div className={styles.progressBarContainer}>
          <ProgressBar percentComplete={percentComplete}/>
          {currentTask}
        </div>
      </div>
    </div>
  );
}

export default LoadScreen;