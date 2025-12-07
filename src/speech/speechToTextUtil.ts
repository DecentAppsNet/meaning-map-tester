import { Microphone, theAudioContext } from "sl-web-audio"

import { initSpeechToText as initSpeechToTextPipeline, speechToText } from '../transformersJs/speechToText';
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

function _samplesToAudioBuffer(samples:Float32Array, sampleRate:number) {
  const audioCtx = theAudioContext();
  if (!audioCtx) throw new Error('No AudioContext available.');
  const audioBuffer = audioCtx.createBuffer(1, samples.length, sampleRate);
  audioBuffer.getChannelData(0).set(samples);
  return audioBuffer;
}

async function _playSamples(microphone:Microphone, samples:Float32Array, sampleRate:number) {
  microphone.disable();
  const audioCtx = theAudioContext();
  if (!audioCtx) throw new Error('No AudioContext available.');
  const audioBuffer = _samplesToAudioBuffer(samples, sampleRate);
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

async function _onReceiveSamplesAfterSilence(samples:Float32Array, sampleRate:number) {
  if (!theState) return;
  const text = await speechToText(samples, sampleRate);
  if (text.trim().length > 0) theState!.onReceiveText(text);      
}

export async function initSpeechToText(onReceiveText:ReceiveTextCallback) {
  if (theState) return;
  const microphone = new Microphone(_onReceiveAudio);
  await microphone.init();
  await initSpeechToTextPipeline();
  const speechDetector = new SpeechDetector(microphone.sampleRate, {
    onSilence:(speechSamples:Float32Array) => _onReceiveSamplesAfterSilence(speechSamples, microphone.sampleRate),
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