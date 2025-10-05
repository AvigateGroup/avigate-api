// ============================================
// src/utils/device.util.ts
// ============================================
import { Request } from 'express';
import * as crypto from 'crypto';

export interface ParsedDeviceInfo {
  fingerprint: string;
  deviceInfo: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  platform: 'ios' | 'android' | 'web' | 'unknown';
  ipAddress: string;
}

export function parseDeviceInfo(req: Request, deviceInfo?: string): ParsedDeviceInfo {
  const userAgent = req.get('User-Agent') || 'unknown';
  const ipAddress = (req.ip || req.connection.remoteAddress || 'unknown').replace('::ffff:', '');

  // Generate fingerprint
  const fingerprintBase = `${userAgent}-${ipAddress}-${deviceInfo || ''}`;
  const fingerprint = crypto.createHash('sha256').update(fingerprintBase).digest('hex');

  // Detect device type
  let deviceType: ParsedDeviceInfo['deviceType'] = 'unknown';
  if (/mobile/i.test(userAgent)) deviceType = 'mobile';
  else if (/tablet|ipad/i.test(userAgent)) deviceType = 'tablet';
  else if (/desktop|windows|mac|linux/i.test(userAgent)) deviceType = 'desktop';

  // Detect platform
  let platform: ParsedDeviceInfo['platform'] = 'unknown';
  if (/iphone|ipad|ipod/i.test(userAgent)) platform = 'ios';
  else if (/android/i.test(userAgent)) platform = 'android';
  else platform = 'web';

  return {
    fingerprint,
    deviceInfo: deviceInfo || userAgent,
    deviceType,
    platform,
    ipAddress,
  };
}
