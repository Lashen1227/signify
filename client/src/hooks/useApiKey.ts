import { useCallback, useEffect, useState } from "react";
import { validateApiKey } from "@/services/signifyApi";

const STORAGE_KEY = "signify:api-key";

function readStoredKey(): string | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(readStoredKey);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const isConfigured = apiKey !== null && apiKey.length > 0;

  const validate = useCallback(
    async (key?: string): Promise<boolean> => {
      const target = key ?? apiKey;
      if (!target) {
        setIsValid(false);
        return false;
      }

      setIsValidating(true);
      try {
        const result = await validateApiKey(target);
        setIsValid(result.valid);
        return result.valid;
      } catch {
        setIsValid(false);
        return false;
      } finally {
        setIsValidating(false);
      }
    },
    [apiKey],
  );

  const saveKey = useCallback(
    async (key: string): Promise<boolean> => {
      const trimmed = key.trim();
      if (!trimmed) return false;

      setApiKey(trimmed);
      try {
        localStorage.setItem(STORAGE_KEY, trimmed);
      } catch {
        // localStorage may be full or unavailable
      }

      const valid = await validate(trimmed);
      return valid;
    },
    [validate],
  );

  const removeKey = useCallback(() => {
    setApiKey(null);
    setIsValid(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (isConfigured && isValid === null) {
      void validate();
    }
  }, [isConfigured, isValid, validate]);

  return {
    apiKey,
    isConfigured,
    isValid,
    isValidating,
    saveKey,
    removeKey,
    validate,
  };
}
