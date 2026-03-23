"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { listWorkspaces } from "@/lib/api";

export default function AppIndex() {
  const router = useRouter();
  const { user } = useAuth();
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!user || resolved) return;

    listWorkspaces()
      .then((res) => {
        const list = Array.isArray(res) ? res : res.data || [];
        if (list.length > 0) {
          router.replace(`/${list[0].name}/home`);
        } else {
          router.replace("/admin/workspaces");
        }
      })
      .catch(() => {
        router.replace("/admin/workspaces");
      })
      .finally(() => setResolved(true));
  }, [user, router, resolved]);

  return null;
}
