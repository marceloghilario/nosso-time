import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { api, ApiError } from '../services/api';
import { useToast } from './Toast';
import TeamLogo from './TeamLogo';
import type { Team } from '../types';

interface TeamLogoUploaderProps {
  team: Team;
  size?: number;
  onChange: (team: Team) => void;
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

export default function TeamLogoUploader({
  team,
  size = 96,
  onChange,
}: TeamLogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const { showError, showSuccess } = useToast();

  const handlePickFile = (): void => {
    inputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      showError('Formato inválido. Use PNG, JPEG ou WEBP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      showError('Imagem muito grande (máx. 5 MB).');
      return;
    }
    setUploading(true);
    try {
      const { uploadUrl, s3Key } = await api.getTeamLogoUploadUrl(team.teamId, {
        contentType: file.type,
        fileName: file.name,
      });
      await api.uploadToS3(uploadUrl, file, file.type);
      const updated = await api.updateTeam(team.teamId, { logoS3Key: s3Key });
      onChange(updated);
      showSuccess('Logo do time atualizado.');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Falha ao atualizar o logo do time.';
      showError(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <TeamLogo name={team.name} logoUrl={team.logoUrl} size={size} />
      <button
        type="button"
        onClick={handlePickFile}
        disabled={uploading}
        className="absolute -bottom-1 -right-1 inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary-600 text-white shadow-md ring-2 ring-white hover:bg-primary-700 disabled:opacity-60"
        aria-label={team.logoUrl ? 'Trocar logo do time' : 'Adicionar logo do time'}
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Camera className="w-4 h-4" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
