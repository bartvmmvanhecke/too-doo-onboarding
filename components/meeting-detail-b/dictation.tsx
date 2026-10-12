"use client";
import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { toast } from "sonner";
type Speech = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
type SpeechWindow = Window & { SpeechRecognition?: new () => Speech; webkitSpeechRecognition?: new () => Speech };
export function speechSupported() { return typeof window !== "undefined" && !!((window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition); }
export function Dictation({ onText }: { onText: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const speech = useRef<Speech | null>(null);
  useEffect(() => () => speech.current?.stop(), []);
  function start() {
    const Constructor = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
    if (!Constructor) return;
    if (listening) { speech.current?.stop(); return; }
    const recognition = new Constructor();
    speech.current = recognition;
    recognition.lang = "nl-BE"; recognition.continuous = false; recognition.interimResults = false;
    recognition.onresult = (e) => { onText(Array.from(e.results).map((r) => r[0].transcript).join(" ")); };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); toast("Dicteren is niet beschikbaar. Probeer opnieuw of typ je tekst."); };
    try { recognition.start(); setListening(true); } catch { toast("Dicteren is niet beschikbaar"); }
  }
  return <button type="button" aria-label="Dicteren" aria-pressed={listening} onClick={start} className="min-h-11 min-w-11 text-ink-3 aria-pressed:text-danger"><Mic size={16} aria-hidden /></button>;
}
