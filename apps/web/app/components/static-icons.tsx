"use client";

import { ArrowRight, MapPin } from "@phosphor-icons/react";

export function ArrowRightIcon({ className = "" }: { className?: string }) {
  return <ArrowRight size={16} weight="bold" className={className} />;
}

export function MapPinIcon({ className = "" }: { className?: string }) {
  return <MapPin size={15} weight="fill" className={className} />;
}
