import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';

interface Props {
  shareToken: string | null;
  disabled?: boolean;
  onError?: (message: string) => void;
}

export default function ShareButton({ shareToken, disabled, onError }: Props) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/formacoes/${shareToken}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      onError?.('Não foi possível copiar o link');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || !shareToken}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-emerald-600" /> Link copiado!
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" /> Compartilhar
        </>
      )}
    </button>
  );
}
