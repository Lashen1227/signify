import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AuthProvider as AsgardeoAuthProvider,
  useAuthContext,
  type AuthReactConfig,
} from "@asgardeo/auth-react";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string | null;
  signIn: () => void;
  signOut: () => void;
  getIdToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoading: true,
  username: null,
  signIn: () => {},
  signOut: () => {},
  getIdToken: () => Promise.reject(new Error("Auth not initialized")),
});

const AuthSetContext = createContext<
  React.Dispatch<React.SetStateAction<AuthContextValue>>
>(() => {});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authValue, setAuthValue] = useState<AuthContextValue>({
    isAuthenticated: false,
    isLoading: true,
    username: null,
    signIn: () => {},
    signOut: () => {},
    getIdToken: () => Promise.reject(new Error("Auth not initialized")),
  });

  const config = useMemo<AuthReactConfig>(
    () => ({
      clientID: import.meta.env.VITE_ASGARDEO_CLIENT_ID,
      baseUrl: import.meta.env.VITE_ASGARDEO_BASE_URL,
      signInRedirectURL:
        import.meta.env.VITE_ASGARDEO_REDIRECT_URL || "http://localhost:5173",
      signOutRedirectURL:
        import.meta.env.VITE_ASGARDEO_REDIRECT_URL || "http://localhost:5173",
      scope: (import.meta.env.VITE_ASGARDEO_SCOPE || "openid profile")
        .split(" ")
        .map((s: string) => s.trim())
        .filter(Boolean),
      skipRedirectCallback: false,
      disableTrySignInSilently: true,
      disableAutoSignIn: false,
    }),
    [],
  );

  const bridgeContent = useMemo(
    () => <AuthBridge>{children}</AuthBridge>,
    [children],
  );

  return (
    <AuthContext.Provider value={authValue}>
      <AuthSetContext.Provider value={setAuthValue}>
        <AsgardeoAuthProvider config={config} fallback={bridgeContent}>
          {bridgeContent}
        </AsgardeoAuthProvider>
      </AuthSetContext.Provider>
    </AuthContext.Provider>
  );
}

function AuthBridge({ children }: { children: React.ReactNode }) {
  const auth = useAuthContext();
  const setAuth = useContext(AuthSetContext);
  const [forceReady, setForceReady] = useState(false);
  const lastSub = useRef<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setForceReady(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const sub = auth.state.sub || null;

    if (!forceReady && auth.state.isLoading && !auth.state.isAuthenticated) {
      return;
    }

    if (lastSub.current === sub && lastSub.current !== null) {
      return;
    }

    lastSub.current = sub;

    setAuth({
      isAuthenticated: auth.state.isAuthenticated,
      isLoading: false,
      username: auth.state.displayName || auth.state.username || null,
      signIn: () => {
        auth.signIn().catch((e) => console.error("Sign-in failed:", e));
      },
      signOut: () => {
        auth.signOut().catch((e) => console.error("Sign-out failed:", e));
      },
      getIdToken: () => auth.getIDToken(),
    });
  }, [auth, forceReady, setAuth]);

  return <>{children}</>;
}

export function useAuth() {
  return useContext(AuthContext);
}
