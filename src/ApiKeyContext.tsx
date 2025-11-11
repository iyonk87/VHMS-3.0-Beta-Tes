import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

const API_KEY_STORAGE_KEY = 'vhms_user_api_key';

interface ApiKeyContextType {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export const ApiKeyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [apiKey, setApiKeyState] = useState<string | null>(() => {
    // Initialize state from sessionStorage
    return sessionStorage.getItem(API_KEY_STORAGE_KEY);
  });

  const setApiKey = (key: string | null) => {
    setApiKeyState(key);
    if (key) {
      sessionStorage.setItem(API_KEY_STORAGE_KEY, key);
      console.log("[VHMS Auth]: Kunci API disimpan ke sessionStorage.");
    } else {
      sessionStorage.removeItem(API_KEY_STORAGE_KEY);
      console.log("[VHMS Auth]: Kunci API dihapus dari sessionStorage.");
    }
  };
  
  return (
    <ApiKeyContext.Provider value={{ apiKey, setApiKey }}>
      {children}
    </ApiKeyContext.Provider>
  );
};

export const useApiKey = (): ApiKeyContextType => {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error('useApiKey must be used within an ApiKeyProvider');
  }
  return context;
};