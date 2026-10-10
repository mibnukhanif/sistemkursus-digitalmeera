import React, { useState, useEffect } from 'react';
import { extractDriveFileId, getOptimizedPhotoUrl, getFallbackPhotoUrl, getProxyPhotoUrl } from '../lib/photo';
import { GraduationCap } from 'lucide-react';

interface InstitutionLogoProps {
  logo?: string | null;
  alt?: string;
  className?: string;
  containerClassName?: string;
  size?: number; // target size in pixels (default 400)
  fallbackType?: 'cap' | 'badge' | 'custom';
  fallbackText?: string;
  customFallback?: React.ReactNode;
  crossOrigin?: '' | 'anonymous' | 'use-credentials';
}

/**
 * Komponen Terpadu Logo Lembaga Digitalmeera
 * Menjamin render logo 100% konsisten lintas perangkat (HP, Tablet, Laptop, Multi-browser)
 * dengan arsitektur multi-tier fallback:
 * Tier 0: Direct Base64 / Local Blob
 * Tier 1: Google Image CDN resolusi tinggi (https://lh3.googleusercontent.com/d/{id}=s{size})
 * Tier 2: Google Drive Thumbnail API (https://drive.google.com/thumbnail?id={id}&sz=w{size})
 * Tier 3: Express internal proxy (/api/photo?id={id})
 * Tier 4: Elegant Branding Badge / Icon Fallback
 */
export const InstitutionLogo: React.FC<InstitutionLogoProps> = ({
  logo,
  alt = 'Logo Lembaga',
  className = 'max-h-full max-w-full object-contain',
  containerClassName,
  size = 400,
  fallbackType = 'cap',
  fallbackText = 'DM',
  customFallback,
  crossOrigin,
}) => {
  const getInitialSrc = (url: string | null | undefined): string => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('data:image') || trimmed.startsWith('blob:')) return trimmed;

    const driveId = extractDriveFileId(trimmed);
    if (driveId) {
      // Tier 1: Google Global Image CDN
      return `https://lh3.googleusercontent.com/d/${driveId}=s${size}`;
    }
    return trimmed;
  };

  const [currentSrc, setCurrentSrc] = useState<string>(() => getInitialSrc(logo));
  const [attempt, setAttempt] = useState<number>(0);
  const [hasError, setHasError] = useState<boolean>(!getInitialSrc(logo));

  // Reset and synchronize whenever logo prop or size changes
  useEffect(() => {
    const nextSrc = getInitialSrc(logo);
    setCurrentSrc(nextSrc);
    setAttempt(0);
    setHasError(!nextSrc);
  }, [logo, size]);

  const handleError = () => {
    if (!logo) {
      setHasError(true);
      return;
    }

    const driveId = extractDriveFileId(logo);
    if (driveId) {
      if (attempt === 0) {
        // Fallback to Drive Thumbnail API
        const fallback1 = getFallbackPhotoUrl(logo, size);
        if (fallback1 && fallback1 !== currentSrc) {
          setAttempt(1);
          setCurrentSrc(fallback1);
          return;
        }
      }

      if (attempt <= 1) {
        // Fallback to Express backend proxy
        const fallback2 = getProxyPhotoUrl(logo);
        if (fallback2 && fallback2 !== currentSrc) {
          setAttempt(2);
          setCurrentSrc(fallback2);
          return;
        }
      }
    }

    // All image sources failed
    setHasError(true);
  };

  const renderFallback = () => {
    if (customFallback) return customFallback;

    if (fallbackType === 'badge') {
      return (
        <span className="font-black text-xs sm:text-sm tracking-wider select-none">
          {fallbackText}
        </span>
      );
    }

    return <GraduationCap className="h-full w-full p-1 text-white" />;
  };

  if (!currentSrc || hasError) {
    if (containerClassName) {
      return <div className={containerClassName}>{renderFallback()}</div>;
    }
    return renderFallback();
  }

  const imageElement = (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      crossOrigin={crossOrigin}
      onError={handleError}
      loading="eager"
      decoding="async"
    />
  );

  if (containerClassName) {
    return <div className={containerClassName}>{imageElement}</div>;
  }

  return imageElement;
};
