import { Microphone } from "sl-web-audio"
import SpeechDetector from "./SpeechDetector";

type ReceiveTextCallback = (text:string) => void;

type State = {
  microphone:Microphone;
  speechDetector:SpeechDetector;
  onReceiveText:ReceiveTextCallback;
}

let theState:State|null = null;

function _onReceiveAudio(samples:Float32Array, _sampleRate:number) {
  if (!theState) return;
  theState.speechDetector.addAudioChunkToBuffer(samples);
}

export async function initSpeechToText(onReceiveText:ReceiveTextCallback) {
  if (theState) return;
  const microphone = new Microphone(_onReceiveAudio);
  await microphone.init();
  const speechDetector = new SpeechDetector(microphone.sampleRate, microphone.bufferSize, {
    onSilence:() => {console.log('silence ' + performance.now());},
    onSpeech:() => {console.log('speech ' + performance.now());},
  });
  theState = {
    microphone,
    speechDetector,
    onReceiveText
  };
}

export function enableSpeechToText() {
  if (!theState) throw new Error('Speech-to-text not initialized.');
  theState.microphone.enable();
}

export function disableSpeechToText() {
  if (!theState) throw new Error('Speech-to-text not initialized.');
  theState.microphone.disable();
}