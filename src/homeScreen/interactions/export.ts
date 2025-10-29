import { loadMeaningMap, meaningMapToText, MeaningMap } from 'meaning-map';
import { errorToast, infoToast } from 'decent-portal';

export type CreateMeaningMapCallback = (meaningMap:MeaningMap, meaningMapText:string) => void;
export type BusyStatusCallback = (isBusy:boolean) => void;

export async function exportMeaningMapToClipboard(text:string, onCreateMeaningMap:CreateMeaningMapCallback, setIsBusy:BusyStatusCallback):Promise<void> {
  if (!text.length) infoToast('Meaning map text is empty. Nothing to export.');
  try {
    setIsBusy(true);
    const meaningMap = await loadMeaningMap(text);
    onCreateMeaningMap(meaningMap, text);
    const exportText = await meaningMapToText(meaningMap, true); // Differs from input text because includes embeddings.
    await navigator.clipboard.writeText(exportText);
    infoToast('Meaning map exported to clipboard.');
  } catch(err) {
    errorToast(`Export failed - ${err}`);
    return;
  } finally {
    setIsBusy(false);
  }
}

export async function createMeaningMapFromText(text:string, onCreateMeaningMap:CreateMeaningMapCallback, setIsBusy:Function):Promise<void> {
  try {
    setIsBusy(true);
    const meaningMap = await loadMeaningMap(text);
    onCreateMeaningMap(meaningMap, text);
  } catch(err) {
    errorToast(`Could not create meaning map from text - ${err}`);
    return;
  } finally {
    setIsBusy(false);
  }
}