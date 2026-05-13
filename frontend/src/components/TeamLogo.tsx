import { Shield } from 'lucide-react';

interface TeamLogoProps {
  name: string;
  logoUrl?: string;
  size?: number;
  className?: string;
}

const initialsFromName = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function TeamLogo({
  name,
  logoUrl,
  size = 48,
  className = '',
}: TeamLogoProps) {
  const style = { width: size, height: size };
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`Logo do time ${name}`}
        className={`rounded-full object-cover bg-gray-100 ring-1 ring-gray-200 ${className}`}
        style={style}
        loading="lazy"
      />
    );
  }
  const initials = initialsFromName(name);
  const compact = size < 48;
  return (
    <div
      className={`rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-semibold ring-1 ring-primary-100 ${className}`}
      style={style}
      aria-label={`Logo do time ${name}`}
    >
      {compact ? (
        <Shield className="w-1/2 h-1/2" />
      ) : (
        <span style={{ fontSize: Math.max(12, size / 3) }}>{initials}</span>
      )}
    </div>
  );
}
