import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private firebaseService: FirebaseService) {}

  async uploadFile(
    path: string,
    data: Buffer | string,
    contentType?: string,
  ): Promise<string> {
    try {
      const bucket = this.firebaseService.storage.bucket();
      const file = bucket.file(path);

      await file.save(data, {
        contentType: contentType || 'application/octet-stream',
        metadata: {
          firebaseStorageDownloadTokens: this.generateToken(),
        },
      });

      this.logger.log(`File uploaded: ${path}`);
      return path;
    } catch (error) {
      this.logger.error(`Error uploading file to ${path}:`, error);
      throw error;
    }
  }

  async getSignedUrl(path: string, expiresInHours: number = 1): Promise<string> {
    try {
      const bucket = this.firebaseService.storage.bucket();
      const file = bucket.file(path);

      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresInHours * 60 * 60 * 1000,
      });

      return url;
    } catch (error) {
      this.logger.error(`Error getting signed URL for ${path}:`, error);
      throw error;
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      const bucket = this.firebaseService.storage.bucket();
      const file = bucket.file(path);

      await file.delete();
      this.logger.log(`File deleted: ${path}`);
    } catch (error) {
      this.logger.error(`Error deleting file ${path}:`, error);
      throw error;
    }
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      const bucket = this.firebaseService.storage.bucket();
      const file = bucket.file(path);

      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      this.logger.error(`Error checking file existence ${path}:`, error);
      return false;
    }
  }

  private generateToken(): string {
    return Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
  }
}
