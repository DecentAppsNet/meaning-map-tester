import { initialize as initMeaningMap, InitOption } from 'meaning-map';

let isInitialized = false;
let isInitializing = false;

// Returns true if model is ready to load, false if there are problems.
export async function init():Promise<boolean> {
  if (isInitialized || isInitializing) return false;
  try {
    isInitializing = true;
    await initMeaningMap(InitOption.EMBEDDER);
    isInitialized = true;
    return true;
  } catch(e) {
    console.error(e);
    return false;
  } finally {
    isInitializing = false;
  } 
}