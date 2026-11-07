import { useEffect } from "react";
import { useRouter } from "next/router";
import { useActiveProfileId, useProfiles } from "../../lib/store";

export default function ProfileRedirect() {
  const router = useRouter();
  const [profiles] = useProfiles();
  const [activeProfileId] = useActiveProfileId();

  useEffect(() => {
    const active = (profiles || []).find((p) => p.id === activeProfileId) || profiles?.[0];
    const username = (active?.name || "jayesh").toLowerCase().replace(/\s+/g, "");
    router.replace(`/u/${username}`);
  }, [router, profiles, activeProfileId]);

  return null;
}
