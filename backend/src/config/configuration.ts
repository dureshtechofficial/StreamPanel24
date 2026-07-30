export default () => ({
  appEnv: process.env.APP_ENV ?? 'development',
  appName: process.env.APP_NAME ?? 'Project 7',
  port: parseInt(process.env.PORT ?? '3001', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  // Comma-separated in .env (e.g. multiple tunnel/dev hostnames) — split into
  // an array since the `cors` package treats a bare string `origin` as one
  // single exact-match value, not a list.
  frontendOrigins: (process.env.FRONTEND_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  // Refresh-cookie delivery. When the frontend and API are on different sites
  // (e.g. a localhost frontend talking to an https tunnel API, or different
  // registrable domains), the browser only sends the cookie on reload if it's
  // `SameSite=None; Secure`. Set `COOKIE_SAMESITE=none` for that shape — it
  // forces `secure=true` (browsers reject `SameSite=None` without `Secure`),
  // which is fine because such setups are always https. Pure same-origin or
  // localhost-http dev keeps the default `lax`.
  cookie: (() => {
    const sameSite = (process.env.COOKIE_SAMESITE ?? 'lax').toLowerCase() as
      | 'lax'
      | 'none'
      | 'strict';
    const secure =
      sameSite === 'none'
        ? true
        : process.env.COOKIE_SECURE !== undefined
          ? process.env.COOKIE_SECURE === 'true'
          : process.env.APP_ENV === 'production';
    return { sameSite, secure };
  })(),

  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },

  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10),

  credentialsEncryptionKey: process.env.CREDENTIALS_ENCRYPTION_KEY,

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
});
