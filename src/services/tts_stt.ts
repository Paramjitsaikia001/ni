/**
 * Utility service to prepare text for the Frontend's 
 * Speech Synthesis and handle incoming transcriptions.
 */

/**
 * Prepares AI-generated text for the browser's TTS.
 * This removes markdown symbols (like **, #, or _) that 
 * the robot voice might try to literally "read" out loud.
 */
export const prepareForSpeech = (text: string): string => {
  return text
    .replace(/[*_#~]/g, '') // Remove markdown formatting
    .replace(/\[.*?\]/g, '') // Remove any bracketed AI notes
    .trim();
};

/**
 * Normalizes the transcription received from the Frontend STT.
 * This cleans up the text before it is sent to the AI evaluation engine.
 */
export const normalizeTranscription = (text: string): string => {
  if (!text) return "";
  
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // Remove punctuation for cleaner matching
    .trim();
};