import { z } from 'zod';

export const CNIC_FORMAT_REGEX = /^\d{5}-\d{7}-\d$/;
export const CNIC_PLACEHOLDER = '12345-1234567-1';

export const cnicNumberSchema = z
  .string()
  .optional()
  .refine((val) => !val || CNIC_FORMAT_REGEX.test(val), {
    message: `CNIC must be in format ${CNIC_PLACEHOLDER}`,
  });
