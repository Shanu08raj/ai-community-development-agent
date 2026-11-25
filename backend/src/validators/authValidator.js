import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Please provide a valid administrator email address.'),
  password: z.string().min(1, 'Password is required.'),
});
