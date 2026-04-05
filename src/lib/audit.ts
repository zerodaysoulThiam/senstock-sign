export interface AuditTrail {
  signatureId: string;
  signerName: string;
  signerEmail: string;
  signedAt: string;
  ipAddress: string;
  device: string;
  browser: string;
  os: string;
  method: 'draw' | 'type' | 'upload';
  status: 'signed' | 'pending' | 'rejected';
  documentName: string;
  documentLabel: string;
  pageCount: number;
  signaturePosition: string;
}

export function generateSignatureId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'SIGN-';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export function detectDevice(): { browser: string; os: string; device: string } {
  const ua = navigator.userAgent;

  let browser = 'Navigateur inconnu';
  if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome/')) browser = 'Google Chrome';
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Apple Safari';
  else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';

  let os = 'Système inconnu';
  if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  const device = `${browser} / ${os}`;
  return { browser, os, device };
}

// Generate a unique session fingerprint instead of relying on external IP fetch
export function getSessionFingerprint(): string {
  const nav = navigator;
  const screen = window.screen;
  const raw = [
    nav.userAgent,
    nav.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    new Date().getTimezoneOffset(),
  ].join('|');
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'FP-' + Math.abs(hash).toString(36).toUpperCase();
}

export function getPublicIP(): string {
  // Return session fingerprint instead of making external API call
  return getSessionFingerprint();
}

export function createAuditTrail(params: {
  signerName: string;
  signerEmail: string;
  ipAddress: string;
  method: 'draw' | 'type' | 'upload';
  documentName: string;
  documentLabel: string;
  pageCount: number;
  signaturePosition: string;
}): AuditTrail {
  const { browser, os, device } = detectDevice();
  return {
    signatureId: generateSignatureId(),
    signerName: params.signerName,
    signerEmail: params.signerEmail,
    signedAt: new Date().toISOString(),
    ipAddress: params.ipAddress,
    device,
    browser,
    os,
    method: params.method,
    status: 'signed',
    documentName: params.documentName,
    documentLabel: params.documentLabel,
    pageCount: params.pageCount,
    signaturePosition: params.signaturePosition,
  };
}

export function methodLabel(method: string): string {
  switch (method) {
    case 'draw': return 'Signature dessinée';
    case 'type': return 'Signature tapée';
    case 'upload': return 'Cachet importé';
    default: return method;
  }
}
