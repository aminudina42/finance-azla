"use client";

import { useEffect, useState } from "react";

interface GlobalLoaderProps {
  isNavigating: boolean;
  isMutating: boolean;
}

export default function GlobalLoader({ isNavigating, isMutating }: GlobalLoaderProps) {
  const active = isNavigating || isMutating;
  const [visible, setVisible] = useState(false);

  // Responsif cepat menampilkan animasi loading saat berpindah halaman
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (active) {
      timer = setTimeout(() => {
        setVisible(true);
      }, 30);
    } else {
      setVisible(false);
    }
    return () => clearTimeout(timer);
  }, [active]);

  if (!active) return null;

  return (
    <>
      {/* Progress bar tipis menyala di bagian paling atas layar */}
      <div className="top-progress-bar" />

      {/* Overlay glassmorphism dengan animated SVG spinner */}
      {visible && (
        <div className="global-loader-overlay">
          <div className="global-loader-container">
            <div
              style={{
                width: "64px",
                height: "64px",
                display: "grid",
                placeItems: "center",
                marginBottom: "12px",
              }}
            >
              <img
                src="/logo/loading_spinner_animated.svg"
                alt="Memuat..."
                width={56}
                height={56}
                style={{ display: "block" }}
              />
            </div>
            <div className="global-loader-text">
              {isMutating ? "Menyimpan data..." : "Memuat..."}
            </div>
            <div className="global-loader-sub">
              Mohon tunggu sebentar
            </div>
          </div>
        </div>
      )}
    </>
  );
}
