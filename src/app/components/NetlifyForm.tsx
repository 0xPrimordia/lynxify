'use client';

export default function NetlifyForm() {
  return (
    <form
      name="feedback"
      method="POST"
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      action="/api/form"
      hidden
    >
      <input type="hidden" name="form-name" value="feedback" />
      <textarea name="feedback"></textarea>
      <input type="hidden" name="debugInfo" />
    </form>
  );
} 