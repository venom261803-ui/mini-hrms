import { z } from 'zod';
import { LeaveType, LeaveStatus } from '@prisma/client';

export const createLeaveSchema = z.object({
  leaveType: z.nativeEnum(LeaveType, {
    errorMap: () => ({ message: 'Leave type must be CASUAL, SICK, ANNUAL, or UNPAID' }),
  }),
  startDate: z
    .string()
    .min(1, 'Start date is required')
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start date format' }),
  endDate: z
    .string()
    .min(1, 'End date is required')
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid end date format' }),
  reason: z
    .string()
    .min(1, 'Reason for leave is required')
    .trim(),
});

export const rejectLeaveSchema = z.object({
  rejectionReason: z
    .string()
    .min(1, 'Rejection reason is required')
    .trim(),
});

export const leaveFilterSchema = z.object({
  employeeId: z.string().optional(),
  status: z.nativeEnum(LeaveStatus).optional(),
  leaveType: z.nativeEnum(LeaveType).optional(),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid startDate format' })
    .optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid endDate format' })
    .optional(),
});

export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;
export type RejectLeaveInput = z.infer<typeof rejectLeaveSchema>;
export type LeaveFilterInput = z.infer<typeof leaveFilterSchema>;
