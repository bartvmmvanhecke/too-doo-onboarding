/** One gate for all prototype controls. Production is opt-in only for a dedicated demo deployment. */
export const isDemoEnvironment = () =>
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_APP_ENV === "demo";
