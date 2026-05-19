// src/app/providers/AppProviders.jsx
// Wrap this around your router to add future context providers (theme, auth context, etc.)
export function AppProviders({ children }) {
  return <>{children}</>;
}