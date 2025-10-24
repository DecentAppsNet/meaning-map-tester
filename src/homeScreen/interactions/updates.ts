import { assertNonNullable, infoToast } from 'decent-portal';
import { makeUtteranceReplacements, MeaningMap } from 'meaning-map';

import Session from '@/persistence/types/Session';
import { saveSession } from '@/persistence/session';

export async function updateMatchText(matchText:string, session:Session|null, setSession:Function, 
    setReplacedMatchText:Function, meaningMap:MeaningMap|null) {
  assertNonNullable(session);
  const nextSession = {...session, matchText};
  if (meaningMap && matchText.length) {
    const [replacedText] = await makeUtteranceReplacements(matchText, meaningMap.replacers);
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