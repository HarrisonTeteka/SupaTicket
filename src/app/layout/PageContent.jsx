// src/app/layout/PageContent.jsx
import React from "react";

export default function PageContent({ children }) {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      {children}
    </main>
  );
}