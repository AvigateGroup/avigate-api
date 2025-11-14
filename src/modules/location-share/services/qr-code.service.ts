// src/modules/location-share/services/qr-code.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { logger } from '@/utils/logger.util';

export interface QRCodeOptions {
  size?: number; // Width/height in pixels (default: 300)
  margin?: number; // Margin in pixels (default: 4)
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'; // L=7%, M=15%, Q=25%, H=30%
  color?: {
    dark?: string; // Dark modules color (default: #000000)
    light?: string; // Light modules color (default: #FFFFFF)
  };
}

export interface BrandedQROptions extends QRCodeOptions {
  includeLogo?: boolean;
  includeLocationName?: boolean;
  includeOwnerName?: boolean;
}

@Injectable()
export class QRCodeService {
  constructor(private configService: ConfigService) {}

  /**
   * Generate basic QR code as data URL
   */
  async generateQRCode(data: string, options?: QRCodeOptions): Promise<string> {
    try {
      const qrOptions = {
        width: options?.size || 300,
        margin: options?.margin || 4,
        errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
        color: {
          dark: options?.color?.dark || '#000000',
          light: options?.color?.light || '#FFFFFF',
        },
      };

      const dataUrl = await QRCode.toDataURL(data, qrOptions);
      logger.info('QR code generated successfully', { dataLength: data.length });
      return dataUrl;
    } catch (error) {
      logger.error('Failed to generate QR code:', error);
      throw new Error(`QR code generation failed: ${error.message}`);
    }
  }

  /**
   * Generate QR code as buffer (for saving to file or uploading to S3)
   */
  async generateQRCodeBuffer(data: string, options?: QRCodeOptions): Promise<Buffer> {
    try {
      const qrOptions = {
        width: options?.size || 300,
        margin: options?.margin || 4,
        errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
        color: {
          dark: options?.color?.dark || '#000000',
          light: options?.color?.light || '#FFFFFF',
        },
      };

      const buffer = await QRCode.toBuffer(data, qrOptions);
      logger.info('QR code buffer generated successfully', { size: buffer.length });
      return buffer;
    } catch (error) {
      logger.error('Failed to generate QR code buffer:', error);
      throw new Error(`QR code buffer generation failed: ${error.message}`);
    }
  }

  /**
   * Generate branded QR code for Avigate with custom styling
   */
  async generateBrandedQRCode(
    shareUrl: string,
    metadata?: {
      locationName?: string;
      ownerName?: string;
    },
    options?: BrandedQROptions,
  ): Promise<string> {
    try {
      // Use Avigate brand colors
      const brandedOptions: QRCodeOptions = {
        size: options?.size || 400,
        margin: options?.margin || 4,
        errorCorrectionLevel: 'H', // High error correction for logo overlay
        color: {
          dark: '#86B300', // Avigate green
          light: '#FFFFFF',
        },
      };

      const qrDataUrl = await this.generateQRCode(shareUrl, brandedOptions);

      // If including branding, we'd need canvas manipulation here
      // For now, return the styled QR code
      // Future enhancement: Add Avigate logo in center using canvas

      logger.info('Branded QR code generated', {
        shareUrl,
        locationName: metadata?.locationName,
      });

      return qrDataUrl;
    } catch (error) {
      logger.error('Failed to generate branded QR code:', error);
      throw new Error(`Branded QR code generation failed: ${error.message}`);
    }
  }

