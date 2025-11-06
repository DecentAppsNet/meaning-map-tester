import { Microphone } from "sl-web-audio"

type ReceiveTextCallback = (text:string) => void;

type State = {
  microphone:Microphone;
  onReceiveText:ReceiveTextCallback;
}

let theState:State|null = null;

function _onReceiveAudio(samples:Float32Array, sampleRate:number) {
  if (!theState) return;
  const text = `[Audio received: ${samples.length} samples at ${sampleRate} Hz`;
  theState!.onReceiveText(text);
}

export async function initSpeechToText(onReceiveText:ReceiveTextCallback) {
  if (theState) return;
  const microphone = new Microphone(_onReceiveAudio);
  theState = {
    microphone,
    onReceiveText
  };
  await microphone.init();
}

export function enableSpeechToText() {
  if (!theState) throw new Error('Speech-to-text not initialized.');
  theState.microphone.enable();
}

export function disableSpeechToText() {
  if (!theState) throw new Error('Speech-to-text not initialized.');
  theState.microphone.disable();
}