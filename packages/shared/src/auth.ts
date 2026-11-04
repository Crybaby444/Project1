import { z } from 'zod';
import { LOCALES } from './locale';
import { THEME_PREFERENCES } from './theme';

export const ROLES = ['USER', 'ADMIN'] as const;

export type Role = (typeof ROLES)[number];

/** Trimmed and lowercased first, so `  Anna@Mail.LV ` and `anna@mail.lv` are one and the same account. */
export const EmailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

/** Taken exactly as typed: spaces count. */
export const PasswordSchema = z.string().min(8).max(128);

export const NameSchema = z.string().trim().min(1).max(60);

export const RegisterRequestSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: NameSchema,
  locale: z.enum(LOCALES).optional(),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

/** Any non-empty password is checked: rules for new passwords do not apply to signing in. */
export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1).max(128),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/** Apps send the refresh token in the body; the site sends nothing (the cookie carries it). */
export const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(1).max(256).optional(),
});

/** The token from an email link (`…?token=…`). */
export const EmailTokenRequestSchema = z.object({ token: z.string().min(1).max(256) });

export const ForgotPasswordRequestSchema = z.object({ email: EmailSchema });

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1).max(256),
  password: PasswordSchema,
});

/** The signed-in user as the API shows them to themselves. Never carries secrets. */
export const PublicUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  city: z.string().nullable(),
  about: z.string().nullable(),
  locale: z.enum(LOCALES),
  theme: z.enum(THEME_PREFERENCES),
  role: z.enum(ROLES),
  emailVerified: z.boolean(),
  /** The confirmed phone number (E.164), or null. */
  phone: z.string().nullable(),
  phoneVerified: z.boolean(),
  createdAt: z.iso.datetime(),
});

export type PublicUser = z.infer<typeof PublicUserSchema>;

export const UserResponseSchema = z.object({ user: PublicUserSchema });

export type UserResponse = z.infer<typeof UserResponseSchema>;

/** The tokens are in the body only for apps (refresh token sent in the body, or a Bearer header). */
export const RefreshResponseSchema = z.object({
  user: PublicUserSchema,
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
});

export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

/** Which sign-in methods this deployment offers. */
export const ProvidersResponseSchema = z.object({ google: z.boolean() });

export type ProvidersResponse = z.infer<typeof ProvidersResponseSchema>;

export const GoogleStartQuerySchema = z.object({
  /** Where to land on the site afterwards: a path on the site only (anything else becomes `/`). */
  returnTo: z.string().max(2048).optional(),
});

/** What Google appends to the callback URL. */
export const GoogleCallbackQuerySchema = z.object({
  code: z.string().max(2048).optional(),
  state: z.string().max(256).optional(),
  error: z.string().max(256).optional(),
});
