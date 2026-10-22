import React from "react";

export interface VehicleTypeIconProps {
  type?: "Motor" | "Mobil" | string | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}

/**
 * Komponen Icon Kendaraan untuk Motor & Mobil
 * Menggunakan asset Logo/Icon Motor.png dan Logo/Icon Mobil.png
 */
export default function VehicleTypeIcon({
  type,
  size = 32,
  className,
  style,
  alt,
}: VehicleTypeIconProps) {
  const isMobil = type?.toLowerCase() === "mobil";
  const iconSrc = isMobil ? "/logo/icon-mobil.png" : "/logo/icon-motor.png";
  const defaultAlt = isMobil ? "Mobil" : "Motor";

  return (
    <img
      src={iconSrc}
      alt={alt || defaultAlt}
      width={size}
      height={size}
      className={className}
      style={{
        objectFit: "contain",
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

