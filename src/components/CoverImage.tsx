import type { ReactNode, ImgHTMLAttributes } from "react";

type CoverImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  children?: ReactNode;
  fallback?: ReactNode;
  loading?: ImgHTMLAttributes<HTMLImageElement>["loading"];
  referrerPolicy?: ImgHTMLAttributes<HTMLImageElement>["referrerPolicy"];
  onError?: ImgHTMLAttributes<HTMLImageElement>["onError"];
};

export function CoverImage({
  src,
  alt,
  className = "",
  children,
  fallback,
  loading,
  referrerPolicy,
  onError,
}: CoverImageProps) {
  return (
    <div className={`relative overflow-hidden bg-surface-container ${className}`}>
      {src ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-md"
            loading={loading}
            referrerPolicy={referrerPolicy}
            onError={onError}
          />
          <div className="absolute inset-0 bg-white/30" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="absolute inset-0 z-[1] h-full w-full object-contain"
            loading={loading}
            referrerPolicy={referrerPolicy}
            onError={onError}
          />
        </>
      ) : (
        (fallback ?? null)
      )}
      {children}
    </div>
  );
}
