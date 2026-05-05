import { Loader2 } from 'lucide-react';

interface Props {
  label?: string;
  className?: string;
}

export default function LoadingSpinner({ label, className }: Props) {
  return (
    <div className={`flex items-center justify-center gap-2 text-gray-500 ${className ?? 'py-8'}`}>
      <Loader2 className="w-5 h-5 animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
