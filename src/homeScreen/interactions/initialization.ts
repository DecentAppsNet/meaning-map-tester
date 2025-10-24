import Session from '@/persistence/types/Session';
import { getSession } from "@/persistence/session";
import { loadMeaningMap, MeaningMap } from 'meaning-map';

let isInitialized = false;
let isInitializing = false;

export type InitResults = {
  session:Session,
  meaningMap:MeaningMap|null
}

async function _loadMeaningMap(meaningMapText:string):Promise<MeaningMap|null> {
  if (meaningMapText === '') return null;
  try {
    return await loadMeaningMap(meaningMapText);
  } catch { 
    return null;
  }
}

export async function init():Promise<InitResults|null> {
  if (isInitialized || isInitializing) return null;

  try {
    isInitializing = true;

    const session = await getSession();
    const meaningMap = await _loadMeaningMap(session.meaningMapText);

    isInitialized = true;
    return { session, meaningMap };
  } catch(err) {
    console.error(`Failed to initialize - ${'' + err}.`);
    return null;
  } finally {
    isInitializing = false;
  }
}