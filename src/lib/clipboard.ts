type ClipboardEnvironment = {
  navigator?: { clipboard?: { writeText: (text: string) => Promise<void> } };
  document?: Document;
};

export async function copyText(text: string, environment: ClipboardEnvironment = { navigator: globalThis.navigator, document: globalThis.document }) {
  if (environment.navigator?.clipboard?.writeText) {
    try {
      await environment.navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Some browsers expose Clipboard API but block it outside a trusted gesture.
    }
  }

  const document = environment.document;
  if (!document?.body || typeof document.execCommand !== 'function') return false;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  try {
    return document.execCommand('copy');
  } finally {
    textarea.remove();
  }
}
