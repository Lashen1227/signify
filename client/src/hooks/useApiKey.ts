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
  const [validationError, setValidationError] = useState<string | null>(null);

  const isConfigured = apiKey !== null && apiKey.length > 0;

  const saveKey = useCallback(async (key: string): Promise<boolean> => {
    const trimmed = key.trim();
    if (!trimmed) return false;

    setIsValidating(true);
    setValidationError(null);
    try {
      const result = await validateApiKey(trimmed);
      if (result.valid) {
        setApiKey(trimmed);
        setIsValid(true);
        setValidationError(null);
        try {
          localStorage.setItem(STORAGE_KEY, trimmed);
        } catch {
          // localStorage may be full or unavailable
        }
        return true;
      } else {
        setIsValid(false);
        setValidationError(result.message);
        return false;
      }
    } catch {
      setIsValid(false);
      setValidationError("Could not reach validation server");
      return false;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const removeKey = useCallback(() => {
    setApiKey(null);
    setIsValid(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const markInvalid = useCallback(() => {
    setIsValid(false);
  }, []);

  return {
    apiKey,
    isConfigured,
    isValid,
    isValidating,
    validationError,
    saveKey,
    removeKey,
    markInvalid,
  };
}
