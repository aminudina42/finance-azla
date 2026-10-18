"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PosRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dompet");
  }, [router]);

  return null;
}

