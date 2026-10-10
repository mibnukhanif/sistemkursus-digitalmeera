import React, { useState } from 'react';
import { getOptimizedPhotoUrl, getFallbackPhotoUrl, getProxyPhotoUrl, extractDriveFileId } from '../lib/photo';
import { User, ImageOff, Loader2 } from 'lucide-react';

interface StudentPhotoProps {
  photoUrl: string | null | undefined;
  alt: string;
  size?: number; // target size in px (misal 120, 200, 300, 800)
  className?: string;
  containerClassName?: string;
  loading?: 'lazy' | 'eager';
  showInitialsOnEmpty?: boolean;
  initials?: string;
  onClick?: () => void;
}

export const StudentPhoto: React.FC<StudentPhotoProps> = ({
  photoUrl,
  alt,
  size = 300,
  className = 'h-full w-full object-cover',
  containerClassName = 'relative h-full w-full overflow-hidden flex items-center justify-center bg-slate-800',
  loading = 'lazy',
  showInitialsOnEmpty = true,
  initials,
  onClick,
}) => {
  // Step 0: Primary CDN url
  const primaryUrl = getOptimizedPhotoUrl(photoUrl, size);
  const [currentSrc, setCurrentSrc] = useState<string>(primaryUrl);
  const [attempt, setAttempt] = useState<number>(0);
  const [hasError, setHasError] = useState<boolean>(!primaryUrl);
  const [isLoading, setIsLoading] = useState<boolean>(!!primaryUrl);

  // Sync if photoUrl or size changes
  React.useEffect(() => {
    const nextUrl = getOptimizedPhotoUrl(photoUrl, size);
    setCurrentSrc(nextUrl);
    setAttempt(0);
    setHasError(!nextUrl);
    setIsLoading(!!nextUrl);
  }, [photoUrl, size]);

  const handleError = () => {
    const driveId = extractDriveFileId(photoUrl);

    if (attempt === 0) {
      // Attempt 1 fallback: Google Drive Thumbnail API
      const fallback = getFallbackPhotoUrl(photoUrl, size);
      if (fallback && fallback !== currentSrc) {
        setAttempt(1);
        setCurrentSrc(fallback);
        return;
      }
    }

    if (attempt <= 1 && driveId) {
      // Attempt 2 fallback: Express backend proxy (/api/photo?id=...)
      const proxy = getProxyPhotoUrl(photoUrl);
      if (proxy && proxy !== currentSrc) {
        setAttempt(2);
        setCurrentSrc(proxy);
        return;
      }
    }

    if (attempt <= 2 && driveId) {
      // Attempt 3 fallback: Google Drive direct uc export view
      const ucUrl = `https://drive.google.com/uc?export=view&id=${driveId}`;
      if (ucUrl !== currentSrc) {
        setAttempt(3);
        setCurrentSrc(ucUrl);
        return;
      }
    }

    // All fallbacks exhausted
    setIsLoading(false);
    setHasError(true);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const displayInitials = (initials || alt || 'DM').trim().slice(0, 2).toUpperCase();

  if (!photoUrl || hasError) {
    return (
      <div className={containerClassName} onClick={onClick}>
        {showInitialsOnEmpty ? (
          <div className="flex flex-col items-center justify-center text-center p-1 select-none">
            <span className="font-black text-xs tracking-wider text-slate-200">
              {displayInitials}
            </span>
          </div>
        ) : (
          <User className="h-1/2 w-1/2 text-slate-400" />
        )}
      </div>
    );
  }

  return (
    <div className={containerClassName} onClick={onClick}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30 z-10">
          <Loader2 className="h-4 w-4 animate-spin text-white/70" />
        </div>
      )}
      <img
        src={currentSrc}
        alt={alt}
        className={className}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};
