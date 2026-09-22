import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, createSessionToken, setSessionCookie } from '@/lib/auth';
import { loginSchema } from '@/validations/auth.schema';
import { EmploymentStatus } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Zod Server-side payload validation
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // 2. User lookup in database
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            status: true,
          },
        },
      },
    });

    // 3. Generic invalid credentials error if user doesn't exist
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 4. Inactive account lockout check (403 Forbidden)
    if (user.employee.status === EmploymentStatus.INACTIVE) {
      return NextResponse.json(
        { success: false, error: 'Account inactive. Contact HR for assistance.' },
        { status: 403 }
      );
    }

    // 5. Password verification using bcryptjs
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 6. Create JWT payload (minimal claims)
    const sessionPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
    };

    // 7. Mint JWT token and set HttpOnly Cookie
    const token = await createSessionToken(sessionPayload);
    await setSessionCookie(token);

    // 8. Return safe user response (never exposing passwordHash)
    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            employeeId: user.employeeId,
            fullName: user.employee.fullName,
          },
        },
        message: 'Login successful',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Authentication Error during login:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected authentication error occurred' },
      { status: 500 }
    );
  }
}
