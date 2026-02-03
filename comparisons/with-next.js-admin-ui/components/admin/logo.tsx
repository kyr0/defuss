"use client";

import Image from "next/image";
import Link from "next/link";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2">
      <Image
        src="/defuss_mascott.png"
        alt="defuss"
        width={size}
        height={size}
        priority
      />
      <span className="text-sm font-semibold tracking-tight">defuss</span>
    </Link>
  );
}
