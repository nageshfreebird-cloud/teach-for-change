import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { DBStore } from './src/db/db_store';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware
  app.use(express.json());

  // --- Seed Firestore if empty ---
  await DBStore.seedFirestore();

  // --- API Routes ---

  // Auth: Login with Phone Number
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: 'Phone number is required.' });
      }

      const teacher = await DBStore.findTeacherByPhone(phone);
      if (!teacher) {
        return res.status(404).json({ error: 'Teacher with this phone number is not registered.' });
      }

      // Bypasses OTP entirely and logs in immediately
      return res.json({
        success: true,
        teacher,
        token: `sim-jwt-${teacher.Teacher_ID}-${Date.now()}`
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Server error' });
    }
  });

  // Get Schools (Admin only or for setup)
  app.get('/api/schools', async (req, res) => {
    try {
      const schools = await DBStore.getSchools();
      res.json(schools);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get Teachers
  app.get('/api/teachers', async (req, res) => {
    try {
      const teachers = await DBStore.getTeachers();
      res.json(teachers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get Students for Teacher
  app.get('/api/teacher/students', async (req, res) => {
    try {
      const { teacherId, grade } = req.query;
      if (!teacherId) {
        return res.status(400).json({ error: 'Teacher ID is required' });
      }

      const parsedGrade = grade ? Number(grade) : undefined;
      const students = await DBStore.getStudents(undefined, teacherId as string, parsedGrade);
      res.json(students);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get Results for Class
  app.get('/api/teacher/results', async (req, res) => {
    try {
      const { teacherId, grade, date } = req.query;
      if (!teacherId || !grade || !date) {
        return res.status(400).json({ error: 'teacherId, grade, and date are required.' });
      }

      const results = await DBStore.getResultsForClass(
        teacherId as string,
        Number(grade),
        date as string
      );
      res.json(results);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Save/Update Assessment Result (Auto-saves immediately)
  app.post('/api/results', async (req, res) => {
    try {
      const { Student_ID, Test_Date, Test_Type, Teacher_ID, Know, Read, Spell, Camera_Word_Read, Camera_Word_Spell, Notes } = req.body;

      if (!Student_ID || !Test_Date || !Teacher_ID || !Test_Type) {
        return res.status(400).json({ error: 'Student_ID, Test_Date, Test_Type, and Teacher_ID are required.' });
      }

      const savedResult = await DBStore.saveResult({
        Student_ID,
        Test_Date,
        Test_Type,
        Teacher_ID,
        Know: Know !== undefined ? Know : undefined,
        Read: Read !== undefined ? Read : undefined,
        Spell: Spell !== undefined ? Spell : undefined,
        Camera_Word_Read: Camera_Word_Read !== undefined ? Camera_Word_Read : undefined,
        Camera_Word_Spell: Camera_Word_Spell !== undefined ? Camera_Word_Spell : undefined,
        Notes: Notes !== undefined ? Notes : undefined
      });

      res.json({ success: true, result: savedResult });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Settings API
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await DBStore.getSettings();
      res.json(settings);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      const { Active_Test } = req.body;
      if (!Active_Test) {
        return res.status(400).json({ error: 'Active_Test is required' });
      }
      const updated = await DBStore.saveSettings({ Active_Test });
      res.json({ success: true, settings: updated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin Dashboard Data
  app.get('/api/admin/dashboard', async (req, res) => {
    try {
      const schools = await DBStore.getSchools();
      const teachers = await DBStore.getTeachers();
      const students = await DBStore.getStudents();
      const results = await DBStore.getResults();
      const districts = await DBStore.getDistricts();

      res.json({
        schools,
        teachers,
        students,
        results,
        districts
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Districts API
  app.get('/api/districts', async (req, res) => {
    try {
      const districts = await DBStore.getDistricts();
      res.json(districts);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/districts', async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'District name is required' });
      const saved = await DBStore.saveDistrict(name);
      res.json({ success: true, district: saved });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Schools CRUD
  app.post('/api/schools', async (req, res) => {
    try {
      const school = req.body;
      if (!school.School_ID || !school.School_Name) {
        return res.status(400).json({ error: 'School_ID and School_Name are required' });
      }
      const saved = await DBStore.saveSchool(school);
      res.json({ success: true, school: saved });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/schools/:id', async (req, res) => {
    try {
      await DBStore.deleteSchool(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Teachers CRUD
  app.post('/api/teachers', async (req, res) => {
    try {
      const teacher = req.body;
      if (!teacher.Teacher_ID || !teacher.Teacher_Name || !teacher.Phone_Number) {
        return res.status(400).json({ error: 'Teacher_ID, Teacher_Name, and Phone_Number are required' });
      }
      const saved = await DBStore.saveTeacher(teacher);
      res.json({ success: true, teacher: saved });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/teachers/:id', async (req, res) => {
    try {
      await DBStore.deleteTeacher(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Students CRUD
  app.post('/api/students', async (req, res) => {
    try {
      const student = req.body;
      if (!student.Student_ID || !student.Student_Name || !student.School_ID || !student.Teacher_ID) {
        return res.status(400).json({ error: 'Student_ID, Student_Name, School_ID, and Teacher_ID are required' });
      }
      const saved = await DBStore.saveStudent(student);
      res.json({ success: true, student: saved });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/students/:id', async (req, res) => {
    try {
      await DBStore.deleteStudent(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Vite & Client App Servicing ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
