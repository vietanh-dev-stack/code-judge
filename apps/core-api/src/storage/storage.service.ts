import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { Readable } from 'node:stream';
import { EnvKeys, STORAGE_DEFAULT_BUCKET, STORAGE_DEFAULT_REGION } from '../common';

export interface PresignedUploadInput {
  objectKey: string;
  expiresInSeconds?: number;
  contentType?: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket: string;
  private readonly client: Client;
  private readonly publicClient: Client;
  private readonly publicBaseUrl: string | null;
  private readonly fallbackPublicBaseUrl: string;
  private readonly allowPublicRead: boolean;
  private bucketReadPolicyEnsured = false;

  /** TTL presigned GET cho avatar trong API response (giây). */
  static readonly AVATAR_PRESIGN_TTL_SECONDS = 3600;

  constructor(private readonly config: ConfigService) {
    const endPoint = this.config.get<string>(EnvKeys.MINIO_ENDPOINT) ?? 'localhost';
    const portRaw = this.config.get<string>(EnvKeys.MINIO_PORT) ?? '9000';
    const useSSLRaw = (this.config.get<string>(EnvKeys.MINIO_USE_SSL) ?? 'false').toLowerCase();
    const accessKey = this.config.get<string>(EnvKeys.MINIO_ACCESS_KEY) ?? 'minioadmin';
    const secretKey = this.config.get<string>(EnvKeys.MINIO_SECRET_KEY) ?? 'minioadmin';

    this.bucket = this.config.get<string>(EnvKeys.MINIO_BUCKET) ?? STORAGE_DEFAULT_BUCKET;
    this.publicBaseUrl = this.config.get<string>(EnvKeys.MINIO_PUBLIC_BASE_URL) ?? null;
    this.allowPublicRead = this.resolveAllowPublicRead();
    const protocol = ['1', 'true', 'yes'].includes(useSSLRaw) ? 'https' : 'http';
    this.fallbackPublicBaseUrl = `${protocol}://${endPoint}:${portRaw}`;

    this.client = new Client({
      endPoint,
      port: Number(portRaw),
      useSSL: ['1', 'true', 'yes'].includes(useSSLRaw),
      accessKey,
      secretKey,
      region: this.config.get<string>(EnvKeys.MINIO_REGION) ?? STORAGE_DEFAULT_REGION,
    });

    // Create a public client for signing URLs
    if (this.publicBaseUrl) {
      try {
        const url = new URL(this.publicBaseUrl);
        this.publicClient = new Client({
          endPoint: url.hostname,
          port: url.port ? Number(url.port) : (url.protocol === 'https:' ? 443 : 80),
          useSSL: url.protocol === 'https:',
          accessKey,
          secretKey,
          region: this.config.get<string>(EnvKeys.MINIO_REGION) ?? STORAGE_DEFAULT_REGION,
        });
      } catch (e) {
        this.publicClient = this.client;
      }
    } else {
      this.publicClient = this.client;
    }

    // Ensure bucket exists on startup
    this.ensureBucketExists().catch(err => {
      this.logger.error(`Failed to ensure bucket exists: ${err.message}`);
    });
  }

