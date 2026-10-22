export default function Loading() {
  return (
    <div
      style={{
        minHeight: "75vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          display: "grid",
          placeItems: "center",
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
      <div
        style={{
          fontFamily: "var(--font-fraunces), serif",
          fontSize: "15px",
          fontWeight: 750,
          color: "var(--navy)",
          letterSpacing: "0.2px",
        }}
      >
        Memuat halaman...
      </div>
    </div>
  );
}

