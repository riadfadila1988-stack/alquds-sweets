// Mock data for employees and working hours by date
// All times ISO strings; durations computed as difference
export type Employee = {
  id: string;
  name: string;
};

export type DaySession = {
  date: string; // YYYY-MM-DD
  start: string; // ISO
  end: string;   // ISO
};

export type EmployeeMonthlyData = {
  employee: Employee;
  sessions: DaySession[]; // within a month
};

// Simple helpers
export function parseYMD(date: Date): { y: number; m: number; d: number } {
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

export function ymKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function dateKey(d: Date) {
  return d.toISOString().split('T')[0];
}

export function minutesBetween(startISO: string, endISO: string) {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}

export function formatHM(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

// Generate mock employees
export const mockEmployees: Employee[] = [
  { id: 'e1', name: 'أحمد' },
  { id: 'e2', name: 'سارة' },
  { id: 'e3', name: 'محمد' },
];

// Build a few deterministic sessions for current and previous month
function buildMonthSessions(year: number, month: number): Record<string, DaySession[]> {
  const result: Record<string, DaySession[]> = {};
  // for demo, create sessions on days 1..5 for each employee
  const days = [1, 2, 3, 4, 5];
  for (const emp of mockEmployees) {
    result[emp.id] = days.map((d, idx) => {
      const start = new Date(year, month - 1, d, 8 + (idx % 2), 0, 0);
      const end = new Date(year, month - 1, d, 16 + (idx % 2), 0, 0);
      return {
        date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        start: start.toISOString(),
        end: end.toISOString(),
      };
    });
  }
  return result;
}

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const prev = new Date(currentYear, currentMonth - 2, 1);
const prevYear = prev.getFullYear();
const prevMonth = prev.getMonth() + 1;

const currentMonthData = buildMonthSessions(currentYear, currentMonth);
const prevMonthData = buildMonthSessions(prevYear, prevMonth);

// Main accessors
export function getEmployeesForMonth(year: number, month: number): EmployeeMonthlyData[] {
  const key = ymKey(year, month);
  const dataMap = key === ymKey(currentYear, currentMonth) ? currentMonthData :
                  key === ymKey(prevYear, prevMonth) ? prevMonthData : buildMonthSessions(year, month);
  return mockEmployees.map(emp => ({
    employee: emp,
    sessions: dataMap[emp.id] || [],
  }));
}

export function getEmployeeMonthDetail(employeeId: string, year: number, month: number): EmployeeMonthlyData | null {
  const list = getEmployeesForMonth(year, month);
  return list.find(e => e.employee.id === employeeId) || null;
}

export function sumMinutes(sessions: DaySession[]) {
  return sessions.reduce((acc, s) => acc + minutesBetween(s.start, s.end), 0);
}