  /**
   * Generate QR code for location share with embedded data
   */
  async generateLocationShareQR(shareData: {
    shareUrl: string;
    locationName: string;
    ownerName: string;
    latitude?: number;
    longitude?: number;
  }): Promise<{
    qrCodeDataUrl: string;
    qrCodeBuffer: Buffer;
  }> {
    try {
      // Primary data is the share URL
      const qrData = shareData.shareUrl;

      // Generate both data URL (for web display) and buffer (for storage/email)
      const [dataUrl, buffer] = await Promise.all([
        this.generateBrandedQRCode(qrData, {
          locationName: shareData.locationName,
          ownerName: shareData.ownerName,
        }),
        this.generateQRCodeBuffer(qrData, {
          size: 400,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#86B300',
            light: '#FFFFFF',
          },
        }),
      ]);

      logger.info('Location share QR codes generated', {
        locationName: shareData.locationName,
        owner: shareData.ownerName,
      });

      return {
        qrCodeDataUrl: dataUrl,
        qrCodeBuffer: buffer,
      };
    } catch (error) {
      logger.error('Failed to generate location share QR:', error);
      throw new Error(`Location share QR generation failed: ${error.message}`);
    }
  }

  /**
   * Generate QR code for event with event-specific styling
   */
  async generateEventQR(eventData: {
    shareUrl: string;
    eventName: string;
    locationName: string;
    eventDate: Date;
  }): Promise<string> {
    try {
      // Event QR codes can use different styling
      const eventOptions: QRCodeOptions = {
        size: 500,
        margin: 4,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#86B300',
          light: '#FFFFFF',
        },
      };

      const qrDataUrl = await this.generateQRCode(eventData.shareUrl, eventOptions);

      logger.info('Event QR code generated', {
        eventName: eventData.eventName,
        eventDate: eventData.eventDate,
      });

      return qrDataUrl;
    } catch (error) {
      logger.error('Failed to generate event QR code:', error);
      throw new Error(`Event QR code generation failed: ${error.message}`);
    }
  }

  /**
   * Generate printable QR code with text labels
   * Returns HTML that can be converted to PDF
   */
  generatePrintableQRHTML(qrDataUrl: string, metadata: {
    locationName: string;
    ownerName: string;
    description?: string;
    eventDate?: Date;
  }): string {
    const eventInfo = metadata.eventDate
      ? `
      <div style="margin-top: 16px; padding: 12px; background-color: #f8f9fa; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; color: #6c757d; font-weight: 600;">EVENT DATE</p>
        <p style="margin: 4px 0 0 0; font-size: 16px; color: #333;">
          ${new Date(metadata.eventDate).toLocaleString('en-NG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })}
        </p>
      </div>
      `
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Avigate - ${metadata.locationName}</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none; }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          .qr-container {
            text-align: center;
            background: white;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .logo {
            margin-bottom: 24px;
          }
          .qr-code {
            max-width: 400px;
            width: 100%;
            height: auto;
            margin: 24px auto;
          }
          .location-info {
            margin-top: 24px;
            text-align: left;
          }
          .location-name {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-bottom: 8px;
          }
          .owner-name {
            font-size: 16px;
            color: #6c757d;
            margin-bottom: 16px;
          }
          .description {
            font-size: 14px;
            color: #555;
            line-height: 1.6;
            margin-bottom: 16px;
          }
          .instructions {
            background-color: #e7f3ff;
            border-left: 4px solid #86B300;
            padding: 16px;
            border-radius: 4px;
            margin-top: 24px;
          }
          .instructions-title {
            font-size: 14px;
            font-weight: 600;
            color: #084298;
            margin-bottom: 8px;
          }
          .instructions-text {
            font-size: 13px;
            color: #084298;
            line-height: 1.6;
            margin: 0;
          }
          @media print {
            .qr-container {
              box-shadow: none;
              border: 2px solid #e9ecef;
            }
          }
        </style>
      </head>
      <body>
        <div class="qr-container">
          <div class="logo">
            <svg width="120" height="40" viewBox="0 0 120 40" fill="#86B300">
              <text x="10" y="30" font-family="Arial, sans-serif" font-size="24" font-weight="bold">Avigate</text>
            </svg>
          </div>
          
          <img src="${qrDataUrl}" alt="QR Code" class="qr-code">
          
          <div class="location-info">
            <div class="location-name">${metadata.locationName}</div>
            <div class="owner-name">Shared by ${metadata.ownerName}</div>
            ${metadata.description ? `<div class="description">${metadata.description}</div>` : ''}
            ${eventInfo}
          </div>
          
          <div class="instructions">
            <div class="instructions-title">📱 How to Use This QR Code:</div>
            <p class="instructions-text">
              1. Open your phone's camera app<br>
              2. Point it at this QR code<br>
              3. Tap the notification that appears<br>
              4. Get step-by-step directions using local transport!
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Validate QR code data before generation
   */
  validateQRData(data: string): { valid: boolean; error?: string } {
    if (!data || data.trim().length === 0) {
      return { valid: false, error: 'QR code data cannot be empty' };
    }

    if (data.length > 2953) {
      // Max data capacity for QR code with error correction level M
      return {
        valid: false,
        error: 'Data too large for QR code (max 2953 characters)',
      };
    }

    return { valid: true };
  }
}