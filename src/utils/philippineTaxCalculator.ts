export interface StatutoryDeductions {
  sss: number;
  philHealth: number;
  pagIbig: number;
  taxWithheld: number;
  totalStatutory: number;
}

export interface TardinessCalculation {
  lateMinutes: number;
  tardinessDeduction: number;
}

function round(val: number): number {
  return Math.round(val * 100) / 100;
}

/**
 * Calculates SSS employee contribution based on Philippine SSS tables.
 * Monthly Salary Credit (MSC) ranges from 4,000 to 30,000. Employee rate is 4.5%.
 */
export function calculateSss(monthlyBasic: number): number {
  if (monthlyBasic <= 0) return 0;
  const clampedMsc = Math.min(Math.max(monthlyBasic, 4000), 30000);
  // Rounded to nearest 500 step
  const mscStep = Math.round(clampedMsc / 500) * 500;
  const employeeRate = 0.045;
  return round(mscStep * employeeRate);
}

/**
 * Calculates PhilHealth employee contribution.
 * Standard rate is 5% total (2.5% employee share), floor is ₱10,000, ceiling is ₱100,000.
 */
export function calculatePhilHealth(monthlyBasic: number): number {
  if (monthlyBasic <= 0) return 0;
  const clampedBasic = Math.min(Math.max(monthlyBasic, 10000), 100000);
  const employeeRate = 0.025;
  return round(clampedBasic * employeeRate);
}

/**
 * Calculates Pag-IBIG (HDMF) employee contribution.
 * 2% of monthly basic, capped at ₱200 (mandatory ceiling).
 */
export function calculatePagIbig(monthlyBasic: number): number {
  if (monthlyBasic <= 0) return 0;
  const raw = monthlyBasic * 0.02;
  return round(Math.min(raw, 200));
}

/**
 * Calculates BIR Withholding Tax under Philippine TRAIN Law graduated tax tables.
 * Supports monthly and semi-monthly calculation.
 */
export function calculateWithholdingTax(taxableIncome: number, isSemiMonthly = false): number {
  if (taxableIncome <= 0) return 0;

  if (isSemiMonthly) {
    // Semi-monthly tax brackets
    if (taxableIncome <= 10417) return 0;
    if (taxableIncome <= 16666) {
      return round((taxableIncome - 10417) * 0.15);
    }
    if (taxableIncome <= 33333) {
      return round(937.5 + (taxableIncome - 16666) * 0.2);
    }
    if (taxableIncome <= 83333) {
      return round(4270.9 + (taxableIncome - 33333) * 0.25);
    }
    if (taxableIncome <= 333333) {
      return round(16770.9 + (taxableIncome - 83333) * 0.3);
    }
    return round(91770.9 + (taxableIncome - 333333) * 0.35);
  }

  // Monthly tax brackets
  if (taxableIncome <= 20833) return 0;
  if (taxableIncome <= 33332) {
    return round((taxableIncome - 20833) * 0.15);
  }
  if (taxableIncome <= 66666) {
    return round(1875 + (taxableIncome - 33333) * 0.2);
  }
  if (taxableIncome <= 166666) {
    return round(8541.8 + (taxableIncome - 66667) * 0.25);
  }
  if (taxableIncome <= 666666) {
    return round(33541.8 + (taxableIncome - 166667) * 0.3);
  }
  return round(183541.8 + (taxableIncome - 666667) * 0.35);
}

/**
 * Calculates tardiness penalty from late minutes and daily rate.
 * Assumes standard 8 hours per day.
 */
export function calculateTardiness(
  dailyFunctionalRate: number,
  lateMinutes: number,
  standardDailyHours = 8
): TardinessCalculation {
  if (dailyFunctionalRate <= 0 || lateMinutes <= 0) {
    return { lateMinutes: 0, tardinessDeduction: 0 };
  }
  const hourlyRate = dailyFunctionalRate / standardDailyHours;
  const minuteRate = hourlyRate / 60;
  const tardinessDeduction = round(minuteRate * lateMinutes);
  return { lateMinutes, tardinessDeduction };
}

/**
 * Computes all statutory contributions and taxes.
 */
export function calculateStatutoryAndTaxes(params: {
  basicSalary: number;
  allowances: number;
  gasoline: number;
  tardinessDeduction: number;
  isSemiMonthly?: boolean;
  profileEmployeeShare?: number | null;
}): StatutoryDeductions {
  const {
    basicSalary,
    allowances,
    gasoline,
    tardinessDeduction,
    isSemiMonthly = false,
    profileEmployeeShare,
  } = params;

  // SSS, PhilHealth, Pag-IBIG
  let sss = calculateSss(basicSalary);
  let philHealth = calculatePhilHealth(basicSalary);
  let pagIbig = calculatePagIbig(basicSalary);

  if (isSemiMonthly) {
    sss = round(sss / 2);
    philHealth = round(philHealth / 2);
    pagIbig = round(pagIbig / 2);
  }

  // If the employee profile has a custom pre-set employeeShare that is non-zero,
  // we can use it to proportionally scale or adjust if desired, or keep the computed breakdown.
  if (profileEmployeeShare && profileEmployeeShare > 0) {
    const defaultSum = sss + philHealth + pagIbig;
    if (defaultSum > 0) {
      const ratio = profileEmployeeShare / defaultSum;
      sss = round(sss * ratio);
      philHealth = round(philHealth * ratio);
      pagIbig = round(profileEmployeeShare - sss - philHealth);
      if (pagIbig < 0) pagIbig = 0;
    }
  }

  const statutoryTotal = round(sss + philHealth + pagIbig);
  const grossPay = round(basicSalary + allowances + gasoline);
  const taxableIncome = Math.max(0, round(grossPay - statutoryTotal - tardinessDeduction));
  const taxWithheld = calculateWithholdingTax(taxableIncome, isSemiMonthly);

  return {
    sss,
    philHealth,
    pagIbig,
    taxWithheld,
    totalStatutory: round(statutoryTotal + taxWithheld),
  };
}
