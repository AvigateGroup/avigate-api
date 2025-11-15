// src/modules/upload/upload.service.ts (FIXED - TypeScript Errors Resolved)
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { logger } from '@/utils/logger.util';

@Injectable()
export class UploadService {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const bucketName = this.configService.get<string>('AWS_S3_BUCKET');

    // Validate all required config values
    if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error('Missing required AWS configuration');
    }

    // FIXED: Assign to class properties after validation ensures they're strings
    this.region = region;
    this.bucketName = bucketName;

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Upload a file from multer
   */
  async uploadFile(file: Express.Multer.File, folder: string = 'uploads'): Promise<string> {
    this.validateFile(file);

    const fileExtension = path.extname(file.originalname);
    const fileName = `${folder}/${uuidv4()}${fileExtension}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
          // ACL removed - use bucket policy instead
        }),
      );

      // FIXED: Use region in URL construction
      const fileUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;
      logger.info(`File uploaded successfully: ${fileUrl}`);
      return fileUrl;
    } catch (error) {
      logger.error('File upload error:', error);
      throw new BadRequestException('Failed to upload file');
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder: string = 'uploads',
  ): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }

  /**
   * Upload from buffer (for QR codes and programmatically generated files)
   * ADDED: This method is needed for QR code generation
   */
  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    folder: string = 'uploads',
  ): Promise<string> {
    const fullFileName = `${folder}/${fileName}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fullFileName,
          Body: buffer,
          ContentType: mimeType,
        }),
      );

      const fileUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fullFileName}`;
      logger.info(`Buffer uploaded successfully: ${fileUrl}`, {
        size: buffer.length,
        type: mimeType,
      });
      return fileUrl;
    } catch (error) {
      logger.error('Buffer upload error:', error);
      throw new BadRequestException('Failed to upload buffer');
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(fileUrl: string): Promise<void> {
    const fileName = fileUrl.split('.com/')[1];

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
        }),
      );
      logger.info(`File deleted successfully: ${fileName}`);
    } catch (error) {
      logger.error('File deletion error:', error);
      throw new BadRequestException('Failed to delete file');
    }
  }

  /**
   * Validate uploaded file
   * UPDATED: Added skipValidation parameter for programmatically created files
   */
  private validateFile(file: Express.Multer.File, skipValidation: boolean = false): void {
    if (skipValidation) {
      return;
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/jpg', // Added for compatibility
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Only images are allowed.`,
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }
  }

  /**
   * Helper: Get file extension from mime type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };

    return mimeToExt[mimeType] || '.bin';
  }
}