import { assert } from 'decent-portal';

import { pipeline, AutomaticSpeechRecognitionPipeline } from '@xenova/transformers';

let thePipeline:AutomaticSpeechRecognitionPipeline|null = null;

export async function initSpeechToText() {
  if (thePipeline !== null) return;
  thePipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base');
}

function _resampleTo16kHz(samples:Float32Array, sampleRate:number):Float32Array {
  if (sampleRate === 16000) return samples;

  const sampleCount = Math.floor(samples.length * 16000 / sampleRate);
  const resampled = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    const srcIndex = i * sampleRate / 16000;
    const srcIndexInt = Math.floor(srcIndex);
    const srcIndexFrac = srcIndex - srcIndexInt;
    const sample1 = samples[srcIndexInt] || 0;
    const sample2 = samples[srcIndexInt + 1] || 0;
    resampled[i] = sample1 * (1 - srcIndexFrac) + sample2 * srcIndexFrac;
    assert(resampled[i] >= -1 && resampled[i] <= 1);
  }
  return resampled;
}

export async function speechToText(samples:Float32Array, sampleRate:number):Promise<string> {
  if (thePipeline === null) throw new Error('SpeechToText not initialized. Call initSpeechToText() first.');

  // Convert samples to expected format of 16 kHz Float32Array.
  const samples16 = _resampleTo16kHz(samples, sampleRate);

  // Run the model
  const output = await thePipeline(samples16, {
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: false,
  });

  return (output as unknown as any).text ?? ''; // I guess typings are broken, because .text exists at runtime.
}