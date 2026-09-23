'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Edit,
  Power,
  RotateCcw,
  Users,
  Filter,
  AlertCircle,
  Building,
  Mail,
  Phone,
  Calendar,
  UserCheck,
  UserX,
  XCircle,
} from 'lucide-react';
import { Employee, EmploymentStatus, Role, UserSession } from '@/types';
import AddEmployeeModal from './AddEmployeeModal';
import EditEmployeeModal from './EditEmployeeModal';
import StatusConfirmationDialog from './StatusConfirmationDialog';

interface EmployeeDirectoryProps {
  session: UserSession;
}

export default function EmployeeDirectory({ session }: EmployeeDirectoryProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEditEmployee, setSelectedEditEmployee] = useState<Employee | null>(null);
  const [selectedStatusEmployee, setSelectedStatusEmployee] = useState<Employee | null>(null);

  const isHrAdmin = session.role === Role.HR_ADMIN;
  const isManager = session.role === Role.MANAGER;

  // Fetch employees from GET /api/employees
  const fetchEmployees = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/employees');
      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'Failed to fetch employees');
        return;
      }

      setEmployees(result.data?.employees || []);
    } catch (err: any) {
      setError(err.message || 'Network error fetching employees');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Extract unique departments for filter dropdown
  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach((emp) => {
      if (emp.department) depts.add(emp.department);
    });
    return Array.from(depts).sort();
  }, [employees]);

  // Extract manager options (employees who are ACTIVE and hold MANAGER or HR_ADMIN roles)
  const managerOptions = useMemo(() => {
    return employees.filter(
      (emp) =>
        emp.status === EmploymentStatus.ACTIVE &&
        (emp.user?.role === Role.MANAGER || emp.user?.role === Role.HR_ADMIN)
    );
  }, [employees]);


  // Client-side filtering on authorized dataset
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // 1. Search filter
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        emp.employeeCode.toLowerCase().includes(term) ||
        emp.fullName.toLowerCase().includes(term) ||
        emp.email.toLowerCase().includes(term) ||
        emp.department.toLowerCase().includes(term) ||
        emp.designation.toLowerCase().includes(term);

      // 2. Department filter
      const matchesDepartment =
        departmentFilter === 'ALL' || emp.department === departmentFilter;

      // 3. Status filter
      const matchesStatus =
        statusFilter === 'ALL' || emp.status === statusFilter;

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, searchTerm, departmentFilter, statusFilter]);

  const hasActiveFilters =
    searchTerm !== '' || departmentFilter !== 'ALL' || statusFilter !== 'ALL';

  const clearFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('ALL');
    setStatusFilter('ALL');
  };

  return (
    <div className="space-y-6">
      {/* Directory Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {isHrAdmin ? 'Company Employee Directory' : 'My Team Directory'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {filteredEmployees.length} {filteredEmployees.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isHrAdmin
              ? 'Manage organization personnel records, status, and role assignments'
              : 'Overview of direct report team members assigned under your supervision'}
          </p>
        </div>

        {/* HR_ADMIN Action Button */}
        {isHrAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition"
          >
            <UserPlus className="h-4 w-4" />
            Add Employee
          </button>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, Name, Email, Department, Designation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-700 bg-slate-950 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Departments</option>
              {uniqueDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="text-xs text-slate-400">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value={EmploymentStatus.ACTIVE}>ACTIVE</option>
              <option value={EmploymentStatus.INACTIVE}>INACTIVE</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 hover:text-white transition"
            >
              <XCircle className="h-3.5 w-3.5 text-slate-400" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl bg-red-500/10 p-4 border border-red-500/20 text-red-400 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchEmployees}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-semibold transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4 animate-pulse">
          <div className="h-10 bg-slate-800 rounded-lg w-full"></div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-800/60 rounded-lg w-full"></div>
          ))}
        </div>
      )}

      {/* Data View */}
      {!isLoading && !error && (
        <>
          {/* Empty Directory State */}
          {employees.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-slate-400 mb-4">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-white">No employees found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                {isManager
                  ? 'No employees are currently assigned under your management hierarchy.'
                  : 'No employee records are available in the system repository.'}
              </p>
            </div>
          )}

          {/* Empty Search / Filter State */}
          {employees.length > 0 && filteredEmployees.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-400 mb-3">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-md font-semibold text-white">No employees found</h3>
              <p className="text-xs text-slate-400 mt-1">
                Try adjusting your search keywords or clearing active filters.
              </p>
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20 text-xs font-semibold hover:bg-blue-600 hover:text-white transition"
              >
                Clear All Filters
              </button>
            </div>
          )}

          {/* Employees Table (Desktop & Tablet View) */}
          {filteredEmployees.length > 0 && (
            <>
              <div className="hidden lg:block overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <tr>
                        <th scope="col" className="px-5 py-3.5">Employee ID</th>
                        <th scope="col" className="px-5 py-3.5">Full Name</th>
                        <th scope="col" className="px-5 py-3.5">Email</th>
                        <th scope="col" className="px-5 py-3.5">Department</th>
                        <th scope="col" className="px-5 py-3.5">Designation</th>
                        <th scope="col" className="px-5 py-3.5">Manager</th>
                        <th scope="col" className="px-5 py-3.5">Joining Date</th>
                        <th scope="col" className="px-5 py-3.5">Status</th>
                        {isHrAdmin && <th scope="col" className="px-5 py-3.5 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredEmployees.map((emp) => {
                        const isActive = emp.status === EmploymentStatus.ACTIVE;
                        return (
                          <tr
                            key={emp.id}
                            className="hover:bg-slate-800/40 transition-colors"
                          >
                            {/* Employee Code */}
                            <td className="px-5 py-4 font-mono text-xs font-semibold text-blue-400">
                              {emp.employeeCode}
                            </td>

                            {/* Full Name */}
                            <td className="px-5 py-4 font-semibold text-white whitespace-nowrap">
                              {emp.fullName}
                            </td>

                            {/* Email */}
                            <td className="px-5 py-4 text-xs font-mono text-slate-300 whitespace-nowrap">
                              {emp.email}
                            </td>

                            {/* Department */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700">
                                <Building className="h-3 w-3 text-slate-400" />
                                {emp.department}
                              </span>
                            </td>

                            {/* Designation */}
                            <td className="px-5 py-4 text-xs text-slate-300 whitespace-nowrap">
                              {emp.designation}
                            </td>

                            {/* Manager */}
                            <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">
                              {emp.manager ? (
                                <span className="text-slate-200 font-medium">
                                  {emp.manager.fullName}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">None</span>
                              )}
                            </td>

                            {/* Joining Date */}
                            <td className="px-5 py-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                              {emp.joiningDate
                                ? new Date(emp.joiningDate).toISOString().split('T')[0]
                                : 'N/A'}
                            </td>

                            {/* Status Badge */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                  isActive
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                                  }`}
                                />
                                {emp.status}
                              </span>
                            </td>

                            {/* HR Actions */}
                            {isHrAdmin && (
                              <td className="px-5 py-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  {/* Edit Button */}
                                  <button
                                    onClick={() => setSelectedEditEmployee(emp)}
                                    className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition"
                                    title="Edit Employee"
                                    aria-label={`Edit ${emp.fullName}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>

                                  {/* Activate/Deactivate Toggle Button */}
                                  <button
                                    onClick={() => setSelectedStatusEmployee(emp)}
                                    className={`p-1.5 rounded-lg border transition ${
                                      isActive
                                        ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white'
                                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-600 hover:text-white'
                                    }`}
                                    title={isActive ? 'Deactivate Employee' : 'Activate Employee'}
                                    aria-label={`${isActive ? 'Deactivate' : 'Activate'} ${emp.fullName}`}
                                  >
                                    <Power className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card Layout (For Mobile / Tablet viewports) */}
              <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredEmployees.map((emp) => {
                  const isActive = emp.status === EmploymentStatus.ACTIVE;
                  return (
                    <div
                      key={emp.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4 shadow-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-xs font-semibold text-blue-400 block">
                            {emp.employeeCode}
                          </span>
                          <h3 className="text-base font-bold text-white">{emp.fullName}</h3>
                          <p className="text-xs text-slate-400">{emp.designation}</p>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isActive ? 'bg-emerald-400' : 'bg-slate-400'
                            }`}
                          />
                          {emp.status}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="font-mono text-slate-300 truncate">{emp.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span>{emp.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span>{emp.department}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span>
                            Joined:{' '}
                            {emp.joiningDate
                              ? new Date(emp.joiningDate).toISOString().split('T')[0]
                              : 'N/A'}
                          </span>
                        </div>
                        {emp.manager && (
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span>Manager: {emp.manager.fullName}</span>
                          </div>
                        )}
                      </div>

                      {/* Mobile Actions for HR_ADMIN */}
                      {isHrAdmin && (
                        <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                          <button
                            onClick={() => setSelectedEditEmployee(emp)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Edit Profile
                          </button>
                          <button
                            onClick={() => setSelectedStatusEmployee(emp)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition ${
                              isActive
                                ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white'
                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-600 hover:text-white'
                            }`}
                          >
                            <Power className="h-3.5 w-3.5" />
                            {isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchEmployees}
        managers={managerOptions}
      />

      {/* Edit Employee Modal */}
      <EditEmployeeModal
        isOpen={!!selectedEditEmployee}
        employee={selectedEditEmployee}
        onClose={() => setSelectedEditEmployee(null)}
        onSuccess={fetchEmployees}
        managers={managerOptions}
      />

      {/* Status Confirmation Modal */}
      <StatusConfirmationDialog
        isOpen={!!selectedStatusEmployee}
        employee={selectedStatusEmployee}
        onClose={() => setSelectedStatusEmployee(null)}
        onSuccess={fetchEmployees}
      />
    </div>
  );
}
