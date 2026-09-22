import { prisma } from '@/lib/prisma';
import { LeaveStatus } from '@prisma/client';

/**
 * Normalizes a date or timestamp to UTC Midnight (00:00:00.000Z).
 * Ensures consistent calendar day comparison.
 */
export function getNormalizedDate(dateInput?: Date | string | null): Date {
  const d = dateInput ? new Date(dateInput) : new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Checks if an employee has an APPROVED leave request covering targetDate.
 */
export async function hasApprovedLeave(employeeId: string, targetDate: Date): Promise<boolean> {
  const normalizedTarget = getNormalizedDate(targetDate);
  const endOfDayTarget = new Date(normalizedTarget.getTime() + 86399999);

  const approvedLeave = await prisma.leaveRequest.findFirst({
    where: {
      employeeId,
      status: LeaveStatus.APPROVED,
      startDate: { lte: endOfDayTarget },
      endDate: { gte: normalizedTarget },
    },
  });

  return !!approvedLeave;
}
