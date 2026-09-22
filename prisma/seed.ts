import { PrismaClient, Role, EmploymentStatus, AttendanceStatus, LeaveType, LeaveStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for Mini HRMS...');

  // Hash default password for all demo accounts
  const defaultPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // Clean existing data
  await prisma.leaveRequest.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();

  console.log('🧹 Cleaned existing database records.');

  // 1. Create HR/Admin Employee & User
  const hrEmployee = await prisma.employee.create({
    data: {
      employeeCode: 'EMP-001',
      fullName: 'Sarah Jenkins',
      email: 'hr@company.com',
      phone: '+1-555-0101',
      department: 'Human Resources',
      designation: 'HR Director',
      joiningDate: new Date('2023-01-15'),
      status: EmploymentStatus.ACTIVE,
      user: {
        create: {
          email: 'hr@company.com',
          passwordHash,
          role: Role.HR_ADMIN,
        },
      },
    },
  });

  // 2. Create Managers (Manager A & Manager B)
  const managerA = await prisma.employee.create({
    data: {
      employeeCode: 'EMP-002',
      fullName: 'Alex Rivera',
      email: 'manager.a@company.com',
      phone: '+1-555-0102',
      department: 'Engineering',
      designation: 'Tech Lead',
      joiningDate: new Date('2023-03-01'),
      status: EmploymentStatus.ACTIVE,
      managerId: hrEmployee.id,
      user: {
        create: {
          email: 'manager.a@company.com',
          passwordHash,
          role: Role.MANAGER,
        },
      },
    },
  });

  const managerB = await prisma.employee.create({
    data: {
      employeeCode: 'EMP-003',
      fullName: 'Priya Sharma',
      email: 'manager.b@company.com',
      phone: '+1-555-0103',
      department: 'Marketing',
      designation: 'Marketing Lead',
      joiningDate: new Date('2023-04-10'),
      status: EmploymentStatus.ACTIVE,
      managerId: hrEmployee.id,
      user: {
        create: {
          email: 'manager.b@company.com',
          passwordHash,
          role: Role.MANAGER,
        },
      },
    },
  });

  // 3. Create Employees for Manager A (Engineering Team)
  const empA = await prisma.employee.create({
    data: {
      employeeCode: 'EMP-004',
      fullName: 'John Doe',
      email: 'employee.a@company.com',
      phone: '+1-555-0104',
      department: 'Engineering',
      designation: 'Senior Developer',
      joiningDate: new Date('2023-06-01'),
      status: EmploymentStatus.ACTIVE,
      managerId: managerA.id,
      user: {
        create: {
          email: 'employee.a@company.com',
          passwordHash,
          role: Role.EMPLOYEE,
        },
      },
    },
  });

  const empB = await prisma.employee.create({
    data: {
      employeeCode: 'EMP-005',
      fullName: 'Jane Smith',
      email: 'employee.b@company.com',
      phone: '+1-555-0105',
      department: 'Engineering',
      designation: 'Frontend Engineer',
      joiningDate: new Date('2023-07-15'),
      status: EmploymentStatus.ACTIVE,
      managerId: managerA.id,
      user: {
        create: {
          email: 'employee.b@company.com',
          passwordHash,
          role: Role.EMPLOYEE,
        },
      },
    },
  });

  const empC = await prisma.employee.create({
    data: {
      employeeCode: 'EMP-006',
      fullName: 'Bob Johnson',
      email: 'employee.c@company.com',
      phone: '+1-555-0106',
      department: 'Engineering',
      designation: 'QA Engineer',
      joiningDate: new Date('2023-08-20'),
      status: EmploymentStatus.ACTIVE,
      managerId: managerA.id,
      user: {
        create: {
          email: 'employee.c@company.com',
          passwordHash,
          role: Role.EMPLOYEE,
        },
      },
    },
  });

  // 4. Create Employees for Manager B (Marketing Team)
  const empD = await prisma.employee.create({
    data: {
      employeeCode: 'EMP-007',
      fullName: 'Emily Davis',
      email: 'employee.d@company.com',
      phone: '+1-555-0107',
      department: 'Marketing',
      designation: 'Content Specialist',
      joiningDate: new Date('2023-09-01'),
      status: EmploymentStatus.ACTIVE,
      managerId: managerB.id,
      user: {
        create: {
          email: 'employee.d@company.com',
          passwordHash,
          role: Role.EMPLOYEE,
        },
      },
    },
  });

  const empE = await prisma.employee.create({
    data: {
      employeeCode: 'EMP-008',
      fullName: 'Michael Lee (Inactive)',
      email: 'employee.e@company.com',
      phone: '+1-555-0108',
      department: 'Marketing',
      designation: 'SEO Specialist',
      joiningDate: new Date('2023-10-10'),
      status: EmploymentStatus.INACTIVE, // Demonstrates INACTIVE status lockout
      managerId: managerB.id,
      user: {
        create: {
          email: 'employee.e@company.com',
          passwordHash,
          role: Role.EMPLOYEE,
        },
      },
    },
  });

  console.log('✅ Created 8 Employee & User accounts (1 HR, 2 Managers, 5 Employees).');

  // 5. Seed Attendance Records for Today
  const today = new Date();
  const normalizedToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  await prisma.attendance.createMany({
    data: [
      {
        employeeId: empA.id,
        date: normalizedToday,
        checkIn: new Date(new Date().setHours(9, 0, 0, 0)),
        checkOut: new Date(new Date().setHours(17, 30, 0, 0)),
        status: AttendanceStatus.PRESENT,
      },
      {
        employeeId: empB.id,
        date: normalizedToday,
        checkIn: new Date(new Date().setHours(9, 15, 0, 0)),
        status: AttendanceStatus.PRESENT,
      },
      {
        employeeId: managerA.id,
        date: normalizedToday,
        checkIn: new Date(new Date().setHours(8, 45, 0, 0)),
        status: AttendanceStatus.PRESENT,
      },
      {
        employeeId: empD.id,
        date: normalizedToday,
        checkIn: new Date(new Date().setHours(9, 30, 0, 0)),
        status: AttendanceStatus.PRESENT,
      },
    ],
  });

  console.log('✅ Seeded initial attendance logs for today.');

  // 6. Seed Sample Leave Requests
  await prisma.leaveRequest.createMany({
    data: [
      {
        employeeId: empA.id,
        leaveType: LeaveType.CASUAL,
        startDate: new Date(Date.now() + 86400000 * 2), // 2 days from now
        endDate: new Date(Date.now() + 86400000 * 4),   // 4 days from now
        reason: 'Attending family wedding event.',
        status: LeaveStatus.PENDING,
      },
      {
        employeeId: empB.id,
        leaveType: LeaveType.SICK,
        startDate: new Date(Date.now() - 86400000 * 5),
        endDate: new Date(Date.now() - 86400000 * 3),
        reason: 'Flu and medical rest.',
        status: LeaveStatus.APPROVED,
        reviewedById: managerA.id,
        reviewedAt: new Date(Date.now() - 86400000 * 6),
      },
      {
        employeeId: empC.id,
        leaveType: LeaveType.ANNUAL,
        startDate: new Date(Date.now() + 86400000 * 10),
        endDate: new Date(Date.now() + 86400000 * 15),
        reason: 'Vacation leave.',
        status: LeaveStatus.PENDING,
      },
      {
        employeeId: empD.id,
        leaveType: LeaveType.CASUAL,
        startDate: new Date(Date.now() - 86400000 * 10),
        endDate: new Date(Date.now() - 86400000 * 9),
        reason: 'Personal errands.',
        status: LeaveStatus.REJECTED,
        rejectionReason: 'Critical marketing launch deadline on requested dates.',
        reviewedById: managerB.id,
        reviewedAt: new Date(Date.now() - 86400000 * 11),
      },
    ],
  });

  console.log('✅ Seeded sample leave requests (Pending, Approved, Rejected).');
  console.log('🚀 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
