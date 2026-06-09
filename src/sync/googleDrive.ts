export const GOOGLE_DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
export const DRIVE_BACKUP_FILENAME = 'shooting-logbook-backup.json';

const GOOGLE_IDENTITY_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_ENDPOINT = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_AUTHORIZATION_STORAGE_KEY = 'shooting-logbook-google-drive-authorized';
const DRIVE_ACCESS_TOKEN_STORAGE_KEY = 'shooting-logbook-google-drive-access-token';
const ACCESS_TOKEN_EXPIRY_SAFETY_MS = 60_000;

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface StoredAccessToken {
  accessToken: string;
  expiresAt: number;
}

interface GoogleTokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
}

type TokenCallback = (response: TokenResponse) => void;

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: TokenCallback;
          }) => GoogleTokenClient;
          revoke: (token: string, done: () => void) => void;
        };
      };
    };
  }
}

let accessToken: string | null = null;
let tokenClient: GoogleTokenClient | null = null;
let pendingTokenResolver: ((response: TokenResponse) => void) | null = null;

export interface DriveBackupFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

export function isGoogleDriveConfigured(): boolean {
  return Boolean(getGoogleClientId());
}

export function hasGoogleDriveAccessToken(): boolean {
  return Boolean(getValidAccessToken());
}

export function hasStoredGoogleDriveAuthorization(): boolean {
  return window.localStorage.getItem(DRIVE_AUTHORIZATION_STORAGE_KEY) === 'true';
}

export async function connectGoogleDrive(prompt: 'consent' | '' = 'consent'): Promise<string> {
  await loadGoogleIdentityScript();
  const clientId = getGoogleClientId();

  if (!clientId) {
    throw new Error('missing-client-id');
  }

  if (!window.google?.accounts?.oauth2) {
    throw new Error('google-identity-unavailable');
  }

  tokenClient ??= window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: GOOGLE_DRIVE_APPDATA_SCOPE,
    callback: (response) => pendingTokenResolver?.(response)
  });

  const response = await new Promise<TokenResponse>((resolve) => {
    pendingTokenResolver = resolve;
    tokenClient?.requestAccessToken({ prompt });
  });

  pendingTokenResolver = null;

  if (response.error || !response.access_token) {
    throw new Error(response.error_description || response.error || 'google-auth-failed');
  }

  accessToken = response.access_token;
  window.localStorage.setItem(DRIVE_AUTHORIZATION_STORAGE_KEY, 'true');
  storeAccessToken(response.access_token, response.expires_in);
  return accessToken;
}

export async function disconnectGoogleDrive(): Promise<void> {
  window.localStorage.removeItem(DRIVE_AUTHORIZATION_STORAGE_KEY);
  window.localStorage.removeItem(DRIVE_ACCESS_TOKEN_STORAGE_KEY);

  if (!accessToken) {
    return;
  }

  const tokenToRevoke = accessToken;
  accessToken = null;

  await new Promise<void>((resolve) => {
    window.google?.accounts?.oauth2?.revoke(tokenToRevoke, resolve);
    if (!window.google?.accounts?.oauth2) {
      resolve();
    }
  });
}

export async function findDriveBackupFile(token = requireAccessToken()): Promise<DriveBackupFile | null> {
  const query = encodeURIComponent(`name = '${DRIVE_BACKUP_FILENAME}' and trashed = false`);
  const response = await fetch(
    `${DRIVE_FILES_ENDPOINT}?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime)&pageSize=1`,
    { headers: authorizationHeaders(token) }
  );

  await assertDriveResponse(response);
  const body = (await response.json()) as { files?: DriveBackupFile[] };
  return body.files?.[0] ?? null;
}

export async function downloadDriveBackup(token = requireAccessToken()): Promise<string | null> {
  const file = await findDriveBackupFile(token);

  if (!file) {
    return null;
  }

  const response = await fetch(`${DRIVE_FILES_ENDPOINT}/${file.id}?alt=media`, {
    headers: authorizationHeaders(token)
  });

  await assertDriveResponse(response);
  return response.text();
}

export async function uploadDriveBackup(content: string, token = requireAccessToken()): Promise<DriveBackupFile> {
  const existingFile = await findDriveBackupFile(token);
  const metadata = {
    name: DRIVE_BACKUP_FILENAME,
    mimeType: 'application/json',
    parents: existingFile ? undefined : ['appDataFolder']
  };
  const boundary = `shooting-logbook-${crypto.randomUUID()}`;
  const multipartBody = createMultipartBody(boundary, metadata, content);
  const endpoint = existingFile
    ? `${DRIVE_UPLOAD_ENDPOINT}/${existingFile.id}?uploadType=multipart&fields=id,name,modifiedTime`
    : `${DRIVE_UPLOAD_ENDPOINT}?uploadType=multipart&fields=id,name,modifiedTime`;
  const response = await fetch(endpoint, {
    method: existingFile ? 'PATCH' : 'POST',
    headers: {
      ...authorizationHeaders(token),
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartBody
  });

  await assertDriveResponse(response);
  return response.json() as Promise<DriveBackupFile>;
}

function getGoogleClientId(): string {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
}

function requireAccessToken(): string {
  const token = getValidAccessToken();

  if (!token) {
    throw new Error('not-connected');
  }

  return token;
}

function getValidAccessToken(): string | null {
  if (accessToken) return accessToken;

  const storedToken = readStoredAccessToken();
  if (!storedToken) return null;

  accessToken = storedToken;
  return accessToken;
}

function storeAccessToken(token: string, expiresInSeconds = 3600): void {
  const expiresAt = Date.now() + Math.max(0, expiresInSeconds * 1000 - ACCESS_TOKEN_EXPIRY_SAFETY_MS);
  const storedToken: StoredAccessToken = { accessToken: token, expiresAt };
  window.localStorage.setItem(DRIVE_ACCESS_TOKEN_STORAGE_KEY, JSON.stringify(storedToken));
}

function readStoredAccessToken(): string | null {
  const rawValue = window.localStorage.getItem(DRIVE_ACCESS_TOKEN_STORAGE_KEY);
  if (!rawValue) return null;

  try {
    const storedToken = JSON.parse(rawValue) as Partial<StoredAccessToken>;
    if (!storedToken.accessToken || !storedToken.expiresAt || storedToken.expiresAt <= Date.now()) {
      window.localStorage.removeItem(DRIVE_ACCESS_TOKEN_STORAGE_KEY);
      return null;
    }

    return storedToken.accessToken;
  } catch {
    window.localStorage.removeItem(DRIVE_ACCESS_TOKEN_STORAGE_KEY);
    return null;
  }
}

function authorizationHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`
  };
}

async function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_IDENTITY_SCRIPT_URL}"]`);

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('google-identity-script-failed')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_IDENTITY_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('google-identity-script-failed'));
    document.head.appendChild(script);
  });
}

function createMultipartBody(boundary: string, metadata: Record<string, unknown>, content: string): string {
  return [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    content,
    `--${boundary}--`
  ].join('\r\n');
}

async function assertDriveResponse(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  const body = await response.text();
  throw new Error(body || `drive-request-failed-${response.status}`);
}
