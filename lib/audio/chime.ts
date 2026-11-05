import { CHIME_GAIN } from "../meetingWrapUp.config";
/** Schedule on the audio clock, not on a JS timer. Cancel also silences a ringing tail. */
export function playChime(ctx: AudioContext, when: number) {
  const master = ctx.createGain();
  master.gain.value = CHIME_GAIN;
  master.connect(ctx.destination);
  const voices = [880, 1318.5].map((frequency, index) => {
    const start = when + index * 0.12;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(0.5, start + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + 1.2);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(start);
    oscillator.stop(start + 1.21);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
    return oscillator;
  });
  return {
    cancel: () => {
      master.disconnect();
      for (const voice of voices) {
        try {
          voice.stop();
        } catch {
          /* Already ended. */
        }
      }
    },
  };
}
