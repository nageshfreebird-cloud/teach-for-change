export interface School {
  School_ID: string;
  School_Name: string;
  School_Full_Name?: string;
  District: string;
  Mandal?: string;
  Block_or_Village: string;
}

export interface Teacher {
  Teacher_ID: string;
  Teacher_Name: string;
  Phone_Number: string;
  School_ID: string;
  Role: 'Teacher' | 'Admin';
  Is_Co_Admin?: boolean;
  Admin_Permissions?: {
    add_schools: boolean;
    add_teachers: boolean;
    add_students: boolean;
    assigned_districts: string[]; // ["all"] or array of district names
  };
}

export interface Student {
  Student_ID: string;
  Student_Name: string;
  Grade: 3 | 4 | 5;
  Section: string;
  School_ID: string;
  Teacher_ID: string;
}

export type TestPhase = 'Baseline' | 'Midline' | 'Endline' | 'None';

export interface TestResult {
  Student_ID: string;
  Test_Date: string; // YYYY-MM-DD
  Test_Type: TestPhase; // The phase this result belongs to
  Know: number | null;
  Read: number | null;
  Spell: number | null;
  Camera_Word_Read: number | null;
  Camera_Word_Spell: number | null;
  Total_Marks: number;
  Teacher_ID: string;
  Last_Updated: string; // ISO datetime string
  Notes: string;
}

export interface GlobalSettings {
  Active_Test: TestPhase;
}

export interface DatabaseSchema {
  schools: School[];
  teachers: Teacher[];
  students: Student[];
  results: TestResult[];
  settings: GlobalSettings;
}

export interface AuthState {
  teacher: Teacher | null;
  token: string | null;
}
