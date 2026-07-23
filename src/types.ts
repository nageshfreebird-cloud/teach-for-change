export interface School {
  School_ID: string;
  School_Name: string;
  District: string;
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

export interface TestResult {
  Student_ID: string;
  Test_Date: string; // YYYY-MM-DD
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

export interface DatabaseSchema {
  schools: School[];
  teachers: Teacher[];
  students: Student[];
  results: TestResult[];
}

export interface AuthState {
  teacher: Teacher | null;
  token: string | null;
}
