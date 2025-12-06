import { pipeline, AutomaticSpeechRecognitionPipeline, AutomaticSpeechRecognitionOutput } from '@xenova/transformers';

let thePipeline:AutomaticSpeechRecognitionPipeline|null = null;

export async function initSpeechToText() {
  if (thePipeline !== null) return;
  thePipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base');
}

export async function speechToText(audioBuffer:AudioBuffer):Promise<string> {
  if (thePipeline === null) throw new Error('SpeechToText not initialized. Call initSpeechToText() first.');

  // Convert AudioBuffer to Float32Array
  const channelData = audioBuffer.getChannelData(0); // Assuming mono audio
  const float32Array = new Float32Array(channelData.length);
  float32Array.set(channelData);

  // Run the model
  const output:AutomaticSpeechRecognitionOutput|AutomaticSpeechRecognitionOutput[] = await thePipeline(float32Array, {
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: false,
  });

  console.log(JSON.stringify(output, null, 2));
  return 'text';
}