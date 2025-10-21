// types/payroll.ts
export type Attendance = { working_days?: number; present_days?: number };

export interface ComputeRequest {
  employee_id: string;
  payroll_period_id: number;
  attendance?: Attendance;
  regime?: string;
}

export interface PayslipBreakdownItem {
  amount: number;
  type?: string;
  is_taxable?: boolean;
}

export interface Payslip {
  employee_id: string;
  payroll_period_id: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  total_employer_cost?: number;
  breakdown: Record<string, PayslipBreakdownItem>;
  computed_at?: string;
}
