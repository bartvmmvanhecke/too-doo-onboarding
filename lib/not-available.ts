import { toast } from "sonner";

/** Voor links die buiten het prototype vallen (SPEC.md §8). */
export function notAvailable() {
  toast("Niet beschikbaar in dit prototype");
}
