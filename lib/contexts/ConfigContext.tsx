"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface ConfigContextValue {
  registryUrl: string;
  loading: boolean;
}

const ConfigContext = createContext<ConfigContextValue>({
  registryUrl: "",
  loading: true,
});

export function useConfig() {
  return useContext(ConfigContext);
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [registryUrl, setRegistryUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/config.json")
      .then((r) => r.json())
      .then((data) => {
        setRegistryUrl(data.registryUrl);
      })
      .catch(() => {
        const fallback =
          process.env.NEXT_PUBLIC_REGISTRY_URL || "http://localhost:8080";
        setRegistryUrl(fallback);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <ConfigContext.Provider value={{ registryUrl, loading }}>
      {children}
    </ConfigContext.Provider>
  );
}
