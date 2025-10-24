type Session = {
  matchText:string,
  meaningMapText:string
}

export function isSession(obj:any):obj is Session {
  return obj &&
    typeof obj === 'object' &&
    'matchText' in obj && typeof obj.matchText === 'string' &&
    'meaningMapText' in obj && typeof obj.meaningMapText === 'string';
}

export default Session;