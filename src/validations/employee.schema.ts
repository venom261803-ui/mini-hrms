import { z } from 'zod';
import { EmploymentStatus } from '@prisma/client';

export const createEmployeeSchema = z.object({
  employeeCode: z
    .string()
    .min(1, 'Employee code is required')
    .trim(),
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .trim(),
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Invalid email address format')
    .toLowerCase()
    .trim(),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .trim(),
  department: z
    .string()
    .min(1, 'Department is required')
    .trim(),
  designation: z
    .string()
    .min(1, 'Designation is required')
    .trim(),
  joiningDate: z
    .string()
    .min(1, 'Joining date is required')
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid joining date format' }),
  managerId: z
    .string()
    .nullable()
    .optional(),
  status: z
    .nativeEnum(EmploymentStatus)
    .optional()
    .default(EmploymentStatus.ACTIVE),
});

export const updateEmployeeSelfSchema = z.object({
  email: z
    .string()
    .email('Invalid email address format')
    .toLowerCase()
    .trim()
    .optional(),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .trim()
    .optional(),
});

export const updateEmployeeHrSchema = z.object({
  fullName: z.string().min(1).trim().optional(),
  email: z.string().email().toLowerCase().trim().optional(),
  phone: z.string().min(1).trim().optional(),
  department: z.string().min(1).trim().optional(),
  designation: z.string().min(1).trim().optional(),
  managerId: z.string().nullable().optional(),
  joiningDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid joining date format' })
    .optional(),
  status: z.nativeEnum(EmploymentStatus).optional(),
});

export const updateStatusSchema = z.object({
  status: z.nativeEnum(EmploymentStatus, {
    errorMap: () => ({ message: 'Status must be ACTIVE or INACTIVE' }),
  }),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeSelfInput = z.infer<typeof updateEmployeeSelfSchema>;
export type UpdateEmployeeHrInput = z.infer<typeof updateEmployeeHrSchema>;
