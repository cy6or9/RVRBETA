// /src/pages/_app.js
import "@/styles/globals.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/context/AuthContext";
import { UserProfileProvider } from "@/context/UserProfileContext";
import { useEffect } from "react";
import { useUserProfile } from "@/context/UserProfileContext";

function ServiceWorkerRegistration() {
  const { profile } = useUserProfile();
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    const enabled = profile?.offlineMode?.enabled;
    if (process.env.NODE_ENV === "production" && enabled && "serviceWorker" in navigator) {
      const register = () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      };
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register);
    }
  }, [profile?.offlineMode?.enabled]);
  
  return null;
}

export default function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <UserProfileProvider>
        <QueryClientProvider client={queryClient}>
          <ServiceWorkerRegistration />
          <Component {...pageProps} />
        </QueryClientProvider>
      </UserProfileProvider>
    </AuthProvider>
  );
}
