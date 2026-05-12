import { useState } from 'react';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';

interface Props {
  targetRef: React.RefObject<HTMLElement | null>;
  fileName: string;
  disabled?: boolean;
  onError?: (message: string) => void;
}

export default function ExportButton({
  targetRef,
  fileName,
  disabled,
  onError,
}: Props) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    const element = targetRef.current;
    if (!element) return;
    setBusy(true);
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#10783b',
        scale: Math.max(2, Math.ceil(800 / element.clientWidth)),
        useCORS: true,
      });
      canvas.toBlob((blob) => {
        if (!blob) {
          onError?.('Falha ao exportar imagem');
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Falha ao exportar imagem');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      <Download className="h-4 w-4" />
      {busy ? 'Gerando…' : 'Exportar PNG'}
    </button>
  );
}
