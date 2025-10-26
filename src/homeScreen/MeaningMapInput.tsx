import { useEffect, useState } from 'react';
import { MeaningMap, loadMeaningMap } from 'meaning-map';

import styles from './MeaningMapInput.module.css';
import ContentButton from '../components/contentButton/ContentButton';
import { errorToast } from 'decent-portal';

export type CreateMeaningMapCallback = (meaningMap:MeaningMap, meaningMapText:string) => void;
export type BusyStatusCallback = (isBusy:boolean) => void;

type Props = {
  meaningMapText?:string;
  onBusyStatus:BusyStatusCallback;
  onCreateMeaningMap:CreateMeaningMapCallback;
};

async function _createMeaningMapFromText(text:string, onCreateMeaningMap:CreateMeaningMapCallback) {
  try {
    const meaningMap = await loadMeaningMap(text);
    onCreateMeaningMap(meaningMap, text);
  } catch(err) {
    console.log(err);
  }
}

export default function MeaningMapInput({ meaningMapText, onCreateMeaningMap, onBusyStatus }:Props) {
  const [text, setText] = useState<string>(meaningMapText ?? '');
  const [isBusy, setIsBusy] = useState<boolean>(false);

  function _updateStatus(nextIsBusy:boolean) {
    setIsBusy(nextIsBusy);
    onBusyStatus(nextIsBusy);
  }
   
  useEffect(() => {
    setText(meaningMapText ?? '');
  }, [meaningMapText]);

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
        onClick={() => {
          _updateStatus(true);
          try {
            _createMeaningMapFromText(text, onCreateMeaningMap)
          } catch(err) {
            errorToast(`Error loading meaning map: ${err}`);
          } finally {
            _updateStatus(false);
          }
        }}
        disabled={isBusy}
      />
    </div>
  );
}
