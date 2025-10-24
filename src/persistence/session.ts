import { getText, setText } from './pathStore';
import Session, { isSession } from './types/Session';

const SESSION_PATH = `/lastSession.json`;

function _createNewSession():Session {
  const newSession:Session = {
    matchText:'',
    meaningMapText:''
  };
  return newSession;
}

export async function getSession():Promise<Session> {
  const sessionJson = await getText(SESSION_PATH);
  if (!sessionJson) return _createNewSession();
  try {
    const session:Session = JSON.parse(sessionJson);
    if (!isSession(session)) throw new Error('Parsed session is not valid');
    return session;
  } catch(err) {
    console.log('Error parsing session JSON:', err);
    return _createNewSession();
  }
}

export async function saveSession(session:Session):Promise<void> {
  const sessionJson = JSON.stringify(session);
  await setText(SESSION_PATH, sessionJson);
}
