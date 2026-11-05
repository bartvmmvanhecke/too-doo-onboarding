import { expect, it, vi } from "vitest";
import { playChime } from "./chime";
it("plant twee zachte tonen vooruit en kan beide annuleren", () => {
  const gain = () => ({
    gain: {
      value: 0,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  const master = gain(),
    envelopes = [gain(), gain()];
  const voices = [0, 1].map(() => ({
    frequency: { value: 0 },
    type: "",
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  }));
  const ctx = {
    destination: {},
    createGain: vi.fn().mockReturnValueOnce(master).mockReturnValueOnce(envelopes[0]).mockReturnValueOnce(envelopes[1]),
    createOscillator: vi.fn().mockReturnValueOnce(voices[0]).mockReturnValueOnce(voices[1]),
  } as unknown as AudioContext;
  const sound = playChime(ctx, 20);
  expect(voices[0].start).toHaveBeenCalledWith(20);
  expect(voices[1].start).toHaveBeenCalledWith(20.12);
  expect(voices.map((v) => v.frequency.value)).toEqual([880, 1318.5]);
  expect(master.gain.value).toBe(0.2);
  expect(envelopes[0].gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.0001, 21.2);
  sound.cancel();
  expect(master.disconnect).toHaveBeenCalled();
  expect(voices[0].stop).toHaveBeenLastCalledWith();
  expect(voices[1].stop).toHaveBeenLastCalledWith();
});
