import fs from 'fs';
import path from 'path';
import { initializeApp, setLogLevel } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { DatabaseSchema, School, Teacher, Student, TestResult } from '../types';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Sample data for 2-school demo
const SEED_SCHOOLS: School[] = [
  {
    School_ID: 'SCH001',
    School_Name: 'Govt Primary School, Rajendranagar',
    District: 'Rangareddy',
    Block_or_Village: 'Rajendranagar'
  },
  {
    School_ID: 'SCH002',
    School_Name: 'Govt Primary School, Gachibowli',
    District: 'Rangareddy',
    Block_or_Village: 'Serilingampally'
  }
];

const SEED_TEACHERS: Teacher[] = [
  {
    Teacher_ID: 'TCH001',
    Teacher_Name: 'Anitha Reddy',
    Phone_Number: '9876543210',
    School_ID: 'SCH001',
    Role: 'Teacher'
  },
  {
    Teacher_ID: 'TCH002',
    Teacher_Name: 'Ramesh Kumar',
    Phone_Number: '8765432109',
    School_ID: 'SCH002',
    Role: 'Teacher'
  },
  {
    Teacher_ID: 'TCH003',
    Teacher_Name: 'Admin User',
    Phone_Number: '9999999999',
    School_ID: 'SCH001',
    Role: 'Admin'
  }
];

const SEED_STUDENTS: Student[] = [
  // School 1 (SCH001), Teacher 1 (TCH001)
  { Student_ID: 'STU001', Student_Name: 'Rahul Sharma', Grade: 3, Section: 'A', School_ID: 'SCH001', Teacher_ID: 'TCH001' },
  { Student_ID: 'STU002', Student_Name: 'Priya Patel', Grade: 3, Section: 'A', School_ID: 'SCH001', Teacher_ID: 'TCH001' },
  { Student_ID: 'STU003', Student_Name: 'Vikram Singh', Grade: 3, Section: 'B', School_ID: 'SCH001', Teacher_ID: 'TCH001' },
  { Student_ID: 'STU004', Student_Name: 'Divya Nair', Grade: 4, Section: 'A', School_ID: 'SCH001', Teacher_ID: 'TCH001' },
  { Student_ID: 'STU005', Student_Name: 'Arjun Rao', Grade: 4, Section: 'A', School_ID: 'SCH001', Teacher_ID: 'TCH001' },
  { Student_ID: 'STU006', Student_Name: 'Sandeep Kumar', Grade: 5, Section: 'A', School_ID: 'SCH001', Teacher_ID: 'TCH001' },
  { Student_ID: 'STU007', Student_Name: 'Kavitha J', Grade: 5, Section: 'A', School_ID: 'SCH001', Teacher_ID: 'TCH001' },

  // School 2 (SCH002), Teacher 2 (TCH002)
  { Student_ID: 'STU008', Student_Name: 'Mohammed Ali', Grade: 3, Section: 'A', School_ID: 'SCH002', Teacher_ID: 'TCH002' },
  { Student_ID: 'STU009', Student_Name: 'Sneha Patil', Grade: 3, Section: 'A', School_ID: 'SCH002', Teacher_ID: 'TCH002' },
  { Student_ID: 'STU010', Student_Name: 'Deepa R', Grade: 4, Section: 'A', School_ID: 'SCH002', Teacher_ID: 'TCH002' },
  { Student_ID: 'STU011', Student_Name: 'Karthik S', Grade: 4, Section: 'B', School_ID: 'SCH002', Teacher_ID: 'TCH002' },
  { Student_ID: 'STU012', Student_Name: 'Manoj Kumar', Grade: 5, Section: 'A', School_ID: 'SCH002', Teacher_ID: 'TCH002' },
  { Student_ID: 'STU013', Student_Name: 'Swetha N', Grade: 5, Section: 'B', School_ID: 'SCH002', Teacher_ID: 'TCH002' }
];

// Load Firebase configuration
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firestoreDb: any = null;

