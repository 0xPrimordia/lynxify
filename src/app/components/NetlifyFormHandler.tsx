'use client';

import { useEffect } from 'react';

export default function NetlifyFormHandler() {
  useEffect(() => {
    const forms = document.querySelectorAll('form[data-netlify="true"]');
    forms.forEach(form => {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const formData = new FormData(form as HTMLFormElement);
        fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(formData as any).toString(),
        });
      });
    });
  }, []);

  return null;
} 