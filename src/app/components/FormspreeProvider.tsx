'use client';

import { FormspreeProvider as Provider } from '@formspree/react';

export default function FormspreeProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider>
      {children}
    </Provider>
  );
} 