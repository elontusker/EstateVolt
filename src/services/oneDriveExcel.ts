import {
  AccountInfo,
  PublicClientApplication,
} from "@azure/msal-browser";
import {
  Building,
  BuildingExpense,
  Flat,
  FlatMonthlyStatement,
  MaintenanceRequest,
} from "../types";

export const oneDriveShareUrl =
  "https://1drv.ms/x/c/4068D0B2FD7ECFDB/IQCkNYzKQhECTZXff8vXyLJIATGxbz9NriWP8fLyThtxeqs?e=9teKMK";
export const oneDriveEmbedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(oneDriveShareUrl)}`;

const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID?.trim();
const tenantId = import.meta.env.VITE_MICROSOFT_TENANT_ID?.trim() || "common";
const scopes = ["User.Read", "Files.ReadWrite"];

export const isOneDriveSyncConfigured = Boolean(clientId);

const msal = clientId
  ? new PublicClientApplication({
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        redirectUri: window.location.origin,
      },
      cache: {
        cacheLocation: "localStorage",
      },
    })
  : null;

let initialization: Promise<void> | null = null;

const initialize = async () => {
  if (!msal) {
    throw new Error("Microsoft Excel sync has not been configured.");
  }

  if (!initialization) {
    initialization = msal.initialize();
  }

  await initialization;
  return msal;
};

export interface WorkbookData {
  buildings: Building[];
  flats: Flat[];
  statements: FlatMonthlyStatement[];
  buildingExpenses: BuildingExpense[];
  maintenanceRequests: MaintenanceRequest[];
}

const getAccessToken = async (account: AccountInfo) => {
  const client = await initialize();

  try {
    const result = await client.acquireTokenSilent({ account, scopes });
    return result.accessToken;
  } catch {
    const result = await client.acquireTokenPopup({ account, scopes });
    return result.accessToken;
  }
};

const graphRequest = async (
  accessToken: string,
  path: string,
  init?: RequestInit,
) => {
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Microsoft Graph request failed (${response.status}): ${details}`,
    );
  }

  return response.json();
};

const getShareId = (sharingUrl: string) => {
  const base64 = window
    .btoa(sharingUrl)
    .replace(/\//g, "_")
    .replace(/\+/g, "-")
    .replace(/=+$/, "");

  return `u!${base64}`;
};

const createWorkbook = async (data: WorkbookData) => {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  const appendSheet = <T extends object>(name: string, rows: T[]) => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  };

  appendSheet(
    "Billing",
    data.statements.map(({ payments: _payments, attachment, ...statement }) => ({
      ...statement,
      attachmentName: attachment?.name || "",
      attachmentType: attachment?.type || "",
    })),
  );
  appendSheet(
    "Payments",
    data.statements.flatMap((statement) =>
      statement.payments.map((payment) => ({
        ...payment,
        buildingName: statement.buildingName,
        flatNumber: statement.flatNumber,
        tenantName: statement.tenantName,
      })),
    ),
  );
  appendSheet("Flats", data.flats);
  appendSheet("Buildings", data.buildings);
  appendSheet("Expenses", data.buildingExpenses);
  appendSheet("Maintenance", data.maintenanceRequests);

  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as ArrayBuffer;
};

export const getSignedInMicrosoftAccount = async () => {
  if (!msal) return null;
  const client = await initialize();
  return client.getAllAccounts()[0] || null;
};

export const signInToMicrosoft = async () => {
  const client = await initialize();
  const result = await client.loginPopup({
    scopes,
    prompt: "select_account",
  });
  return result.account;
};

export const signOutOfMicrosoft = async (account: AccountInfo) => {
  const client = await initialize();
  await client.logoutPopup({ account });
};

export const uploadSharedExcelWorkbook = async (
  account: AccountInfo,
  data: WorkbookData,
) => {
  const accessToken = await getAccessToken(account);
  const shareId = getShareId(oneDriveShareUrl);
  const sharedItem = await graphRequest(
    accessToken,
    `/shares/${shareId}/driveItem`,
  );
  const targetItem = sharedItem.remoteItem || sharedItem;
  const driveId =
    targetItem.parentReference?.driveId ||
    sharedItem.parentReference?.driveId;

  if (!driveId || !targetItem.id) {
    throw new Error("The shared OneDrive workbook could not be resolved.");
  }

  const workbookBytes = await createWorkbook(data);
  await graphRequest(
    accessToken,
    `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(targetItem.id)}/content`,
    {
      method: "PUT",
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      body: workbookBytes,
    },
  );
};
