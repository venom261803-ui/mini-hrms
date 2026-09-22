import { z } from 'zod';
import { AttendanceStatus } from '@prisma/client';

export const updateAttendanceStatusSchema = z.object({
  status: z.nativeEnum(AttendanceStatus, {
    errorMap: () => ({ message: 'Status must be PRESENT, ABSENT, HALF_DAY, or LEAVE' }),
  }),
});

export const attendanceFilterSchema = z.object({
  employeeId: z.string().optional(),
  date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' })
    .optional(),
  fromDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid fromDate format' })
    .optional(),
  toDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid toDate format' })
    .optional(),
  status: z
    .nativeEnum(AttendanceStatus)
    .optional(),
});

export type UpdateAttendanceStatusInput = z.infer<typeof updateAttendanceStatusSchema>;
export type AttendanceFilterInput = z.infer<typeof attendanceFilterSchema>;
