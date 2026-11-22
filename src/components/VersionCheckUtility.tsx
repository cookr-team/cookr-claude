import React, { useEffect, useCallback } from "react";

// Retrieve build timestamp compiled at build time
const LOCAL_BUILD_TIMESTAMP = process.env.BUILD_TIMESTAMP || "dev";

export const VersionCheckUtility: React.FC = () => {
  // Disable in development or preview mode to avoid reload loops
  if (import.meta.env.DEV || LOCAL_BUILD_TIMESTAMP === "dev") {
    return null;
  }

  // Perform automatic update silently without modal interruption
  const triggerAutoUpdate = useCallback(async () => {
    // Avoid rapid repeated reloads (e.g. within 15s) in case of network or cache discrepancy
    const lastReload = sessionStorage.getItem("cookr_last_auto_update");
    if (lastReload && Date.now() - parseInt(lastReload, 10) < 15000) {
      console.log("[VersionCheck] Auto-update skip: recently updated in this session.");
      return;
    }
    sessionStorage.setItem("cookr_last_auto_update", Date.now().toString());

    console.log("[VersionCheck] Auto-updating application to latest version...");
    try {
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
        
        // Clear caches to guarantee fresh load
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
        }
      }
    } catch (e) {
      console.warn("[VersionCheck] Erro ao preparar auto-actualização de cache:", e);
    }

    // Reload browser to get latest bundle automatically
    setTimeout(() => {
      window.location.reload();
    }, 400);
  }, []);

  // Main check version logic
  const checkVersion = useCallback(async () => {
    try {
      // Append cache buster to bypass service worker/browser caches for version metadata
      const response = await fetch(`/version.json?t=${Date.now()}`);
      if (!response.ok) throw new Error("Falha ao obter ficheiro de versão");
      
      const data = await response.json();
      const currentRemote = data.timestamp;

      if (currentRemote && LOCAL_BUILD_TIMESTAMP !== "dev" && currentRemote !== LOCAL_BUILD_TIMESTAMP) {
        console.log(`[VersionCheck] Nova versão detectada. Local: ${LOCAL_BUILD_TIMESTAMP} | Remota: ${currentRemote}. Auto-atualizando...`);
        triggerAutoUpdate();
      }
    } catch (err) {
      console.warn("[VersionCheck] Erro ao verificar versão:", err);
    }
  }, [triggerAutoUpdate]);

  // Set up polling for version updates
  useEffect(() => {
    // 1. Check version on mount
    checkVersion();

    // 2. Poll every 5 minutes
    const interval = setInterval(() => {
      checkVersion();
    }, 300000);

    return () => {
      clearInterval(interval);
    };
  }, [checkVersion]);

  // Render nothing to guarantee no modal popups or user interruptions
  return null;
};

