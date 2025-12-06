import { Microphone, sampleCountToMSecs, theAudioContext } from "sl-web-audio"
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
  theState.speechDetector.processAudioSamples(samples);
}

async function _playSamples(microphone:Microphone, samples:Float32Array, sampleRate:number) {
  microphone.disable();
  const audioCtx = theAudioContext();
  if (!audioCtx) return;
  const audioBuffer = audioCtx.createBuffer(1, samples.length, sampleRate);
  audioBuffer.getChannelData(0).set(samples);
  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioCtx.destination);
  source.start();
  await new Promise<void>(resolve => {
    source.onended = () => { 
      microphone.enable();
      resolve(); 
    };
  });
}

export async function initSpeechToText(onReceiveText:ReceiveTextCallback) {
  if (theState) return;
  const microphone = new Microphone(_onReceiveAudio);
  await microphone.init();
  const speechDetector = new SpeechDetector(microphone.sampleRate, {
    onSilence:(speechSamples:Float32Array) => {
      if (!theState) return;
      const duration = sampleCountToMSecs(speechSamples.length, microphone.sampleRate);
      // _playSamples(theState.microphone, speechSamples, microphone.sampleRate);
      console.log(`silence preceded by ${duration} msecs of speech`);
    },
    onSpeech:() => {console.log('speech ' + performance.now());},
  });
  theState = { microphone, speechDetector, onReceiveText};
}

export function enableSpeechToText() {
  if (!theState) throw new Error('Speech-to-text not initialized.');
  theState.microphone.enable();
}

export function disableSpeechToText() {
  if (!theState) throw new Error('Speech-to-text not initialized.');
  theState.microphone.disable();
}