  async ensureBucketExists(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`Created bucket "${this.bucket}"`);
    }

    await this.ensureBucketReadPolicy();
  }

  async createPresignedUploadUrl(input: PresignedUploadInput): Promise<string> {
    const { objectKey, expiresInSeconds = 900 } = input;
    await this.ensureBucketExists();
    // We must sign with the same headers the frontend uses (text/plain)
    return this.publicClient.presignedUrl('PUT', this.bucket, objectKey, expiresInSeconds, {
      'content-type': 'text/plain',
    });
  }

  async createPresignedDownloadUrl(objectKey: string, expiresInSeconds = 900): Promise<string> {
    await this.ensureBucketExists();
    return this.publicClient.presignedGetObject(this.bucket, objectKey, expiresInSeconds);
  }

  async putObject(
    objectKey: string,
    body: Buffer | string,
    metaData?: Record<string, string>,
  ): Promise<void> {
    await this.ensureBucketExists();
    this.logger.log(`Putting object ${objectKey} with metadata ${JSON.stringify(metaData)}`);
    await this.client.putObject(this.bucket, objectKey, body, undefined, metaData);
    this.logger.log(`Object ${objectKey} put successfully`);
  }

  async removeObject(objectKey: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectKey);
  }

  /** Đọc toàn bộ object dưới dạng UTF-8 (golden / artifact nhỏ). */
  async getObjectString(objectKey: string): Promise<string> {
    await this.ensureBucketExists();
    const stream = (await this.client.getObject(this.bucket, objectKey)) as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
  }

  /**
   * Direct URL (chỉ hoạt động khi bucket public read). Không dùng để persist DB khi public read tắt.
   */
  getObjectUrl(objectKey: string): string {
    const baseUrl = (this.publicBaseUrl ?? this.fallbackPublicBaseUrl).replace(/\/+$/, '');
    return `${baseUrl}/${this.bucket}/${objectKey}`;
  }

  isPublicReadEnabled(): boolean {
    return this.allowPublicRead;
  }

  /**
   * URL hiển thị cho trình duyệt: presigned GET khi public read tắt; legacy URL khi dev/public bucket.
   */
  async resolveDisplayUrl(
    objectKey: string | null | undefined,
    legacyUrl: string | null | undefined,
    expiresInSeconds = 900,
  ): Promise<string | null> {
    const key = objectKey?.trim();
    if (key) {
      if (this.allowPublicRead && legacyUrl?.trim()) {
        return legacyUrl.trim();
      }
      return this.createPresignedDownloadUrl(key, expiresInSeconds);
    }
    if (this.allowPublicRead && legacyUrl?.trim()) {
      return legacyUrl.trim();
    }
    return null;
  }

  /**
   * Avatar hiển thị: MinIO (presigned) khi có `imageObjectKey`;
   * URL ngoài (Google OAuth, …) khi chỉ có `image` — luôn trả về trên production
   * (không phụ thuộc MINIO_ALLOW_PUBLIC_READ).
   */
  async resolveAvatarImageUrl(
    imageObjectKey: string | null | undefined,
    legacyImage: string | null | undefined,
  ): Promise<string | null> {
    const key = imageObjectKey?.trim();
    if (key) {
      return this.createPresignedDownloadUrl(key, StorageService.AVATAR_PRESIGN_TTL_SECONDS);
    }

    const legacy = legacyImage?.trim();
    if (!legacy) {
      return null;
    }

    // Google / HTTPS avatar — dùng trực tiếp trong <img>
    if (/^https?:\/\//i.test(legacy)) {
      return legacy;
    }

    if (this.allowPublicRead) {
      return legacy;
    }

    return null;
  }

  getBucketName(): string {
    return this.bucket;
  }

  private resolveAllowPublicRead(): boolean {
    const raw = this.config.get<string>(EnvKeys.MINIO_ALLOW_PUBLIC_READ)?.trim().toLowerCase();
    if (raw === '1' || raw === 'true' || raw === 'yes') {
      return true;
    }
    if (raw === '0' || raw === 'false' || raw === 'no') {
      return false;
    }
    return process.env.NODE_ENV !== 'production';
  }

  private async ensureBucketReadPolicy(): Promise<void> {
    if (!this.allowPublicRead) {
      this.logger.log(
        `Skipping public read bucket policy for "${this.bucket}" (MINIO_ALLOW_PUBLIC_READ=false)`,
      );
      this.bucketReadPolicyEnsured = true;
      return;
    }

    if (this.bucketReadPolicyEnsured) {
      return;
    }

    const policy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucket}/*`],
        },
      ],
    });

    try {
      const currentPolicy = await this.client.getBucketPolicy(this.bucket);
      if (currentPolicy === policy) {
        this.bucketReadPolicyEnsured = true;
        return;
      }
    } catch {
      // Ignore and try setting policy below.
    }

    try {
      await this.client.setBucketPolicy(this.bucket, policy);
      this.logger.log(`Applied public read policy for bucket "${this.bucket}"`);
      this.bucketReadPolicyEnsured = true;
    } catch (error) {
      this.logger.warn(
        `Unable to set public read policy for bucket "${this.bucket}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
