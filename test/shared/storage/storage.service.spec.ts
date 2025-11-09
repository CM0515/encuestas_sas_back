import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from '../../../src/shared/storage/storage.service';
import { FirebaseService } from '../../../src/shared/firebase/firebase.service';
import * as admin from 'firebase-admin';

describe('StorageService', () => {
  let service: StorageService;
  let firebaseService: jest.Mocked<FirebaseService>;
  let mockBucket: any;
  let mockFile: any;
  let mockStorage: jest.Mocked<admin.storage.Storage>;

  beforeEach(async () => {
    // Create mock file
    mockFile = {
      save: jest.fn(),
      getSignedUrl: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    };

    // Create mock bucket
    mockBucket = {
      file: jest.fn().mockReturnValue(mockFile),
    };

    // Create mock storage
    mockStorage = {
      bucket: jest.fn().mockReturnValue(mockBucket),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: FirebaseService,
          useValue: {
            storage: mockStorage,
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    firebaseService = module.get(FirebaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    const path = 'uploads/test-file.txt';
    const data = Buffer.from('test data');
    const contentType = 'text/plain';

    it('should upload file successfully with content type', async () => {
      mockFile.save.mockResolvedValue(undefined);

      const result = await service.uploadFile(path, data, contentType);

      expect(result).toBe(path);
      expect(mockStorage.bucket).toHaveBeenCalled();
      expect(mockBucket.file).toHaveBeenCalledWith(path);
      expect(mockFile.save).toHaveBeenCalledWith(data, {
        contentType,
        metadata: {
          firebaseStorageDownloadTokens: expect.any(String),
        },
      });
    });

    it('should upload file with default content type when not specified', async () => {
      mockFile.save.mockResolvedValue(undefined);

      const result = await service.uploadFile(path, data);

      expect(result).toBe(path);
      expect(mockFile.save).toHaveBeenCalledWith(data, {
        contentType: 'application/octet-stream',
        metadata: {
          firebaseStorageDownloadTokens: expect.any(String),
        },
      });
    });

    it('should upload string data', async () => {
      const stringData = 'test string data';
      mockFile.save.mockResolvedValue(undefined);

      const result = await service.uploadFile(path, stringData, contentType);

      expect(result).toBe(path);
      expect(mockFile.save).toHaveBeenCalledWith(stringData, expect.any(Object));
    });

    it('should generate unique download token', async () => {
      mockFile.save.mockResolvedValue(undefined);

      await service.uploadFile(path, data, contentType);

      const call = mockFile.save.mock.calls[0][1];
      expect(call.metadata.firebaseStorageDownloadTokens).toBeTruthy();
      expect(typeof call.metadata.firebaseStorageDownloadTokens).toBe('string');
    });

    it('should generate different tokens for multiple uploads', async () => {
      mockFile.save.mockResolvedValue(undefined);

      await service.uploadFile('file1.txt', data, contentType);
      await service.uploadFile('file2.txt', data, contentType);

      const token1 = mockFile.save.mock.calls[0][1].metadata.firebaseStorageDownloadTokens;
      const token2 = mockFile.save.mock.calls[1][1].metadata.firebaseStorageDownloadTokens;

      expect(token1).not.toBe(token2);
    });

    it('should throw error when upload fails', async () => {
      const error = new Error('Upload failed');
      mockFile.save.mockRejectedValue(error);

      await expect(service.uploadFile(path, data, contentType)).rejects.toThrow('Upload failed');
    });

    it('should log success message', async () => {
      const loggerLogSpy = jest.spyOn((service as any).logger, 'log');
      mockFile.save.mockResolvedValue(undefined);

      await service.uploadFile(path, data, contentType);

      expect(loggerLogSpy).toHaveBeenCalledWith(`File uploaded: ${path}`);
    });

    it('should log error message when upload fails', async () => {
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');
      const error = new Error('Upload error');
      mockFile.save.mockRejectedValue(error);

      await expect(service.uploadFile(path, data, contentType)).rejects.toThrow();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Error uploading file to ${path}:`,
        error,
      );
    });

    it('should handle empty buffer', async () => {
      const emptyBuffer = Buffer.from('');
      mockFile.save.mockResolvedValue(undefined);

      const result = await service.uploadFile(path, emptyBuffer, contentType);

      expect(result).toBe(path);
      expect(mockFile.save).toHaveBeenCalledWith(emptyBuffer, expect.any(Object));
    });

    it('should handle large files', async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      mockFile.save.mockResolvedValue(undefined);

      const result = await service.uploadFile(path, largeBuffer, contentType);

      expect(result).toBe(path);
    });

    it('should handle various content types', async () => {
      const contentTypes = [
        'application/json',
        'image/png',
        'video/mp4',
        'application/pdf',
      ];

      for (const ct of contentTypes) {
        mockFile.save.mockClear();
        mockFile.save.mockResolvedValue(undefined);

        await service.uploadFile(path, data, ct);

        expect(mockFile.save).toHaveBeenCalledWith(
          data,
          expect.objectContaining({ contentType: ct }),
        );
      }
    });

    it('should handle paths with nested directories', async () => {
      const nestedPath = 'uploads/2024/01/documents/file.pdf';
      mockFile.save.mockResolvedValue(undefined);

      const result = await service.uploadFile(nestedPath, data, contentType);

      expect(result).toBe(nestedPath);
      expect(mockBucket.file).toHaveBeenCalledWith(nestedPath);
    });
  });

  describe('getSignedUrl', () => {
    const path = 'uploads/test-file.txt';

    it('should get signed URL with default expiration', async () => {
      const mockUrl = 'https://storage.googleapis.com/signed-url';
      mockFile.getSignedUrl.mockResolvedValue([mockUrl]);

      const result = await service.getSignedUrl(path);

      expect(result).toBe(mockUrl);
      expect(mockStorage.bucket).toHaveBeenCalled();
      expect(mockBucket.file).toHaveBeenCalledWith(path);
      expect(mockFile.getSignedUrl).toHaveBeenCalledWith({
        action: 'read',
        expires: expect.any(Number),
      });
    });

    it('should get signed URL with custom expiration', async () => {
      const mockUrl = 'https://storage.googleapis.com/signed-url';
      const expiresInHours = 24;
      mockFile.getSignedUrl.mockResolvedValue([mockUrl]);

      const result = await service.getSignedUrl(path, expiresInHours);

      expect(result).toBe(mockUrl);
      expect(mockFile.getSignedUrl).toHaveBeenCalledWith({
        action: 'read',
        expires: expect.any(Number),
      });
    });

    it('should calculate correct expiration time', async () => {
      const mockUrl = 'https://storage.googleapis.com/signed-url';
      const expiresInHours = 2;
      const startTime = Date.now();
      mockFile.getSignedUrl.mockResolvedValue([mockUrl]);

      await service.getSignedUrl(path, expiresInHours);

      const call = mockFile.getSignedUrl.mock.calls[0][0];
      const expectedExpiration = startTime + expiresInHours * 60 * 60 * 1000;
      const actualExpiration = call.expires;

      // Allow 1 second tolerance
      expect(Math.abs(actualExpiration - expectedExpiration)).toBeLessThan(1000);
    });

    it('should throw error when getting signed URL fails', async () => {
      const error = new Error('Failed to generate signed URL');
      mockFile.getSignedUrl.mockRejectedValue(error);

      await expect(service.getSignedUrl(path)).rejects.toThrow('Failed to generate signed URL');
    });

    it('should log error message when getting signed URL fails', async () => {
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');
      const error = new Error('Signed URL error');
      mockFile.getSignedUrl.mockRejectedValue(error);

      await expect(service.getSignedUrl(path)).rejects.toThrow();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Error getting signed URL for ${path}:`,
        error,
      );
    });

    it('should handle zero expiration time', async () => {
      const mockUrl = 'https://storage.googleapis.com/signed-url';
      mockFile.getSignedUrl.mockResolvedValue([mockUrl]);

      const result = await service.getSignedUrl(path, 0);

      expect(result).toBe(mockUrl);
    });

    it('should handle very long expiration times', async () => {
      const mockUrl = 'https://storage.googleapis.com/signed-url';
      const expiresInHours = 8760; // 1 year
      mockFile.getSignedUrl.mockResolvedValue([mockUrl]);

      const result = await service.getSignedUrl(path, expiresInHours);

      expect(result).toBe(mockUrl);
    });

    it('should use action read for signed URL', async () => {
      const mockUrl = 'https://storage.googleapis.com/signed-url';
      mockFile.getSignedUrl.mockResolvedValue([mockUrl]);

      await service.getSignedUrl(path);

      const call = mockFile.getSignedUrl.mock.calls[0][0];
      expect(call.action).toBe('read');
    });
  });

  describe('deleteFile', () => {
    const path = 'uploads/test-file.txt';

    it('should delete file successfully', async () => {
      mockFile.delete.mockResolvedValue(undefined);

      await service.deleteFile(path);

      expect(mockStorage.bucket).toHaveBeenCalled();
      expect(mockBucket.file).toHaveBeenCalledWith(path);
      expect(mockFile.delete).toHaveBeenCalled();
    });

    it('should log success message', async () => {
      const loggerLogSpy = jest.spyOn((service as any).logger, 'log');
      mockFile.delete.mockResolvedValue(undefined);

      await service.deleteFile(path);

      expect(loggerLogSpy).toHaveBeenCalledWith(`File deleted: ${path}`);
    });

    it('should throw error when deletion fails', async () => {
      const error = new Error('Deletion failed');
      mockFile.delete.mockRejectedValue(error);

      await expect(service.deleteFile(path)).rejects.toThrow('Deletion failed');
    });

    it('should log error message when deletion fails', async () => {
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');
      const error = new Error('Delete error');
      mockFile.delete.mockRejectedValue(error);

      await expect(service.deleteFile(path)).rejects.toThrow();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Error deleting file ${path}:`,
        error,
      );
    });

    it('should handle deleting non-existent file', async () => {
      const error = new Error('File not found');
      mockFile.delete.mockRejectedValue(error);

      await expect(service.deleteFile(path)).rejects.toThrow('File not found');
    });

    it('should handle paths with special characters', async () => {
      const specialPath = 'uploads/file with spaces & special-chars.txt';
      mockFile.delete.mockResolvedValue(undefined);

      await service.deleteFile(specialPath);

      expect(mockBucket.file).toHaveBeenCalledWith(specialPath);
    });
  });

  describe('fileExists', () => {
    const path = 'uploads/test-file.txt';

    it('should return true when file exists', async () => {
      mockFile.exists.mockResolvedValue([true]);

      const result = await service.fileExists(path);

      expect(result).toBe(true);
      expect(mockStorage.bucket).toHaveBeenCalled();
      expect(mockBucket.file).toHaveBeenCalledWith(path);
      expect(mockFile.exists).toHaveBeenCalled();
    });

    it('should return false when file does not exist', async () => {
      mockFile.exists.mockResolvedValue([false]);

      const result = await service.fileExists(path);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const error = new Error('Check existence failed');
      mockFile.exists.mockRejectedValue(error);

      const result = await service.fileExists(path);

      expect(result).toBe(false);
    });

    it('should log error message when check fails', async () => {
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');
      const error = new Error('Existence check error');
      mockFile.exists.mockRejectedValue(error);

      await service.fileExists(path);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Error checking file existence ${path}:`,
        error,
      );
    });

    it('should handle network errors gracefully', async () => {
      mockFile.exists.mockRejectedValue(new Error('Network error'));

      const result = await service.fileExists(path);

      expect(result).toBe(false);
    });

    it('should handle timeout errors gracefully', async () => {
      mockFile.exists.mockRejectedValue(new Error('Request timeout'));

      const result = await service.fileExists(path);

      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty file path', async () => {
      const emptyPath = '';
      mockFile.save.mockResolvedValue(undefined);

      const result = await service.uploadFile(emptyPath, Buffer.from('data'));

      expect(result).toBe(emptyPath);
      expect(mockBucket.file).toHaveBeenCalledWith(emptyPath);
    });

    it('should handle very long file paths', async () => {
      const longPath = 'a/'.repeat(100) + 'file.txt';
      mockFile.save.mockResolvedValue(undefined);

      const result = await service.uploadFile(longPath, Buffer.from('data'));

      expect(result).toBe(longPath);
    });

    it('should handle special characters in file paths', async () => {
      const specialPath = 'uploads/file with spaces & special-chars_123.txt';
      mockFile.save.mockResolvedValue(undefined);

      const result = await service.uploadFile(specialPath, Buffer.from('data'));

      expect(result).toBe(specialPath);
      expect(mockBucket.file).toHaveBeenCalledWith(specialPath);
    });

    it('should handle unicode characters in file paths', async () => {
      const unicodePath = 'uploads/文件名.txt';
      mockFile.save.mockResolvedValue(undefined);

      const result = await service.uploadFile(unicodePath, Buffer.from('data'));

      expect(result).toBe(unicodePath);
    });

    it('should handle paths with multiple dots', async () => {
      const pathWithDots = 'uploads/file.backup.2024.01.01.txt';
      mockFile.save.mockResolvedValue(undefined);

      const result = await service.uploadFile(pathWithDots, Buffer.from('data'));

      expect(result).toBe(pathWithDots);
    });

    it('should handle concurrent uploads', async () => {
      mockFile.save.mockResolvedValue(undefined);

      const uploads = [
        service.uploadFile('file1.txt', Buffer.from('data1')),
        service.uploadFile('file2.txt', Buffer.from('data2')),
        service.uploadFile('file3.txt', Buffer.from('data3')),
      ];

      const results = await Promise.all(uploads);

      expect(results).toEqual(['file1.txt', 'file2.txt', 'file3.txt']);
      expect(mockFile.save).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent deletions', async () => {
      mockFile.delete.mockResolvedValue(undefined);

      const deletions = [
        service.deleteFile('file1.txt'),
        service.deleteFile('file2.txt'),
        service.deleteFile('file3.txt'),
      ];

      await Promise.all(deletions);

      expect(mockFile.delete).toHaveBeenCalledTimes(3);
    });

    it('should handle bucket access errors', async () => {
      const error = new Error('Bucket not found');
      mockStorage.bucket.mockImplementation(() => {
        throw error;
      });

      await expect(service.uploadFile('file.txt', Buffer.from('data'))).rejects.toThrow('Bucket not found');
    });

    it('should handle permission errors', async () => {
      const error = new Error('Permission denied');
      mockFile.save.mockRejectedValue(error);

      await expect(service.uploadFile('file.txt', Buffer.from('data'))).rejects.toThrow('Permission denied');
    });

    it('should handle quota exceeded errors', async () => {
      const error = new Error('Quota exceeded');
      mockFile.save.mockRejectedValue(error);

      await expect(service.uploadFile('file.txt', Buffer.from('data'))).rejects.toThrow('Quota exceeded');
    });
  });

  describe('generateToken', () => {
    it('should generate different tokens on each call', async () => {
      mockFile.save.mockResolvedValue(undefined);

      await service.uploadFile('file1.txt', Buffer.from('data'));
      await service.uploadFile('file2.txt', Buffer.from('data'));

      const token1 = mockFile.save.mock.calls[0][1].metadata.firebaseStorageDownloadTokens;
      const token2 = mockFile.save.mock.calls[1][1].metadata.firebaseStorageDownloadTokens;

      expect(token1).not.toBe(token2);
    });

    it('should generate tokens of reasonable length', async () => {
      mockFile.save.mockResolvedValue(undefined);

      await service.uploadFile('file.txt', Buffer.from('data'));

      const token = mockFile.save.mock.calls[0][1].metadata.firebaseStorageDownloadTokens;

      expect(token.length).toBeGreaterThan(10);
      expect(token.length).toBeLessThan(50);
    });
  });

  describe('integration scenarios', () => {
    it('should upload and then get signed URL', async () => {
      const path = 'uploads/test.pdf';
      const data = Buffer.from('PDF content');
      const mockUrl = 'https://storage.googleapis.com/signed-url';

      mockFile.save.mockResolvedValue(undefined);
      mockFile.getSignedUrl.mockResolvedValue([mockUrl]);

      const uploadResult = await service.uploadFile(path, data, 'application/pdf');
      const urlResult = await service.getSignedUrl(path);

      expect(uploadResult).toBe(path);
      expect(urlResult).toBe(mockUrl);
    });

    it('should check existence before upload', async () => {
      const path = 'uploads/test.txt';

      mockFile.exists.mockResolvedValue([false]);
      mockFile.save.mockResolvedValue(undefined);

      const exists = await service.fileExists(path);
      expect(exists).toBe(false);

      await service.uploadFile(path, Buffer.from('data'));

      expect(mockFile.save).toHaveBeenCalled();
    });

    it('should upload and then delete file', async () => {
      const path = 'uploads/temp.txt';

      mockFile.save.mockResolvedValue(undefined);
      mockFile.delete.mockResolvedValue(undefined);

      await service.uploadFile(path, Buffer.from('data'));
      await service.deleteFile(path);

      expect(mockFile.save).toHaveBeenCalled();
      expect(mockFile.delete).toHaveBeenCalled();
    });

    it('should handle upload failure and retry', async () => {
      const path = 'uploads/test.txt';
      const data = Buffer.from('data');

      mockFile.save
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      await expect(service.uploadFile(path, data)).rejects.toThrow('Network error');

      const result = await service.uploadFile(path, data);

      expect(result).toBe(path);
      expect(mockFile.save).toHaveBeenCalledTimes(2);
    });
  });
});
