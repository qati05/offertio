"use client";

import LifetimeCheckout from "@/components/LifetimeCheckout";
import type { Land } from "@/lib/types";

interface UpgradeScreenProps {
  email?: string;
  land?: Land;
  /** ISO timestamp when the user's trial ends (null if no trial). */
  trialEndsAt?: string | null;
  onClose?: () => void;
}

export default function UpgradeScreen({ trialEndsAt, onClose }: UpgradeScreenProps) {
  return <LifetimeCheckout trialEndsAt={trialEndsAt} onClose={onClose} />;
}
