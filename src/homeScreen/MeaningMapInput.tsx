import { useEffect, useState } from 'react';

import styles from './MeaningMapInput.module.css';
import ContentButton from '../components/contentButton/ContentButton';
import { BusyStatusCallback, CreateMeaningMapCallback, createMeaningMapFromText, exportMeaningMapToClipboard } from './interactions/export';

type Props = {
  meaningMapText?:string;
  onBusyStatus:BusyStatusCallback;
  onCreateMeaningMap:CreateMeaningMapCallback;
};

export default function MeaningMapInput({ meaningMapText, onCreateMeaningMap, onBusyStatus }:Props) {
  const [text, setText] = useState<string>(meaningMapText ?? '');
  const [isBusy, setIsBusy] = useState<boolean>(false);
   
  useEffect(() => {
    setText(meaningMapText ?? '');
  }, [meaningMapText]);

  useEffect(() => {
    onBusyStatus(isBusy);
  }, [isBusy, onBusyStatus]);

  return (
    <div className={styles.container}>
      <label className={styles.label} htmlFor="meaningMapInputTextarea">Meaning map</label>
      <textarea
        id="meaningMapInputTextarea"
        className={styles.textarea}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isBusy}
      />
      <ContentButton
        text="Load"
        onClick={() => createMeaningMapFromText(text, onCreateMeaningMap, setIsBusy)}
        disabled={isBusy || !text.length}
      />
      <ContentButton
        text="Copy to Clipboard"
        onClick={() => exportMeaningMapToClipboard(text, onCreateMeaningMap, setIsBusy)}
        disabled={isBusy || !text.length}
      />
    </div>
  );
}
