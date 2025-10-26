import { assertNonNullable, infoToast } from 'decent-portal';
import { makeUtteranceReplacements, MeaningMap, isPlainUtterance } from 'meaning-map';

import Session from '@/persistence/types/Session';
import { saveSession } from '@/persistence/session';

function _replacedValuesToParamsText(replacedValues:{[key:string]:string}):string {
  const entries = Object.entries(replacedValues);
  if (entries.length === 0) return 'None';
  return entries.map(([key, value]) => `${key}="${value}"`).join(', ');
}

export async function updateMatchText(matchText:string, session:Session|null, setSession:Function, 
    setReplacedMatchText:Function, setParamsText:Function, meaningMap:MeaningMap|null) {
  assertNonNullable(session);
  const nextSession = {...session, matchText};
  if (meaningMap && matchText.length && isPlainUtterance(matchText)) {
    const [replacedText, replacedValues] = await makeUtteranceReplacements(matchText, meaningMap.replacers);
    setParamsText(_replacedValuesToParamsText(replacedValues));
    setReplacedMatchText(replacedText);
  }
  setSession(nextSession);
  await saveSession(nextSession);
}

export async function updatingMeaningMap(nextMeaningMap:MeaningMap, meaningMapText:string, 
    setMeaningMap:Function, session:Session|null, setSession:Function) {
  assertNonNullable(session);
  const nextSession = {...session, meaningMapText};
  setMeaningMap(nextMeaningMap);
  setSession(nextSession);
  infoToast('Meaning map updated.');
  await saveSession(nextSession);
}