import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AccountInfo } from "@azure/msal-browser";
import { useProperty } from "./PropertyContext";
import {
  getSignedInMicrosoftAccount,
  isOneDriveSyncConfigured,
  oneDriveEmbedUrl,
  oneDriveShareUrl,
  signInToMicrosoft,
  signOutOfMicrosoft,
  uploadSharedExcelWorkbook,
} from "../services/oneDriveExcel";

type SyncStatus = "idle" | "connecting" | "syncing" | "synced" | "error";

interface OneDriveSyncContextValue {
  isConfigured: boolean;
  accountName: string | null;
  status: SyncStatus;
  lastSyncedAt: Date | null;
  error: string | null;
  workbookUrl: string;
  embedUrl: string;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const OneDriveSyncContext = createContext<
  OneDriveSyncContextValue | undefined
>(undefined);

export const OneDriveSyncProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const {
    buildings,
    flats,
    statements,
    buildingExpenses,
    maintenanceRequests,
  } = useProperty();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasRestoredAccount = useRef(false);

  const workbookData = useMemo(
    () => ({
      buildings,
      flats,
      statements,
      buildingExpenses,
      maintenanceRequests,
    }),
    [
      buildings,
      flats,
      statements,
      buildingExpenses,
      maintenanceRequests,
    ],
  );

  const performSync = useCallback(
    async (activeAccount: AccountInfo) => {
      setStatus("syncing");
      setError(null);

      try {
        await uploadSharedExcelWorkbook(activeAccount, workbookData);
        setLastSyncedAt(new Date());
        setStatus("synced");
      } catch (syncError) {
        setError(
          syncError instanceof Error
            ? syncError.message
            : "The OneDrive workbook could not be synchronized.",
        );
        setStatus("error");
      }
    },
    [workbookData],
  );

  useEffect(() => {
    if (!isOneDriveSyncConfigured || hasRestoredAccount.current) return;
    hasRestoredAccount.current = true;

    getSignedInMicrosoftAccount()
      .then((restoredAccount) => setAccount(restoredAccount))
      .catch(() => setAccount(null));
  }, []);

  useEffect(() => {
    if (!account) return;

    const timer = window.setTimeout(() => {
      void performSync(account);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [account, performSync]);

  const connect = async () => {
    setStatus("connecting");
    setError(null);

    try {
      const signedInAccount = await signInToMicrosoft();
      setAccount(signedInAccount);
    } catch (connectionError) {
      setError(
        connectionError instanceof Error
          ? connectionError.message
          : "Microsoft sign-in was not completed.",
      );
      setStatus("error");
    }
  };

  const disconnect = async () => {
    if (account) {
      await signOutOfMicrosoft(account);
    }

    setAccount(null);
    setStatus("idle");
    setLastSyncedAt(null);
    setError(null);
  };

  const syncNow = async () => {
    if (account) {
      await performSync(account);
    }
  };

  return (
    <OneDriveSyncContext.Provider
      value={{
        isConfigured: isOneDriveSyncConfigured,
        accountName: account?.name || account?.username || null,
        status,
        lastSyncedAt,
        error,
        workbookUrl: oneDriveShareUrl,
        embedUrl: oneDriveEmbedUrl,
        connect,
        disconnect,
        syncNow,
      }}
    >
      {children}
    </OneDriveSyncContext.Provider>
  );
};

export const useOneDriveSync = () => {
  const context = useContext(OneDriveSyncContext);

  if (!context) {
    throw new Error(
      "useOneDriveSync must be used within a OneDriveSyncProvider",
    );
  }

  return context;
};
