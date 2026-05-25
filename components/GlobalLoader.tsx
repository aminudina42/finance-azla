"use client";

import { useEffect, useState } from "react";

interface GlobalLoaderProps {
  isNavigating: boolean;
  isMutating: boolean;
}

export default function GlobalLoader({ isNavigating, isMutating }: GlobalLoaderProps) {
  const active = isNavigating || isMutating;
  const [visible, setVisible] = useState(false);

  // Gunakan jeda singkat sebelum menampilkan spinner glassmorphic agar tidak flickering untuk aksi yang sangat cepat
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (active) {
      timer = setTimeout(() => {
        setVisible(true);
      }, 80); // jeda 80ms
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

      {/* Overlay glassmorphism untuk memblokir interaksi klik berulang */}
      {visible && (
        <div className="global-loader-overlay">
          <div className="global-loader-container">
            <div className="global-loader-spinner">
              <span className="global-loader-emoji">
                {isMutating ? "💾" : "💳"}
              </span>
            </div>
            <div className="global-loader-text">
              {isMutating ? "Menyimpan data..." : "Memuat halaman..."}
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
