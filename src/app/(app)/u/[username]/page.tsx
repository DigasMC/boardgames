"use client";

import { use } from "react";
import { PublicProfileView } from "@/components/PublicProfileView";

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  return <PublicProfileView username={username} />;
}
