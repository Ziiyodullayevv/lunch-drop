import { z } from 'zod';

export const phoneSchema = z.object({
  phone: z
    .string()
    .refine((v) => v.replace(/\D/g, '').length === 9, 'Telefon raqamni kiriting'),
});

export const otpSchema = z.object({
  code: z.string().length(6, '6 raqamli kodni kiriting').regex(/^\d+$/, 'Faqat raqam kiriting'),
});

export const inviteCodeSchema = z.object({
  code: z.string().min(4, 'Invite code kamida 4 belgi bolishi kerak'),
});

export const checkoutSchema = z.object({
  note: z.string().max(500, 'Izoh 500 belgidan oshmasin').optional(),
});

export type PhoneFormValues = z.infer<typeof phoneSchema>;
export type OtpFormValues = z.infer<typeof otpSchema>;
export type InviteCodeFormValues = z.infer<typeof inviteCodeSchema>;
export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