if (fs.existsSync(configPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    setLogLevel('error');
    const firebaseApp = initializeApp(config);
    const dbId = config.firestoreDatabaseId || '(default)';
    firestoreDb = getFirestore(firebaseApp, dbId);
    console.log(`[Firebase] Firestore initialized successfully with database ID: ${dbId}`);
  } catch (e) {
    console.error('[Firebase] Error initializing Firestore:', e);
  }
} else {
  console.warn('[Firebase] Configuration file not found at:', configPath);
}

export class DBStore {
  private static init() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initialDb: DatabaseSchema = {
        schools: SEED_SCHOOLS,
        teachers: SEED_TEACHERS,
        students: SEED_STUDENTS,
        results: []
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    }
  }

  private static read(): DatabaseSchema {
    this.init();
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading DB, re-initializing...', e);
      const initialDb: DatabaseSchema = {
        schools: SEED_SCHOOLS,
        teachers: SEED_TEACHERS,
        students: SEED_STUDENTS,
        results: []
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }
  }

  private static write(db: DatabaseSchema) {
    this.init();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  }

  // --- Seed Firestore if empty ---
  public static async seedFirestore() {
    if (!firestoreDb) {
      console.warn('[Firebase] Cannot seed Firestore because SDK is not initialized.');
      return;
    }
    try {
      console.log('[Firebase] Checking if Firestore collections need seeding...');

      // 1. Seed schools
      const schoolsCol = collection(firestoreDb, 'schools');
      const schoolsSnap = await getDocs(schoolsCol);
      if (schoolsSnap.empty) {
        console.log('[Firebase] Seeding schools collection...');
        for (const school of SEED_SCHOOLS) {
          await setDoc(doc(firestoreDb, 'schools', school.School_ID), school);
        }
      }

      // 2. Seed teachers
      const teachersCol = collection(firestoreDb, 'teachers');
      const teachersSnap = await getDocs(teachersCol);
      if (teachersSnap.empty) {
        console.log('[Firebase] Seeding teachers collection...');
        for (const teacher of SEED_TEACHERS) {
          await setDoc(doc(firestoreDb, 'teachers', teacher.Teacher_ID), teacher);
        }
      }

      // 3. Seed students
      const studentsCol = collection(firestoreDb, 'students');
      const studentsSnap = await getDocs(studentsCol);
      if (studentsSnap.empty) {
        console.log('[Firebase] Seeding students collection...');
        for (const student of SEED_STUDENTS) {
          await setDoc(doc(firestoreDb, 'students', student.Student_ID), student);
        }
      }

      console.log('[Firebase] Firestore checking/seeding completed.');
    } catch (e) {
      console.error('[Firebase] Failed to check or seed Firestore collections:', e);
    }
  }

  // --- Auth API ---
  public static async findTeacherByPhone(phone: string): Promise<Teacher | null> {
    const normalizedPhone = phone.trim().replace(/[\s-+]/g, '');
    
    if (normalizedPhone === '8500127713' || normalizedPhone === '9908143716') {
      const isAdmin1 = normalizedPhone === '8500127713';
      const primaryAdmin: Teacher = {
        Teacher_ID: isAdmin1 ? 'TCH_PRIMARY_ADMIN' : 'TCH_SUPER_ADMIN_2',
        Teacher_Name: isAdmin1 ? 'Primary Admin' : 'Super Admin 2',
        Phone_Number: normalizedPhone,
        School_ID: 'SCH001',
        Role: 'Admin'
      };
      
      if (firestoreDb) {
        try {
          const docRef = doc(firestoreDb, 'teachers', primaryAdmin.Teacher_ID);
          const snap = await getDoc(docRef);
          if (!snap.exists()) {
            await setDoc(docRef, primaryAdmin);
            console.log(`[Firebase] Seeded Primary Admin login (${normalizedPhone}) successfully.`);
          }
        } catch (e) {
          console.error('[Firebase] Failed to ensure primary admin in Firestore:', e);
        }
      }
      
      // Also update local cache
      const db = this.read();
      if (!db.teachers.find(t => t.Teacher_ID === primaryAdmin.Teacher_ID)) {
        db.teachers.push(primaryAdmin);
        this.write(db);
      }
      
      return primaryAdmin;
    }

    const teachers = await this.getTeachers();
    return teachers.find(t => {
      const tPhone = t.Phone_Number.trim().replace(/[\s-+]/g, '');
      return tPhone === normalizedPhone || tPhone.endsWith(normalizedPhone) || normalizedPhone.endsWith(tPhone);
    }) || null;
  }

  // --- Schools API ---
  public static async getSchools(): Promise<School[]> {
    if (firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'schools'));
        const schools: School[] = [];
        snap.forEach(docSnap => schools.push(docSnap.data() as School));
        
        // Update local JSON cache
        if (schools.length > 0) {
          const db = this.read();
          db.schools = schools;
          this.write(db);
          return schools;
        }
      } catch (e) {
        console.error('[Firebase] Failed to get schools from Firestore, falling back to local DB:', e);
      }
    }
    return this.read().schools;
  }

  // --- Teachers API ---
  public static async getTeachers(): Promise<Teacher[]> {
    if (firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'teachers'));
        const teachers: Teacher[] = [];
        snap.forEach(docSnap => teachers.push(docSnap.data() as Teacher));

        // Update local JSON cache
        if (teachers.length > 0) {
          const db = this.read();
          db.teachers = teachers;
          this.write(db);
          return teachers;
        }
      } catch (e) {
        console.error('[Firebase] Failed to get teachers from Firestore, falling back to local DB:', e);
      }
    }
    return this.read().teachers;
  }

  // --- Students API ---
  public static async getStudents(schoolId?: string, teacherId?: string, grade?: number): Promise<Student[]> {
    let students: Student[] = [];
    if (firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'students'));
        snap.forEach(docSnap => students.push(docSnap.data() as Student));

        // Update local JSON cache
        if (students.length > 0) {
          const db = this.read();
          db.students = students;
          this.write(db);
        }
      } catch (e) {
        console.error('[Firebase] Failed to get students from Firestore, falling back to local DB:', e);
        students = this.read().students;
      }
    } else {
      students = this.read().students;
    }

    let filtered = students;
    if (schoolId) {
      filtered = filtered.filter(s => s.School_ID === schoolId);
    }
    if (teacherId) {
      filtered = filtered.filter(s => s.Teacher_ID === teacherId);
    }
    if (grade) {
      filtered = filtered.filter(s => s.Grade === grade);
    }
    return filtered;
  }

  // --- Results API ---
  public static async getResults(filters?: { schoolId?: string; grade?: number; teacherId?: string; date?: string }): Promise<TestResult[]> {
    let results: TestResult[] = [];
    if (firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'results'));
        snap.forEach(docSnap => results.push(docSnap.data() as TestResult));

        // Update local JSON cache
        const db = this.read();
        db.results = results;
        this.write(db);
      } catch (e) {
        console.error('[Firebase] Failed to get results from Firestore, falling back to local DB:', e);
        results = this.read().results;
      }
    } else {
      results = this.read().results;
    }

    if (!filters) return results;

    const { schoolId, grade, teacherId, date } = filters;

    // Filter by date
    if (date) {
      results = results.filter(r => r.Test_Date === date);
    }

    // Filter by teacher
    if (teacherId) {
      results = results.filter(r => r.Teacher_ID === teacherId);
    }

    // Filter by school and grade requires linking with students
    if (schoolId || grade) {
      const students = await this.getStudents();
      results = results.filter(r => {
        const student = students.find(s => s.Student_ID === r.Student_ID);
        if (!student) return false;
        if (schoolId && student.School_ID !== schoolId) return false;
        if (grade && student.Grade !== grade) return false;
        return true;
      });
    }

    return results;
  }

  public static async getResultsForClass(teacherId: string, grade: number, date: string): Promise<TestResult[]> {
    const students = await this.getStudents(undefined, teacherId, grade);
    const classStudentIds = students.map(s => s.Student_ID);

    const allResults = await this.getResults({ teacherId, date });
    return allResults.filter(r => classStudentIds.includes(r.Student_ID));
  }

  public static async saveResult(result: Partial<TestResult> & { Student_ID: string; Test_Date: string; Teacher_ID: string }): Promise<TestResult> {
    const now = new Date().toISOString();

    // Helper to compute total marks safely
    const calcTotal = (r: Partial<TestResult>): number => {
      const know = Number(r.Know ?? 0);
      const read = Number(r.Read ?? 0);
      const spell = Number(r.Spell ?? 0);
      const cwRead = Number(r.Camera_Word_Read ?? 0);
      const cwSpell = Number(r.Camera_Word_Spell ?? 0);
      return know + read + spell + cwRead + cwSpell;
    };

    let current: TestResult | null = null;
    const docId = `${result.Student_ID}_${result.Test_Date}`;

    // Try fetching existing result from Firestore first to merge correctly
    if (firestoreDb) {
      try {
        const docRef = doc(firestoreDb, 'results', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          current = docSnap.data() as TestResult;
        }
      } catch (e) {
        console.error('[Firebase] Failed to fetch existing result for merge from Firestore:', e);
      }
    }

    // Local DB lookup fallback if Firestore lookup failed or returned empty
    if (!current) {
      const db = this.read();
      const existing = db.results.find(
        r => r.Student_ID === result.Student_ID && r.Test_Date === result.Test_Date
      );
      if (existing) {
        current = existing;
      }
    }

    let updatedResult: TestResult;

    if (current) {
      // Merge with existing record
      updatedResult = {
        ...current,
        ...result,
        Know: result.Know !== undefined ? result.Know : current.Know,
        Read: result.Read !== undefined ? result.Read : current.Read,
        Spell: result.Spell !== undefined ? result.Spell : current.Spell,
        Camera_Word_Read: result.Camera_Word_Read !== undefined ? result.Camera_Word_Read : current.Camera_Word_Read,
        Camera_Word_Spell: result.Camera_Word_Spell !== undefined ? result.Camera_Word_Spell : current.Camera_Word_Spell,
        Teacher_ID: result.Teacher_ID, // Use current saving teacher
        Last_Updated: now,
        Notes: result.Notes !== undefined ? result.Notes : current.Notes,
        Total_Marks: 0 // Will compute below
      };
    } else {
      // Create new record
      updatedResult = {
        Student_ID: result.Student_ID,
        Test_Date: result.Test_Date,
        Know: result.Know ?? null,
        Read: result.Read ?? null,
        Spell: result.Spell ?? null,
        Camera_Word_Read: result.Camera_Word_Read ?? null,
        Camera_Word_Spell: result.Camera_Word_Spell ?? null,
        Total_Marks: 0, // Will compute below
        Teacher_ID: result.Teacher_ID,
        Last_Updated: now,
        Notes: result.Notes ?? ''
      };
    }

    updatedResult.Total_Marks = calcTotal(updatedResult);

    // Save to Firestore
    if (firestoreDb) {
      try {
        const docRef = doc(firestoreDb, 'results', docId);
        await setDoc(docRef, updatedResult);
        console.log(`[Firebase] Successfully saved result ${docId} to Firestore.`);
      } catch (e) {
        console.error('[Firebase] Failed to save result to Firestore:', e);
      }
    }

    // Dual-write/cache locally
    const db = this.read();
    const existingIndex = db.results.findIndex(
      r => r.Student_ID === result.Student_ID && r.Test_Date === result.Test_Date
    );

    if (existingIndex !== -1) {
      db.results[existingIndex] = updatedResult;
    } else {
      db.results.push(updatedResult);
    }
    this.write(db);

    return updatedResult;
  }

  // --- Save / Delete School ---
  public static async saveSchool(school: School): Promise<School> {
    if (firestoreDb) {
      try {
        const docRef = doc(firestoreDb, 'schools', school.School_ID);
        await setDoc(docRef, school);
      } catch (e) {
        console.error('[Firebase] Failed to save school to Firestore:', e);
      }
    }
    const db = this.read();
    const idx = db.schools.findIndex(s => s.School_ID === school.School_ID);
    if (idx !== -1) {
      db.schools[idx] = school;
    } else {
      db.schools.push(school);
    }
    this.write(db);
    return school;
  }

  public static async deleteSchool(schoolId: string): Promise<boolean> {
    if (firestoreDb) {
      try {
        const docRef = doc(firestoreDb, 'schools', schoolId);
        await deleteDoc(docRef);
      } catch (e) {
        console.error('[Firebase] Failed to delete school from Firestore:', e);
      }
    }
    const db = this.read();
    db.schools = db.schools.filter(s => s.School_ID !== schoolId);
    this.write(db);
    return true;
  }

  // --- Save / Delete Teacher (Co-Admin / User) ---
  public static async saveTeacher(teacher: Teacher): Promise<Teacher> {
    if (firestoreDb) {
      try {
        const docRef = doc(firestoreDb, 'teachers', teacher.Teacher_ID);
        await setDoc(docRef, teacher);
      } catch (e) {
        console.error('[Firebase] Failed to save teacher to Firestore:', e);
      }
    }
    const db = this.read();
    const idx = db.teachers.findIndex(t => t.Teacher_ID === teacher.Teacher_ID);
    if (idx !== -1) {
      db.teachers[idx] = teacher;
    } else {
      db.teachers.push(teacher);
    }
    this.write(db);
    return teacher;
  }

  public static async deleteTeacher(teacherId: string): Promise<boolean> {
    if (firestoreDb) {
      try {
        const docRef = doc(firestoreDb, 'teachers', teacherId);
        await deleteDoc(docRef);
      } catch (e) {
        console.error('[Firebase] Failed to delete teacher from Firestore:', e);
      }
    }
    const db = this.read();
    db.teachers = db.teachers.filter(t => t.Teacher_ID !== teacherId);
    this.write(db);
    return true;
  }

  // --- Save / Delete Student ---
  public static async saveStudent(student: Student): Promise<Student> {
    if (firestoreDb) {
      try {
        const docRef = doc(firestoreDb, 'students', student.Student_ID);
        await setDoc(docRef, student);
      } catch (e) {
        console.error('[Firebase] Failed to save student to Firestore:', e);
      }
    }
    const db = this.read();
    const idx = db.students.findIndex(s => s.Student_ID === student.Student_ID);
    if (idx !== -1) {
      db.students[idx] = student;
    } else {
      db.students.push(student);
    }
    this.write(db);
    return student;
  }

  public static async deleteStudent(studentId: string): Promise<boolean> {
    if (firestoreDb) {
      try {
        const docRef = doc(firestoreDb, 'students', studentId);
        await deleteDoc(docRef);
      } catch (e) {
        console.error('[Firebase] Failed to delete student from Firestore:', e);
      }
    }
    const db = this.read();
    db.students = db.students.filter(s => s.Student_ID !== studentId);
    this.write(db);
    return true;
  }

  // --- Custom Districts API ---
  public static async getDistricts(): Promise<string[]> {
    const defaultDistricts = ['Rangareddy', 'Hyderabad', 'Medchal-Malkajgiri', 'Sangareddy', 'Nalgonda', 'Warangal', 'Karimnagar'];
    if (firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'districts'));
        const list: string[] = [];
        snap.forEach(docSnap => {
          const data = docSnap.data();
          if (data && data.name) {
            list.push(data.name);
          }
        });
        if (list.length > 0) {
          const combined = Array.from(new Set([...defaultDistricts, ...list]));
          return combined;
        }
      } catch (e) {
        console.error('[Firebase] Failed to get districts from Firestore:', e);
      }
    }
    return defaultDistricts;
  }

  public static async saveDistrict(name: string): Promise<string> {
    const trimmed = name.trim();
    if (!trimmed) return trimmed;
    if (firestoreDb) {
      try {
        const docRef = doc(firestoreDb, 'districts', trimmed);
        await setDoc(docRef, { name: trimmed });
      } catch (e) {
        console.error('[Firebase] Failed to save district to Firestore:', e);
      }
    }
    return trimmed;
  }
}
