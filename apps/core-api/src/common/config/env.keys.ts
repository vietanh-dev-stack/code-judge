/**
 * Tên biến môi trường dùng trong dự án (tránh magic string rải rác).
 *
 * Lưu ý: giá trị thực tế vẫn đọc qua `ConfigService` hoặc `process.env` tùy chỗ;
 * object này chỉ để thống nhất key string.
 */
export const EnvKeys = {
  /** Cổng HTTP của Core API (mặc định thường 3000). */
  PORT: 'PORT',
  /** Chuỗi kết nối PostgreSQL cho Prisma. */
  DATABASE_URL: 'DATABASE_URL',
  /** Redis URL cho BullMQ / cache. */
  REDIS_URL: 'REDIS_URL',
  /** Số lần đăng nhập tối đa (theo IP hoặc email) trong cửa sổ AUTH_LOGIN_WINDOW_SECONDS. */
  AUTH_LOGIN_MAX_ATTEMPTS: 'AUTH_LOGIN_MAX_ATTEMPTS',
  /** Cửa sổ rate limit đăng nhập (giây). Mặc định 900 (15 phút). */
  AUTH_LOGIN_WINDOW_SECONDS: 'AUTH_LOGIN_WINDOW_SECONDS',
  /** Số lần đăng ký tối đa mỗi IP trong AUTH_REGISTER_WINDOW_SECONDS. */
  AUTH_REGISTER_MAX_PER_IP: 'AUTH_REGISTER_MAX_PER_IP',
  /** Cửa sổ rate limit đăng ký theo IP (giây). Mặc định 3600. */
  AUTH_REGISTER_WINDOW_SECONDS: 'AUTH_REGISTER_WINDOW_SECONDS',
  /** Bật HTTP security headers qua helmet (`true`/`false`). Mặc định: bật trên production. */
  HELMET_ENABLED: 'HELMET_ENABLED',
  /** Secret ký JWT (bắt buộc khi bật module auth). */
  JWT_SECRET: 'JWT_SECRET',
  /** Thời hạn access token tính bằng giây (ví dụ `3600`). Mặc định trong code: 604800 (7 ngày). */
  JWT_EXPIRES_IN: 'JWT_EXPIRES_IN',
  /** Secret riêng cho refresh token (tách khỏi access token secret). */
  JWT_REFRESH_SECRET: 'JWT_REFRESH_SECRET',
  /** Thời hạn refresh token tính bằng giây. Mặc định trong code: 604800 (7 ngày). */
  JWT_REFRESH_EXPIRES_IN: 'JWT_REFRESH_EXPIRES_IN',
  /** Google OAuth Client ID. */
  GOOGLE_CLIENT_ID: 'GOOGLE_CLIENT_ID',
  /** Google OAuth Client Secret. */
  GOOGLE_CLIENT_SECRET: 'GOOGLE_CLIENT_SECRET',
  /** Google OAuth Callback URL. */
  GOOGLE_CALLBACK_URL: 'GOOGLE_CALLBACK_URL',
  /** API key provider OpenAI for AI testcase generation. */
  OPENAI_API_KEY: 'OPENAI_API_KEY',
  /** API key provider Google Generative AI for AI testcase generation. */
  GOOGLE_GENERATIVE_AI_API_KEY: 'GOOGLE_GENERATIVE_AI_API_KEY',
  /** Default AI provider (`openai` or `google`). */
  AI_DEFAULT_PROVIDER: 'AI_DEFAULT_PROVIDER',
  /** Default OpenAI model name. */
  AI_DEFAULT_MODEL_OPENAI: 'AI_DEFAULT_MODEL_OPENAI',
  /** Default Google model name. */
  AI_DEFAULT_MODEL_GOOGLE: 'AI_DEFAULT_MODEL_GOOGLE',
  /**
   * Danh sách model Google dự phòng (phẩy), thử sau khi primary hoặc khi 429/quota.
   * VD: gemini-3.1-flash-lite,gemini-2.5-flash-lite,gemini-3-flash
   */
  AI_FALLBACK_MODELS_GOOGLE: 'AI_FALLBACK_MODELS_GOOGLE',
  /** Prompt version identifier for auditing/revision. */
  AI_PROMPT_VERSION: 'AI_PROMPT_VERSION',
  /** Prompt version for PROJECT hidden-test generation. */
  AI_PROJECT_PROMPT_VERSION: 'AI_PROJECT_PROMPT_VERSION',
  /** Enable fast mode for first-response latency optimization. */
  AI_FAST_MODE: 'AI_FAST_MODE',
  /** Max tokens sent to generation endpoint. */
  AI_MAX_TOKENS: 'AI_MAX_TOKENS',
  /** Sampling temperature for generation. */
  AI_TEMPERATURE: 'AI_TEMPERATURE',
  /** Bật AI gợi ý cho học viên (`true` / `false`, mặc định true). */
  AI_HINT_ENABLED: 'AI_HINT_ENABLED',
  /** Số lần gợi ý tối đa mỗi user/problem trong 1 giờ (Redis counter). */
  AI_HINT_MAX_PER_PROBLEM_PER_HOUR: 'AI_HINT_MAX_PER_PROBLEM_PER_HOUR',
  /** Tắt gợi ý khi submission thuộc contest (`true` / `false`). */
  AI_HINT_DISABLED_IN_CONTEST: 'AI_HINT_DISABLED_IN_CONTEST',
  /** MinIO/S3 endpoint host (không gồm protocol). */
  MINIO_ENDPOINT: 'MINIO_ENDPOINT',
  /** MinIO API port (mặc định 9000). */
  MINIO_PORT: 'MINIO_PORT',
  /** Bật SSL/TLS khi kết nối MinIO (`true`/`false`). */
  MINIO_USE_SSL: 'MINIO_USE_SSL',
  /** Access key cho MinIO/S3. */
  MINIO_ACCESS_KEY: 'MINIO_ACCESS_KEY',
  /** Secret key cho MinIO/S3. */
  MINIO_SECRET_KEY: 'MINIO_SECRET_KEY',
  /** Bucket mặc định dùng lưu object. */
  MINIO_BUCKET: 'MINIO_BUCKET',
  /** Region S3-compatible (thường `us-east-1`). */
  MINIO_REGION: 'MINIO_REGION',
  /** Base URL public để dựng URL hiển thị (tuỳ chọn). */
  MINIO_PUBLIC_BASE_URL: 'MINIO_PUBLIC_BASE_URL',
  /**
   * Bucket policy public read cho s3:GetObject (`true`/`false`).
   * Mặc định: `false` trên production, `true` khi dev (trừ khi set rõ).
   */
  MINIO_ALLOW_PUBLIC_READ: 'MINIO_ALLOW_PUBLIC_READ',
  /** Gmail (nodemailer `service: 'gmail'`) — địa chỉ gửi. */
  MAIL_ACCOUNT: 'MAIL_ACCOUNT',
  /** App password hoặc credential SMTP tương ứng (không commit). */
  MAIL_PASSWORD: 'MAIL_PASSWORD',
} as const;

export type EnvKey = (typeof EnvKeys)[keyof typeof EnvKeys];
