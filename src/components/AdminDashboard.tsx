import React, { useState, useEffect } from 'react';
import { read, utils } from 'xlsx';
import { School, Teacher, Student, TestResult } from '../types';
import Logo from './Logo';
import { 
  Filter, 
  Download, 
  Search, 
  RefreshCw, 
  BarChart3, 
  Users, 
  Building, 
  GraduationCap, 
  Calendar, 
  FileSpreadsheet, 
  LogOut, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Trash2,
  Shield,
  Check,
  X,
  MapPin,
  ClipboardList,
  ShieldAlert,
  Upload
} from 'lucide-react';

interface AdminDashboardProps {
  adminUser: Teacher;
  onLogout: () => void;
}

export default function AdminDashboard({ adminUser, onLogout }: AdminDashboardProps) {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<'assessments' | 'schools' | 'teachers' | 'students'>('assessments');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Database States
  const [data, setData] = useState<{
    schools: School[];
    teachers: Teacher[];
    students: Student[];
    results: TestResult[];
    districts: string[];
  }>({ schools: [], teachers: [], students: [], results: [], districts: [] });

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSchool, setFilterSchool] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterTeacher, setFilterTeacher] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - offset * 60 * 1000);
    return localToday.toISOString().split('T')[0];
  });

  // Manual Add Form States
  const [addMode, setAddMode] = useState<'manual' | 'batch' | null>(null);

  // School Form Inputs
  const [schoolId, setSchoolId] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolDistrict, setSchoolDistrict] = useState('');
  const [schoolBlock, setSchoolBlock] = useState('');

  // District input
  const [newDistrictName, setNewDistrictName] = useState('');

  // Teacher Form Inputs
  const [teacherId, setTeacherId] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherSchoolId, setTeacherSchoolId] = useState('');
  const [teacherRole, setTeacherRole] = useState<'Teacher' | 'Admin'>('Teacher');
  const [teacherCanAddSchools, setTeacherCanAddSchools] = useState(false);
  const [teacherCanAddTeachers, setTeacherCanAddTeachers] = useState(false);
  const [teacherCanAddStudents, setTeacherCanAddStudents] = useState(false);
  const [teacherAssignedDistricts, setTeacherAssignedDistricts] = useState<string[]>(['all']);

  // Student Form Inputs
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentGrade, setStudentGrade] = useState<3 | 4 | 5>(3);
  const [studentSection, setStudentSection] = useState('A');
  const [studentSchoolId, setStudentSchoolId] = useState('');
  const [studentTeacherId, setStudentTeacherId] = useState('');

  // Batch Import States
  const [batchRawText, setBatchRawText] = useState('');
  const [parsedBatchCount, setParsedBatchCount] = useState(0);
  const [batchImportMethod, setBatchImportMethod] = useState<'paste' | 'file'>('paste');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Role Checks
  const isPrimaryAdmin = adminUser.Phone_Number === '8500127713';
  
  // Resolve standard permissions
  const permissions = isPrimaryAdmin 
    ? { add_schools: true, add_teachers: true, add_students: true, assigned_districts: ['all'] }
    : adminUser.Admin_Permissions || { add_schools: false, add_teachers: false, add_students: false, assigned_districts: [] };

  // Filter base lists based on Co-Admin's assigned districts
  const assignedDistricts = permissions.assigned_districts || ['all'];
  const isAllDistricts = isPrimaryAdmin || assignedDistricts.includes('all');

  const visibleSchools = data.schools.filter(s => isAllDistricts || assignedDistricts.includes(s.District));
  const visibleDistricts = data.districts.filter(d => isAllDistricts || assignedDistricts.includes(d));
  
  const visibleStudents = data.students.filter(student => {
    const sch = data.schools.find(s => s.School_ID === student.School_ID);
    return isAllDistricts || (sch && assignedDistricts.includes(sch.District));
  });

  const visibleTeachers = data.teachers.filter(teacher => {
    if (teacher.Is_Co_Admin) return true;
    const sch = data.schools.find(s => s.School_ID === teacher.School_ID);
    return isAllDistricts || (sch && assignedDistricts.includes(sch.District));
  });

  const visibleResults = data.results.filter(result => {
    const student = data.students.find(s => s.Student_ID === result.Student_ID);
    if (!student) return false;
    const sch = data.schools.find(s => s.School_ID === student.School_ID);
    return isAllDistricts || (sch && assignedDistricts.includes(sch.District));
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    setBatchRawText('');
    setUploadedFileName('');
    setBatchImportMethod('paste');
    setDragActive(false);
  }, [addMode, activeTab]);

  const processSpreadsheetFile = (file: File) => {
    if (!file) return;
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(extension || '')) {
      showFeedback('error', 'Unsupported file format. Please upload .xlsx, .xls, or .csv files.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fileData = e.target?.result;
        if (!fileData) {
          showFeedback('error', 'Could not read file data.');
          return;
        }

        const workbook = read(fileData, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const csvContent = utils.sheet_to_csv(worksheet);
        
        setBatchRawText(csvContent);
        setUploadedFileName(file.name);
        
        const rows = csvContent.split('\n').map(r => r.trim()).filter(Boolean);
        const count = rows.length > 1 ? rows.length - 1 : rows.length;
        showFeedback('success', `Loaded "${file.name}" (~${count} rows). Click import button to finalize.`);
      } catch (err: any) {
        console.error('File parsing error:', err);
        showFeedback('error', `Error parsing file: ${err.message || 'Unknown error'}`);
      }
    };
    reader.onerror = () => {
      showFeedback('error', 'FileReader error reading the spreadsheet file.');
    };
    reader.readAsBinaryString(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSpreadsheetFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSpreadsheetFile(e.dataTransfer.files[0]);
    }
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard');
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
        
        // Auto-initialize form school selectors with first school if available
        if (payload.schools && payload.schools.length > 0) {
          setTeacherSchoolId(payload.schools[0].School_ID);
          setStudentSchoolId(payload.schools[0].School_ID);
          
          // Auto-set teacher selector
          const schoolTeachers = payload.teachers.filter((t: Teacher) => t.School_ID === payload.schools[0].School_ID);
          if (schoolTeachers.length > 0) {
            setStudentTeacherId(schoolTeachers[0].Teacher_ID);
          }
        }
        
        if (payload.districts && payload.districts.length > 0) {
          setSchoolDistrict(payload.districts[0]);
        }
      } else {
        showFeedback('error', 'Failed to retrieve assessment data.');
      }
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
      showFeedback('error', 'Network error while contacting admin servers.');
    } finally {
      setLoading(false);
    }
  };

  const getSchoolName = (schoolId: string) => {
    const s = data.schools.find(sc => sc.School_ID === schoolId);
    return s ? s.School_Name : schoolId;
  };

  const getTeacherName = (teacherId: string) => {
    const t = data.teachers.find(tc => tc.Teacher_ID === teacherId);
    return t ? t.Teacher_Name : teacherId;
  };

  const isAssessmentComplete = (res: TestResult) => {
    return (
      res.Know !== null &&
      res.Read !== null &&
      res.Spell !== null &&
      res.Camera_Word_Read !== null &&
      res.Camera_Word_Spell !== null
    );
  };

  // --- CRUD API Calls ---
  
  // Add/Update District
  const handleAddDistrict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDistrictName.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/districts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDistrictName })
      });
      if (res.ok) {
        showFeedback('success', `District "${newDistrictName}" added successfully.`);
        setNewDistrictName('');
        await fetchDashboardData();
      } else {
        showFeedback('error', 'Failed to save district.');
      }
    } catch (err) {
      showFeedback('error', 'Network error adding district.');
    } finally {
      setActionLoading(false);
    }
  };

  // Add School
  const handleAddSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) {
      showFeedback('error', 'School Name is required.');
      return;
    }

    const finalId = schoolId.trim() || `SCH-${Math.floor(100 + Math.random() * 900)}`;
    const finalDistrict = schoolDistrict || 'Rangareddy';
    setActionLoading(true);

    try {
      const res = await fetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          School_ID: finalId,
          School_Name: schoolName.trim(),
          District: finalDistrict,
          Block_or_Village: schoolBlock.trim() || 'N/A'
        })
      });

      if (res.ok) {
        showFeedback('success', `School "${schoolName}" successfully saved with ID: ${finalId}`);
        setSchoolId('');
        setSchoolName('');
        setSchoolBlock('');
        setAddMode(null);
        await fetchDashboardData();
      } else {
        showFeedback('error', 'Server error saving school.');
      }
    } catch (err) {
      showFeedback('error', 'Network error. Could not save school.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete School
  const handleDeleteSchool = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this school? This will unlink but not remove associated students.')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/schools/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showFeedback('success', 'School removed successfully.');
        await fetchDashboardData();
      } else {
        showFeedback('error', 'Failed to delete school.');
      }
    } catch (err) {
      showFeedback('error', 'Network error deleting school.');
    } finally {
      setActionLoading(false);
    }
  };

  // Add Teacher / Co-Admin
  const handleAddTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim() || !teacherPhone.trim()) {
      showFeedback('error', 'Teacher Name and Phone Number are required.');
      return;
    }

    const finalId = teacherId.trim() || `TCH-${Math.floor(100 + Math.random() * 900)}`;
    setActionLoading(true);

    // Build permissions object
    const pObj = teacherRole === 'Admin' ? {
      add_schools: teacherCanAddSchools,
      add_teachers: teacherCanAddTeachers,
      add_students: teacherCanAddStudents,
      assigned_districts: teacherAssignedDistricts
    } : undefined;

    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Teacher_ID: finalId,
          Teacher_Name: teacherName.trim(),
          Phone_Number: teacherPhone.trim(),
          School_ID: teacherSchoolId,
          Role: teacherRole,
          Is_Co_Admin: teacherRole === 'Admin',
          Admin_Permissions: pObj
        })
      });

      if (res.ok) {
        showFeedback('success', `Teacher "${teacherName}" registered successfully with ID: ${finalId}`);
        setTeacherId('');
        setTeacherName('');
        setTeacherPhone('');
        setTeacherCanAddSchools(false);
        setTeacherCanAddTeachers(false);
        setTeacherCanAddStudents(false);
        setTeacherAssignedDistricts(['all']);
        setAddMode(null);
        await fetchDashboardData();
      } else {
        showFeedback('error', 'Server error registering teacher.');
      }
    } catch (err) {
      showFeedback('error', 'Network error. Could not register teacher.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Teacher
  const handleDeleteTeacher = async (id: string) => {
    if (id === 'TCH_PRIMARY_ADMIN') {
      showFeedback('error', 'Supreme Primary Admin cannot be deleted.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this teacher login?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/teachers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showFeedback('success', 'Teacher login removed successfully.');
        await fetchDashboardData();
      } else {
        showFeedback('error', 'Failed to delete teacher.');
      }
    } catch (err) {
      showFeedback('error', 'Network error deleting teacher.');
    } finally {
      setActionLoading(false);
    }
  };

  // Add Student
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentSchoolId || !studentTeacherId) {
      showFeedback('error', 'Student Name, School, and Assigned Teacher are required.');
      return;
    }

    const finalId = studentId.trim() || `STU-${Math.floor(1000 + Math.random() * 9000)}`;
    setActionLoading(true);

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Student_ID: finalId,
          Student_Name: studentName.trim(),
          Grade: studentGrade,
          Section: studentSection.trim() || 'A',
          School_ID: studentSchoolId,
          Teacher_ID: studentTeacherId
        })
      });

      if (res.ok) {
        showFeedback('success', `Student "${studentName}" added successfully with ID: ${finalId}`);
        setStudentId('');
        setStudentName('');
        setStudentSection('A');
        setAddMode(null);
        await fetchDashboardData();
      } else {
        showFeedback('error', 'Server error adding student.');
      }
    } catch (err) {
      showFeedback('error', 'Network error. Could not save student.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Student
  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this student and unlink their records?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showFeedback('success', 'Student removed successfully.');
        await fetchDashboardData();
      } else {
        showFeedback('error', 'Failed to delete student.');
      }
    } catch (err) {
      showFeedback('error', 'Network error deleting student.');
    } finally {
      setActionLoading(false);
    }
  };

  // Batch Parser / Importer
  const handleBatchImport = async () => {
    if (!batchRawText.trim()) {
      showFeedback('error', 'Please paste data to import.');
      return;
    }

    const lines = batchRawText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      showFeedback('error', 'Please paste data to import.');
      return;
    }

    setActionLoading(true);
    let successCount = 0;
    let failCount = 0;

    // Helper to parse line respecting CSV quotes and tabs
    const parseLine = (line: string): string[] => {
      if (line.includes('\t')) {
        // Tab-delimited (spreadsheets copy-paste)
        return line.split('\t').map(p => p.trim().replace(/^["']|["']$/g, ''));
      }
      
      // Comma-delimited (CSV style with quotes support)
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      return result;
    };

    try {
      let startIndex = 0;
      
      // Default mappings
      let idCol = 0;
      let nameCol = 1;
      let col3 = 2; // District for school, Phone for teacher, Grade for student
      let col4 = 3; // Block for school, School_ID for teacher, Section for student
      let col5 = 4; // Role for teacher, School_ID for student
      let col6 = 5; // Teacher_ID for student
      
      const firstRowParts = parseLine(lines[0]);
      
      if (activeTab === 'schools') {
        const isHeader = firstRowParts.some(p => {
          const lower = p.toLowerCase();
          return lower.includes('id') || lower.includes('name') || lower.includes('district') || lower.includes('block') || lower.includes('village');
        });
        
        if (isHeader) {
          startIndex = 1;
          firstRowParts.forEach((p, index) => {
            const l = p.toLowerCase().replace(/_/g, ' ');
            if (l.includes('id') || l.includes('code')) idCol = index;
            else if (l.includes('name') || l.includes('title')) nameCol = index;
            else if (l.includes('district') || l.includes('dist')) col3 = index;
            else if (l.includes('block') || l.includes('village') || l.includes('area')) col4 = index;
          });
        }
      } else if (activeTab === 'teachers') {
        const isHeader = firstRowParts.some(p => {
          const lower = p.toLowerCase();
          return lower.includes('id') || lower.includes('name') || lower.includes('phone') || lower.includes('school') || lower.includes('role');
        });
        
        if (isHeader) {
          startIndex = 1;
          firstRowParts.forEach((p, index) => {
            const l = p.toLowerCase().replace(/_/g, ' ');
            if (l.includes('teacher id') || (l.includes('id') && !l.includes('school'))) idCol = index;
            else if (l.includes('teacher name') || (l.includes('name') && !l.includes('school'))) nameCol = index;
            else if (l.includes('phone') || l.includes('mobile') || l.includes('contact')) col3 = index;
            else if (l.includes('school')) col4 = index;
            else if (l.includes('role') || l.includes('level') || l.includes('access')) col5 = index;
          });
        }
      } else if (activeTab === 'students') {
        const isHeader = firstRowParts.some(p => {
          const lower = p.toLowerCase();
          return lower.includes('id') || lower.includes('name') || lower.includes('grade') || lower.includes('class') || lower.includes('section') || lower.includes('school') || lower.includes('teacher');
        });
        
        if (isHeader) {
          startIndex = 1;
          firstRowParts.forEach((p, index) => {
            const l = p.toLowerCase().replace(/_/g, ' ');
            if (l.includes('student id') || (l.includes('id') && !l.includes('school') && !l.includes('teacher'))) idCol = index;
            else if (l.includes('student name') || (l.includes('name') && !l.includes('school') && !l.includes('teacher'))) nameCol = index;
            else if (l.includes('grade') || l.includes('class') || l.includes('standard')) col3 = index;
            else if (l.includes('section') || l.includes('sec')) col4 = index;
            else if (l.includes('school')) col5 = index;
            else if (l.includes('teacher') || l.includes('tutor') || l.includes('mentor')) col6 = index;
          });
        }
      }

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        const parts = parseLine(line);
        
        if (activeTab === 'schools') {
          // Format: ID, Name, District, Block_or_Village
          if (parts.length < 1) { failCount++; continue; }
          let id = parts[idCol] || '';
          let name = parts[nameCol] || '';
          
          if (!name && id) {
            name = id;
            id = `SCH-${Math.floor(100 + Math.random() * 900)}`;
          } else if (!id && name) {
            id = `SCH-${Math.floor(100 + Math.random() * 900)}`;
          } else if (!id && !name) {
            failCount++;
            continue;
          }

          if (id.includes(' ') || id.length > 15) {
            id = id.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 15) || `SCH-${Math.floor(100 + Math.random() * 900)}`;
          }
          
          const dist = parts[col3] || 'Rangareddy';
          const block = parts[col4] || 'N/A';
          
          await fetch('/api/schools', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ School_ID: id, School_Name: name, District: dist, Block_or_Village: block })
          });
          successCount++;
        } 
        
        else if (activeTab === 'teachers') {
          // Format: ID, Name, Phone_Number, School_ID, Role
          if (parts.length < 2) { failCount++; continue; }
          let id = parts[idCol] || '';
          let name = parts[nameCol] || '';
          let phone = parts[col3] || '';

          if (!id) {
            id = `TCH-${Math.floor(100 + Math.random() * 900)}`;
          }
          if (!phone) {
            if (id && id.match(/^\d+$/)) {
              phone = id;
              id = `TCH-${Math.floor(100 + Math.random() * 900)}`;
            } else {
              phone = '9999999999';
            }
          }
          if (!name) {
            name = 'Registered User';
          }

          const schId = parts[col4] || (data.schools[0]?.School_ID || 'SCH001');
          const rawRole = parts[col5] || 'Teacher';
          const role = (rawRole.toLowerCase().includes('admin') ? 'Admin' : 'Teacher') as 'Teacher' | 'Admin';
          
          await fetch('/api/teachers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Teacher_ID: id, Teacher_Name: name, Phone_Number: phone, School_ID: schId, Role: role })
          });
          successCount++;
        } 
        
        else if (activeTab === 'students') {
          // Format: ID, Name, Grade, Section, School_ID, Teacher_ID
          if (parts.length < 1) { failCount++; continue; }
          let id = parts[idCol] || '';
          let name = parts[nameCol] || '';
          
          if (!name && id) {
            name = id;
            id = `STU-${Math.floor(1000 + Math.random() * 9000)}`;
          } else if (!id && name) {
            id = `STU-${Math.floor(1000 + Math.random() * 9000)}`;
          } else if (!id && !name) {
            failCount++;
            continue;
          }

          if (!id.startsWith('STU')) {
            id = id.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 15) || `STU-${Math.floor(1000 + Math.random() * 9000)}`;
          }

          const rawGrade = parts[col3];
          const grade = Number(rawGrade || 3) as 3 | 4 | 5;
          const sec = parts[col4] || 'A';
          const schId = parts[col5] || (data.schools[0]?.School_ID || 'SCH001');
          const tchId = parts[col6] || (data.teachers.find(t => t.School_ID === schId)?.Teacher_ID || 'TCH001');

          await fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Student_ID: id, Student_Name: name, Grade: grade, Section: sec, School_ID: schId, Teacher_ID: tchId })
          });
          successCount++;
        }
      }

      showFeedback('success', `Import complete. Imported ${successCount} entries. Errors: ${failCount}`);
      setBatchRawText('');
      setAddMode(null);
      await fetchDashboardData();
    } catch (err) {
      showFeedback('error', 'Error occurred during bulk spreadsheet import.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle assigned district checkboxes for Co-Admin settings
  const toggleAssignedDistrict = (distName: string) => {
    if (distName === 'all') {
      if (teacherAssignedDistricts.includes('all')) {
        setTeacherAssignedDistricts([]);
      } else {
        setTeacherAssignedDistricts(['all']);
      }
    } else {
      let current = teacherAssignedDistricts.filter(x => x !== 'all');
      if (current.includes(distName)) {
        current = current.filter(x => x !== distName);
      } else {
        current.push(distName);
      }
      setTeacherAssignedDistricts(current);
    }
  };

  // Filter students & results lists
  const filteredStudents = visibleStudents.filter(student => {
    const matchesSearch = student.Student_Name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.Student_ID.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSchool = filterSchool === 'all' || student.School_ID === filterSchool;
    const matchesGrade = filterGrade === 'all' || String(student.Grade) === filterGrade;
    const matchesTeacher = filterTeacher === 'all' || student.Teacher_ID === filterTeacher;
    return matchesSearch && matchesSchool && matchesGrade && matchesTeacher;
  });

  const processedRecords = filteredStudents.map(student => {
    const res = data.results.find(
      r => r.Student_ID === student.Student_ID && (filterDate === 'all' || r.Test_Date === filterDate)
    );

    const fallbackResult: TestResult = {
      Student_ID: student.Student_ID,
      Test_Date: filterDate === 'all' ? 'Multiple' : filterDate,
      Know: null,
      Read: null,
      Spell: null,
      Camera_Word_Read: null,
      Camera_Word_Spell: null,
      Total_Marks: 0,
      Teacher_ID: student.Teacher_ID,
      Last_Updated: '',
      Notes: ''
    };

    return {
      student,
      result: res || fallbackResult,
      isAssessed: !!res,
      isCompleted: res ? isAssessmentComplete(res) : false
    };
  });

  // Overview Stats
  const totalStudentsCount = filteredStudents.length;
  const completedAssessmentsCount = processedRecords.filter(r => r.isCompleted).length;
  const completionPercent = totalStudentsCount > 0 ? Math.round((completedAssessmentsCount / totalStudentsCount) * 100) : 0;
  
  const assessedCompleted = processedRecords.filter(r => r.isCompleted);
  const averageScore = assessedCompleted.length > 0 
    ? (assessedCompleted.reduce((acc, curr) => acc + curr.result.Total_Marks, 0) / assessedCompleted.length).toFixed(1)
    : '0.0';

  // CSV Export
  const handleCSVExport = () => {
    const headers = [
      'Student ID', 'Student Name', 'Grade', 'Section', 'School ID', 'School Name', 
      'District', 'Teacher ID', 'Teacher Name', 'Test Date', 'Know Score (Max 10)', 
      'Read Score (Max 10)', 'Spell Score (Max 10)', 'Camera Word Read (Max 10)', 
      'Camera Word Spell (Max 10)', 'Total Marks (Max 50)', 'Status', 'Last Updated', 'Teacher Notes'
    ];

    const rows = processedRecords.map(rec => {
      const sch = data.schools.find(s => s.School_ID === rec.student.School_ID);
      const tch = data.teachers.find(t => t.Teacher_ID === rec.student.Teacher_ID);
      
      const statusText = rec.isCompleted 
        ? 'Completed' 
        : rec.isAssessed ? 'Partially Complete' : 'Pending Marks';

      return [
        rec.student.Student_ID,
        `"${rec.student.Student_Name.replace(/"/g, '""')}"`,
        rec.student.Grade,
        rec.student.Section,
        rec.student.School_ID,
        `"${sch ? sch.School_Name.replace(/"/g, '""') : rec.student.School_ID}"`,
        sch ? sch.District : '',
        rec.student.Teacher_ID,
        `"${tch ? tch.Teacher_Name.replace(/"/g, '""') : rec.student.Teacher_ID}"`,
        rec.result.Test_Date,
        rec.result.Know ?? '-',
        rec.result.Read ?? '-',
        rec.result.Spell ?? '-',
        rec.result.Camera_Word_Read ?? '-',
        rec.result.Camera_Word_Spell ?? '-',
        rec.result.Total_Marks,
        statusText,
        rec.result.Last_Updated ? new Date(rec.result.Last_Updated).toLocaleString() : '-',
        `"${(rec.result.Notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const formattedDate = filterDate === 'all' ? 'All_Dates' : filterDate;
    link.setAttribute('download', `tfc_phonics_assessments_${formattedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Premium Header bar */}
      <header className="bg-indigo-950 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.2),transparent_50%)] animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4.5 flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-xl shadow-lg overflow-hidden p-0.5 border border-white/20">
              <Logo className="w-10 h-10" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black tracking-tight text-white">Teach For Change</h1>
                <span className="px-2 py-0.5 text-[10px] bg-indigo-500/30 text-indigo-200 font-bold rounded-full uppercase tracking-wider border border-indigo-500/30">Admin</span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">English Literacy Assessments Admin Workspace</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-widest">
                {isPrimaryAdmin ? '👑 Supreme Primary Admin' : '💼 Co-Admin'}
              </span>
              <span className="text-xs font-extrabold text-indigo-300">{adminUser.Teacher_Name}</span>
            </div>
            <button
              id="btn-admin-logout"
              onClick={onLogout}
              className="inline-flex items-center space-x-2 py-2 px-3.5 bg-indigo-900 hover:bg-rose-900 hover:text-rose-100 border border-indigo-800/60 rounded-xl active:scale-95 transition-all text-xs font-bold text-indigo-200 cursor-pointer shadow-inner hover:border-rose-500/50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Global alert feedback messages */}
      {feedback && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-4 animate-fade-in">
          <div className={`p-4 rounded-xl border flex items-start space-x-3 shadow-md ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
              : 'bg-rose-50 border-rose-100 text-rose-800'
          }`}>
            <AlertCircle className={`w-5 h-5 flex-shrink-0 ${feedback.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`} />
            <div className="text-xs font-bold leading-relaxed">{feedback.message}</div>
          </div>
        </div>
      )}

      {/* Dynamic Tab Selector Navigation */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-indigo-100/50 sticky top-0 z-20 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-6 overflow-x-auto py-3">
            <button
              onClick={() => { setActiveTab('assessments'); setAddMode(null); }}
              className={`inline-flex items-center space-x-2 py-1.5 px-3 rounded-lg text-xs font-extrabold tracking-wide whitespace-nowrap transition-all ${
                activeTab === 'assessments'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                  : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Assessments Database</span>
            </button>

            <button
              onClick={() => { setActiveTab('schools'); setAddMode(null); }}
              className={`inline-flex items-center space-x-2 py-1.5 px-3 rounded-lg text-xs font-extrabold tracking-wide whitespace-nowrap transition-all ${
                activeTab === 'schools'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                  : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-900'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>Schools & Districts ({visibleSchools.length})</span>
            </button>

            <button
              onClick={() => { setActiveTab('teachers'); setAddMode(null); }}
              className={`inline-flex items-center space-x-2 py-1.5 px-3 rounded-lg text-xs font-extrabold tracking-wide whitespace-nowrap transition-all ${
                activeTab === 'teachers'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                  : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Teachers & Co-Admins ({visibleTeachers.length})</span>
            </button>

            <button
              onClick={() => { setActiveTab('students'); setAddMode(null); }}
              className={`inline-flex items-center space-x-2 py-1.5 px-3 rounded-lg text-xs font-extrabold tracking-wide whitespace-nowrap transition-all ${
                activeTab === 'students'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                  : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Students Directory ({visibleStudents.length})</span>
            </button>
          </nav>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col justify-center items-center py-24">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 mt-4 font-bold tracking-widest uppercase">Fetching encrypted data cloud...</p>
        </div>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          
          {/* TAB 1: ASSESSMENTS (READ ONLY STATISTICS & SEARCH LOGS) */}
          {activeTab === 'assessments' && (
            <div className="space-y-6">
              
              {/* Dashboard Summary Statistics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Metric Card 1: Total Registered Students */}
                <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm flex items-center justify-between group">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Assessed Target</span>
                    <span className="text-2xl font-black text-slate-800 block">{totalStudentsCount} Students</span>
                    <span className="text-xs text-slate-500 font-medium block mt-1">Filtered from database</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-teal-50/60 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                {/* Metric Card 2: Completed Entry */}
                <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm flex items-center justify-between group">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Completed Entry</span>
                    <span className="text-2xl font-black text-emerald-600 block">{completedAssessmentsCount} students</span>
                    <span className="text-xs text-slate-500 font-medium block mt-1">All 5 marks complete</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                {/* Metric Card 3: Completion Rate */}
                <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm flex items-center justify-between group">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Completion Rate</span>
                    <span className="text-2xl font-black text-slate-800 block">{completionPercent}%</span>
                    <div className="w-32 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div className="bg-teal-500 h-full rounded-full" style={{ width: `${completionPercent}%` }} />
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                </div>

                {/* Metric Card 4: English Average */}
                <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm flex items-center justify-between group">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">English Avg. Score</span>
                    <span className="text-2xl font-black text-amber-600 block">{averageScore} / 50</span>
                    <span className="text-xs text-slate-500 font-medium block mt-1">Based on completed assessments</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                </div>

              </div>

              {/* Interactive Filters Panel */}
              <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-teal-600" />
                    <h2 className="text-sm font-bold text-slate-800">Filter Assessment Records</h2>
                  </div>

                  <button
                    id="btn-export-csv"
                    onClick={handleCSVExport}
                    className="inline-flex items-center space-x-2 py-2 px-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-md text-xs font-bold active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Download CSV Export</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                  
                  {/* Search input */}
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search student or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 rounded-xl text-xs font-medium focus:outline-none transition-all"
                    />
                  </div>

                  {/* School Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">School</label>
                    <select
                      value={filterSchool}
                      onChange={(e) => setFilterSchool(e.target.value)}
                      className="block w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 rounded-xl text-xs font-bold focus:outline-none transition-all"
                    >
                      <option value="all">🏢 All Schools</option>
                      {visibleSchools.map(s => (
                        <option key={s.School_ID} value={s.School_ID}>{s.School_Name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Grade Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Grade</label>
                    <select
                      value={filterGrade}
                      onChange={(e) => setFilterGrade(e.target.value)}
                      className="block w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 rounded-xl text-xs font-bold focus:outline-none transition-all"
                    >
                      <option value="all">📚 All Grades</option>
                      <option value="3">Grade 3</option>
                      <option value="4">Grade 4</option>
                      <option value="5">Grade 5</option>
                    </select>
                  </div>

                  {/* Teacher Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Teacher</label>
                    <select
                      value={filterTeacher}
                      onChange={(e) => setFilterTeacher(e.target.value)}
                      className="block w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 rounded-xl text-xs font-bold focus:outline-none transition-all"
                    >
                      <option value="all">👨‍🏫 All Teachers</option>
                      {data.teachers.map(t => (
                        <option key={t.Teacher_ID} value={t.Teacher_ID}>{t.Teacher_Name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assessment Date</label>
                    <div className="flex space-x-1">
                      <input
                        type="date"
                        value={filterDate === 'all' ? '' : filterDate}
                        onChange={(e) => setFilterDate(e.target.value || 'all')}
                        disabled={filterDate === 'all'}
                        className="block w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 rounded-xl text-xs font-bold focus:outline-none transition-all disabled:opacity-50"
                      />
                      {filterDate === 'all' ? (
                        <button
                          onClick={() => {
                            const today = new Date();
                            const offset = today.getTimezoneOffset();
                            const localToday = new Date(today.getTime() - offset * 60 * 1000);
                            setFilterDate(localToday.toISOString().split('T')[0]);
                          }}
                          className="px-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Today
                        </button>
                      ) : (
                        <button
                          onClick={() => setFilterDate('all')}
                          className="px-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Results List / Grid */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Detailed Assessment Records ({processedRecords.length} records found)
                  </h3>
                  <button
                    onClick={fetchDashboardData}
                    className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg active:scale-95 transition-all cursor-pointer"
                    title="Refresh Records"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {processedRecords.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 font-semibold text-sm">
                    No matching records found. Try adjusting your filters.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50">
                        <tr>
                          <th scope="col" className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student</th>
                          <th scope="col" className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">School</th>
                          <th scope="col" className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grade/Sec</th>
                          <th scope="col" className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teacher / Date</th>
                          <th scope="col" className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100/20">Know</th>
                          <th scope="col" className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100/20">Read</th>
                          <th scope="col" className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100/20">Spell</th>
                          <th scope="col" className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100/20">C_Read</th>
                          <th scope="col" className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100/20">C_Spell</th>
                          <th scope="col" className="px-5 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider font-extrabold">Total</th>
                          <th scope="col" className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100 text-xs">
                        {processedRecords.map((rec) => {
                          const school = data.schools.find(s => s.School_ID === rec.student.School_ID);
                          const district = school ? school.District : 'Rangareddy';
                          return (
                            <tr key={`${rec.student.Student_ID}_${rec.result.Test_Date}`} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                <div className="font-extrabold text-slate-800">{rec.student.Student_Name}</div>
                                <div className="text-[10px] text-slate-400 font-bold font-mono mt-0.5">{rec.student.Student_ID}</div>
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                <div className="font-semibold text-slate-700 truncate max-w-[180px]">{getSchoolName(rec.student.School_ID)}</div>
                                <div className="text-[10px] text-slate-400 font-medium mt-0.5">{district} District</div>
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-700">
                                  Gr {rec.student.Grade}
                                </span>
                                <span className="ml-1.5 font-semibold text-slate-600">Sec {rec.student.Section}</span>
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                <div className="font-semibold text-slate-700">{getTeacherName(rec.student.Teacher_ID)}</div>
                                <div className="text-[10px] text-slate-400 font-bold font-mono mt-0.5 flex items-center">
                                  <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                                  {rec.result.Test_Date}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-center font-bold bg-slate-50/10">{rec.result.Know ?? '-'}</td>
                              <td className="px-4 py-3.5 text-center font-bold bg-slate-50/10">{rec.result.Read ?? '-'}</td>
                              <td className="px-4 py-3.5 text-center font-bold bg-slate-50/10">{rec.result.Spell ?? '-'}</td>
                              <td className="px-4 py-3.5 text-center font-bold bg-slate-50/10">{rec.result.Camera_Word_Read ?? '-'}</td>
                              <td className="px-4 py-3.5 text-center font-bold bg-slate-50/10">{rec.result.Camera_Word_Spell ?? '-'}</td>
                              <td className="px-5 py-3.5 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                                  rec.isCompleted 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}>
                                  {rec.result.Total_Marks} / 50
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-slate-500 max-w-[150px] truncate" title={rec.result.Notes || ''}>
                                {rec.result.Notes || <span className="text-slate-300 italic">None</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SCHOOLS & DISTRICTS */}
          {activeTab === 'schools' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: District list & Add form */}
              <div className="space-y-6 lg:col-span-1">
                
                {/* District Panel */}
                <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Districts Registry</h3>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-1">
                    {data.districts.map(d => (
                      <span key={d} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors">
                        {d}
                      </span>
                    ))}
                  </div>

                  {permissions.add_schools && (
                    <form onSubmit={handleAddDistrict} className="pt-2 border-t border-slate-100 flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="New District (e.g. Medchal)"
                        value={newDistrictName}
                        onChange={(e) => setNewDistrictName(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={actionLoading || !newDistrictName.trim()}
                        className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer"
                      >
                        Add
                      </button>
                    </form>
                  )}
                </div>

                {/* Add/Import School Card */}
                {permissions.add_schools ? (
                  <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center space-x-2">
                        <Plus className="w-4 h-4 text-teal-600" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Add Schools Template</h3>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => setAddMode('manual')}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold ${addMode !== 'batch' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600'}`}
                        >
                          Manual
                        </button>
                        <button
                          onClick={() => setAddMode('batch')}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold ${addMode === 'batch' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600'}`}
                        >
                          Bulk Import
                        </button>
                      </div>
                    </div>

                    {addMode === 'batch' ? (
                      <div className="space-y-4">
                        <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
                          <button
                            type="button"
                            onClick={() => { setBatchRawText(''); setUploadedFileName(''); setBatchImportMethod('paste'); }}
                            className={`flex-1 py-1 text-center text-[10px] font-black rounded-md transition-all cursor-pointer ${
                              batchImportMethod === 'paste'
                                ? 'bg-white text-teal-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            📋 Paste Text
                          </button>
                          <button
                            type="button"
                            onClick={() => { setBatchRawText(''); setUploadedFileName(''); setBatchImportMethod('file'); }}
                            className={`flex-1 py-1 text-center text-[10px] font-black rounded-md transition-all cursor-pointer ${
                              batchImportMethod === 'file'
                                ? 'bg-white text-teal-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            📁 Upload File
                          </button>
                        </div>

                        <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl text-[11px] text-teal-900 leading-relaxed font-medium">
                          <strong>Batch Template (Excel / Google Sheets / CSV):</strong><br />
                          {batchImportMethod === 'file' ? 'Upload or drop your .xlsx, .xls, or .csv file below.' : 'Copy-paste directly from spreadsheet software.'} **You can include the header row!**
                          <div className="mt-1.5 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-teal-950 block">Header Row Format (Copy and paste this row first):</span>
                            <code className="block bg-white border border-teal-100 p-2 rounded-lg font-mono text-[10.5px] text-teal-950 select-all cursor-pointer" title="Click to select all for easy copying">
                              School_ID,School_Name,District,Block_or_Village
                            </code>
                          </div>
                          <span className="text-[9.5px] text-teal-700 block mt-1">Example entry: <span className="font-mono bg-white/40 px-1 py-0.5 rounded">SCH101,Govt Prim School,Rangareddy,Gandipet</span></span>
                        </div>

                        {batchImportMethod === 'file' ? (
                          <div 
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                              dragActive 
                                ? 'border-teal-500 bg-teal-50/50 scale-[0.99]' 
                                : uploadedFileName 
                                  ? 'border-emerald-400 bg-emerald-50/10' 
                                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="file"
                              id="file-upload-schools"
                              accept=".xlsx,.xls,.csv"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            <label 
                              htmlFor="file-upload-schools"
                              className="cursor-pointer flex flex-col items-center space-y-2"
                            >
                              <div className={`p-3 rounded-full ${uploadedFileName ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                <Upload className="w-5 h-5" />
                              </div>
                              <div className="text-[11px]">
                                {uploadedFileName ? (
                                  <span className="font-bold text-emerald-800">Selected: {uploadedFileName}</span>
                                ) : (
                                  <>
                                    <span className="font-bold text-slate-700">Drag & drop spreadsheet here</span>
                                    <span className="text-slate-400 block text-[10px] mt-0.5">or click to browse files</span>
                                  </>
                                )}
                              </div>
                              <div className="text-[9.5px] text-slate-400">
                                Supports Excel (.xlsx, .xls) and CSV (.csv)
                              </div>
                            </label>
                          </div>
                        ) : (
                          <textarea
                            rows={5}
                            value={batchRawText}
                            onChange={(e) => setBatchRawText(e.target.value)}
                            placeholder="SCH101, Govt Prim School Bandlaguda, Rangareddy, Gandipet"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:bg-white focus:border-teal-500"
                          />
                        )}

                        <button
                          onClick={handleBatchImport}
                          disabled={actionLoading}
                          className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                          {actionLoading ? 'Bulk Importing...' : 'Bulk Import Schools'}
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleAddSchoolSubmit} className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">School ID (Optional)</label>
                          <input
                            type="text"
                            placeholder="Auto-generated if left blank"
                            value={schoolId}
                            onChange={(e) => setSchoolId(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">School Name</label>
                          <input
                            type="text"
                            placeholder="Govt High School, Serilingampally"
                            value={schoolName}
                            onChange={(e) => setSchoolName(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">District</label>
                            <select
                              value={schoolDistrict}
                              onChange={(e) => setSchoolDistrict(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                            >
                              {data.districts.map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Block / Village</label>
                            <input
                              type="text"
                              placeholder="Serilingampally"
                              value={schoolBlock}
                              onChange={(e) => setSchoolBlock(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                          {actionLoading ? 'Saving...' : 'Add School'}
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start space-x-2.5">
                    <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <p className="text-[11px] text-amber-800 leading-relaxed font-bold">
                      Your Co-Admin role does not possess permissions to register new schools. Contact primary admin 8500127713 for full access.
                    </p>
                  </div>
                )}

              </div>

              {/* Right Column: Schools Directory Table */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden lg:col-span-2">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Registered Schools Directory</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">School ID</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">School Name</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">District</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Block/Village</th>
                        {permissions.add_schools && <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-400 uppercase">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {visibleSchools.map(s => (
                        <tr key={s.School_ID} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-5 py-3.5 whitespace-nowrap font-mono font-bold text-slate-500">{s.School_ID}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap font-extrabold text-slate-800">{s.School_Name}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 font-bold text-[10px] border border-teal-100">
                              {s.District}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap font-medium text-slate-600">{s.Block_or_Village || 'N/A'}</td>
                          {permissions.add_schools && (
                            <td className="px-5 py-3.5 whitespace-nowrap text-center">
                              <button
                                onClick={() => handleDeleteSchool(s.School_ID)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg active:scale-90 transition-all cursor-pointer"
                                title="Remove School"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: TEACHERS & CO-ADMINS */}
          {activeTab === 'teachers' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Register Teacher Form */}
              <div className="space-y-6 lg:col-span-1">
                
                {permissions.add_teachers ? (
                  <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center space-x-2">
                        <Plus className="w-4 h-4 text-teal-600" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Register Teacher Template</h3>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => setAddMode('manual')}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold ${addMode !== 'batch' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600'}`}
                        >
                          Manual
                        </button>
                        <button
                          onClick={() => setAddMode('batch')}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold ${addMode === 'batch' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600'}`}
                        >
                          Bulk Import
                        </button>
                      </div>
                    </div>

                    {addMode === 'batch' ? (
                      <div className="space-y-4">
                        <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
                          <button
                            type="button"
                            onClick={() => { setBatchRawText(''); setUploadedFileName(''); setBatchImportMethod('paste'); }}
                            className={`flex-1 py-1 text-center text-[10px] font-black rounded-md transition-all cursor-pointer ${
                              batchImportMethod === 'paste'
                                ? 'bg-white text-teal-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            📋 Paste Text
                          </button>
                          <button
                            type="button"
                            onClick={() => { setBatchRawText(''); setUploadedFileName(''); setBatchImportMethod('file'); }}
                            className={`flex-1 py-1 text-center text-[10px] font-black rounded-md transition-all cursor-pointer ${
                              batchImportMethod === 'file'
                                ? 'bg-white text-teal-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            📁 Upload File
                          </button>
                        </div>

                        <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl text-[11px] text-teal-900 leading-relaxed font-medium">
                          <strong>Batch Template (Excel / Google Sheets / CSV):</strong><br />
                          {batchImportMethod === 'file' ? 'Upload or drop your .xlsx, .xls, or .csv file below.' : 'Copy-paste directly from spreadsheet software.'} **You can include the header row!**
                          <div className="mt-1.5 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-teal-950 block">Header Row Format (Copy and paste this row first):</span>
                            <code className="block bg-white border border-teal-100 p-2 rounded-lg font-mono text-[10.5px] text-teal-950 select-all cursor-pointer" title="Click to select all for easy copying">
                              Teacher_ID,Teacher_Name,Phone_Number,School_ID,Role
                            </code>
                          </div>
                          <span className="text-[9.5px] text-teal-700 block mt-1">Example entry: <span className="font-mono bg-white/40 px-1 py-0.5 rounded">TCH101,Kavitha J,9876543210,SCH001,Teacher</span></span>
                        </div>

                        {batchImportMethod === 'file' ? (
                          <div 
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                              dragActive 
                                ? 'border-teal-500 bg-teal-50/50 scale-[0.99]' 
                                : uploadedFileName 
                                  ? 'border-emerald-400 bg-emerald-50/10' 
                                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="file"
                              id="file-upload-teachers"
                              accept=".xlsx,.xls,.csv"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            <label 
                              htmlFor="file-upload-teachers"
                              className="cursor-pointer flex flex-col items-center space-y-2"
                            >
                              <div className={`p-3 rounded-full ${uploadedFileName ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                <Upload className="w-5 h-5" />
                              </div>
                              <div className="text-[11px]">
                                {uploadedFileName ? (
                                  <span className="font-bold text-emerald-800">Selected: {uploadedFileName}</span>
                                ) : (
                                  <>
                                    <span className="font-bold text-slate-700">Drag & drop spreadsheet here</span>
                                    <span className="text-slate-400 block text-[10px] mt-0.5">or click to browse files</span>
                                  </>
                                )}
                              </div>
                              <div className="text-[9.5px] text-slate-400">
                                Supports Excel (.xlsx, .xls) and CSV (.csv)
                              </div>
                            </label>
                          </div>
                        ) : (
                          <textarea
                            rows={5}
                            value={batchRawText}
                            onChange={(e) => setBatchRawText(e.target.value)}
                            placeholder="TCH101, Kavitha J, 9876543210, SCH001, Teacher"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:bg-white focus:border-teal-500"
                          />
                        )}

                        <button
                          onClick={handleBatchImport}
                          disabled={actionLoading}
                          className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                          {actionLoading ? 'Bulk Registering...' : 'Bulk Register Teachers'}
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleAddTeacherSubmit} className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Teacher ID (Optional)</label>
                          <input
                            type="text"
                            placeholder="Auto-generated if left blank"
                            value={teacherId}
                            onChange={(e) => setTeacherId(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Teacher / Co-Admin Name</label>
                          <input
                            type="text"
                            placeholder="Sravanthi Rao"
                            value={teacherName}
                            onChange={(e) => setTeacherName(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Contact Phone Number</label>
                          <input
                            type="tel"
                            placeholder="10-digit mobile phone"
                            value={teacherPhone}
                            onChange={(e) => setTeacherPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            required
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-wider focus:outline-none"
                          />
                        </div>
                        {teacherRole !== 'Admin' ? (
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Primary School Association</label>
                            <select
                              value={teacherSchoolId}
                              onChange={(e) => setTeacherSchoolId(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                            >
                              {visibleSchools.map(s => (
                                <option key={s.School_ID} value={s.School_ID}>{s.School_Name}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fade-in">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Assigned Districts (Multiple Selection)</span>
                            <div className="space-y-1 text-xs max-h-32 overflow-y-auto font-medium">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={teacherAssignedDistricts.includes('all')}
                                  onChange={() => toggleAssignedDistrict('all')}
                                  className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500"
                                />
                                <span className="font-bold">All Registered Districts</span>
                              </label>
                              {data.districts.map(dist => (
                                <label key={dist} className="flex items-center space-x-2 cursor-pointer pl-1">
                                  <input
                                    type="checkbox"
                                    checked={teacherAssignedDistricts.includes(dist)}
                                    onChange={() => toggleAssignedDistrict(dist)}
                                    disabled={teacherAssignedDistricts.includes('all')}
                                    className="w-3.5 h-3.5 rounded text-teal-600 disabled:opacity-50 focus:ring-teal-500"
                                  />
                                  <span className="text-slate-600">{dist} District</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">System Access Level</label>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => setTeacherRole('Teacher')}
                              className={`py-2 px-3 border text-xs font-bold rounded-xl transition-all ${
                                teacherRole === 'Teacher' 
                                  ? 'bg-slate-100 border-slate-400 text-slate-950 shadow-sm' 
                                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                              }`}
                            >
                              👨‍🏫 Teacher login
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!isPrimaryAdmin) {
                                  showFeedback('error', 'Only supreme primary admin can register administrative roles.');
                                  return;
                                }
                                setTeacherRole('Admin');
                              }}
                              className={`py-2 px-3 border text-xs font-bold rounded-xl transition-all ${
                                teacherRole === 'Admin' 
                                  ? 'bg-teal-50 border-teal-300 text-teal-950 shadow-sm' 
                                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                              }`}
                            >
                              💼 Co-Admin role
                            </button>
                          </div>
                        </div>

                        {/* Co-Admin Scoped Permissions assignment */}
                        {teacherRole === 'Admin' && isPrimaryAdmin && (
                          <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-xl space-y-2.5 animate-fade-in">
                            <span className="text-[10px] font-bold text-teal-800 uppercase block tracking-wider">Assign Co-Admin Permissions scope</span>
                            
                            <div className="space-y-1.5 text-xs text-slate-700 font-semibold">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={teacherCanAddSchools}
                                  onChange={(e) => setTeacherCanAddSchools(e.target.checked)}
                                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                                />
                                <span>Can Manage Schools & Districts</span>
                              </label>

                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={teacherCanAddTeachers}
                                  onChange={(e) => setTeacherCanAddTeachers(e.target.checked)}
                                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                                />
                                <span>Can Manage Teachers & Co-Admins</span>
                              </label>

                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={teacherCanAddStudents}
                                  onChange={(e) => setTeacherCanAddStudents(e.target.checked)}
                                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                                />
                                <span>Can Manage Students Directory</span>
                              </label>
                            </div>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer"
                        >
                          {actionLoading ? 'Saving...' : 'Register Teacher/Admin'}
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start space-x-2.5">
                    <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <p className="text-[11px] text-amber-800 leading-relaxed font-bold">
                      Your Co-Admin role does not possess permissions to register new teacher logins. Contact primary admin 8500127713.
                    </p>
                  </div>
                )}

              </div>

              {/* Right Column: Teachers list directory */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden lg:col-span-2">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Registered Teachers & Admins Logins</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Teacher ID</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Name</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Contact Phone</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Assigned School</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">System Role / Scope</th>
                        {permissions.add_teachers && <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-400 uppercase">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {visibleTeachers.map(t => {
                        const isThisPrimary = t.Phone_Number === '8500127713';
                        const isCoAdmin = t.Role === 'Admin' && !isThisPrimary;
                        
                        return (
                          <tr key={t.Teacher_ID} className="hover:bg-slate-50/40 transition-colors">
                            <td className="px-5 py-3.5 whitespace-nowrap font-mono font-bold text-slate-500">{t.Teacher_ID}</td>
                            <td className="px-5 py-3.5 whitespace-nowrap font-extrabold text-slate-800">{t.Teacher_Name}</td>
                            <td className="px-5 py-3.5 whitespace-nowrap font-mono font-bold text-slate-700">{t.Phone_Number}</td>
                            <td className="px-5 py-3.5 whitespace-nowrap font-medium text-slate-600 truncate max-w-[150px]" title={getSchoolName(t.School_ID)}>
                              {getSchoolName(t.School_ID)}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              {isThisPrimary ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800 border border-teal-200 uppercase tracking-wider">
                                  👑 Primary Admin
                                </span>
                              ) : isCoAdmin ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-violet-100 text-violet-800 border border-violet-200 uppercase tracking-wider">
                                    💼 Scoped Co-Admin
                                  </span>
                                  <div className="text-[9px] text-slate-400 font-bold leading-normal">
                                    Perms: {t.Admin_Permissions?.add_schools ? '🏢' : ''} {t.Admin_Permissions?.add_teachers ? '👨‍🏫' : ''} {t.Admin_Permissions?.add_students ? '📚' : ''}
                                  </div>
                                  {t.Admin_Permissions?.assigned_districts && (
                                    <div className="text-[9px] text-teal-600 font-extrabold max-w-[200px] truncate" title={t.Admin_Permissions.assigned_districts.join(', ')}>
                                      Districts: {t.Admin_Permissions.assigned_districts.join(', ')}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                  👨‍🏫 English Teacher
                                </span>
                              )}
                            </td>
                            {permissions.add_teachers && (
                              <td className="px-5 py-3.5 whitespace-nowrap text-center">
                                {!isThisPrimary && (
                                  <button
                                    onClick={() => handleDeleteTeacher(t.Teacher_ID)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg active:scale-90 transition-all cursor-pointer"
                                    title="Unregister Teacher login"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: STUDENTS DIRECTORY */}
          {activeTab === 'students' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Register Student Form */}
              <div className="space-y-6 lg:col-span-1">
                
                {permissions.add_students ? (
                  <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center space-x-2">
                        <Plus className="w-4 h-4 text-teal-600" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Add Student Template</h3>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => setAddMode('manual')}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold ${addMode !== 'batch' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600'}`}
                        >
                          Manual
                        </button>
                        <button
                          onClick={() => setAddMode('batch')}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold ${addMode === 'batch' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600'}`}
                        >
                          Bulk Import
                        </button>
                      </div>
                    </div>

                    {addMode === 'batch' ? (
                      <div className="space-y-4">
                        <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
                          <button
                            type="button"
                            onClick={() => { setBatchRawText(''); setUploadedFileName(''); setBatchImportMethod('paste'); }}
                            className={`flex-1 py-1 text-center text-[10px] font-black rounded-md transition-all cursor-pointer ${
                              batchImportMethod === 'paste'
                                ? 'bg-white text-teal-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            📋 Paste Text
                          </button>
                          <button
                            type="button"
                            onClick={() => { setBatchRawText(''); setUploadedFileName(''); setBatchImportMethod('file'); }}
                            className={`flex-1 py-1 text-center text-[10px] font-black rounded-md transition-all cursor-pointer ${
                              batchImportMethod === 'file'
                                ? 'bg-white text-teal-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            📁 Upload File
                          </button>
                        </div>

                        <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl text-[11px] text-teal-900 leading-relaxed font-medium">
                          <strong>Batch Template (Excel / Google Sheets / CSV):</strong><br />
                          {batchImportMethod === 'file' ? 'Upload or drop your .xlsx, .xls, or .csv file below.' : 'Copy-paste directly from spreadsheet software.'} **You can include the header row!**
                          <div className="mt-1.5 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-teal-950 block">Header Row Format (Copy and paste this row first):</span>
                            <code className="block bg-white border border-teal-100 p-2 rounded-lg font-mono text-[10.5px] text-teal-950 select-all cursor-pointer" title="Click to select all for easy copying">
                              Student_ID,Student_Name,Grade,Section,School_ID,Teacher_ID
                            </code>
                          </div>
                          <span className="text-[9.5px] text-teal-700 block mt-1">Example entry: <span className="font-mono bg-white/40 px-1 py-0.5 rounded">STU404,Ramesh Babu,4,A,SCH001,TCH001</span></span>
                        </div>

                        {batchImportMethod === 'file' ? (
                          <div 
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                              dragActive 
                                ? 'border-teal-500 bg-teal-50/50 scale-[0.99]' 
                                : uploadedFileName 
                                  ? 'border-emerald-400 bg-emerald-50/10' 
                                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="file"
                              id="file-upload-students"
                              accept=".xlsx,.xls,.csv"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            <label 
                              htmlFor="file-upload-students"
                              className="cursor-pointer flex flex-col items-center space-y-2"
                            >
                              <div className={`p-3 rounded-full ${uploadedFileName ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                <Upload className="w-5 h-5" />
                              </div>
                              <div className="text-[11px]">
                                {uploadedFileName ? (
                                  <span className="font-bold text-emerald-800">Selected: {uploadedFileName}</span>
                                ) : (
                                  <>
                                    <span className="font-bold text-slate-700">Drag & drop spreadsheet here</span>
                                    <span className="text-slate-400 block text-[10px] mt-0.5">or click to browse files</span>
                                  </>
                                )}
                              </div>
                              <div className="text-[9.5px] text-slate-400">
                                Supports Excel (.xlsx, .xls) and CSV (.csv)
                              </div>
                            </label>
                          </div>
                        ) : (
                          <textarea
                            rows={5}
                            value={batchRawText}
                            onChange={(e) => setBatchRawText(e.target.value)}
                            placeholder="STU404, Ramesh Babu, 4, A, SCH001, TCH001"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:bg-white focus:border-teal-500"
                          />
                        )}

                        <button
                          onClick={handleBatchImport}
                          disabled={actionLoading}
                          className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                          {actionLoading ? 'Bulk Adding...' : 'Bulk Add Students'}
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleAddStudentSubmit} className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Student ID (Optional)</label>
                          <input
                            type="text"
                            placeholder="Auto-generated if left blank"
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Student Full Name</label>
                          <input
                            type="text"
                            placeholder="Haritha S"
                            value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Grade Level</label>
                            <select
                              value={studentGrade}
                              onChange={(e) => setStudentGrade(Number(e.target.value) as 3 | 4 | 5)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                            >
                              <option value={3}>Grade 3</option>
                              <option value={4}>Grade 4</option>
                              <option value={5}>Grade 5</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Class Section</label>
                            <input
                              type="text"
                              placeholder="A"
                              value={studentSection}
                              onChange={(e) => setStudentSection(e.target.value.toUpperCase())}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Assigned School</label>
                          <select
                            value={studentSchoolId}
                            onChange={(e) => {
                              setStudentSchoolId(e.target.value);
                              // Auto-update student teacher selection based on school
                              const schoolTeachers = visibleTeachers.filter(t => t.School_ID === e.target.value);
                              if (schoolTeachers.length > 0) {
                                setStudentTeacherId(schoolTeachers[0].Teacher_ID);
                              }
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                          >
                            {visibleSchools.map(s => (
                              <option key={s.School_ID} value={s.School_ID}>{s.School_Name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Assigned Class Teacher</label>
                          <select
                            value={studentTeacherId}
                            onChange={(e) => setStudentTeacherId(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                          >
                            {visibleTeachers
                              .filter(t => t.School_ID === studentSchoolId)
                              .map(t => (
                                <option key={t.Teacher_ID} value={t.Teacher_ID}>{t.Teacher_Name}</option>
                              ))}
                            {data.teachers.filter(t => t.School_ID === studentSchoolId).length === 0 && (
                              <option value="">No registered teachers for this school</option>
                            )}
                          </select>
                        </div>
                        <button
                          type="submit"
                          disabled={actionLoading || !studentTeacherId}
                          className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {actionLoading ? 'Saving...' : 'Add Student'}
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start space-x-2.5">
                    <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <p className="text-[11px] text-amber-800 leading-relaxed font-bold">
                      Your Co-Admin role does not possess permissions to add new student accounts. Contact primary admin 8500127713.
                    </p>
                  </div>
                )}

              </div>

              {/* Right Column: Students directory listings */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden lg:col-span-2 space-y-4">
                
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Assigned Student Enrollment Directory</h3>
                  
                  {/* Search inside students directory */}
                  <div className="relative rounded-lg shadow-sm sm:w-60">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <Search className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Filter directory by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-8 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:bg-white rounded-lg text-xs font-medium focus:outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Student ID</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Student Name</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Class Level</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Assigned School</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Class Teacher</th>
                        {permissions.add_students && <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-400 uppercase">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {visibleStudents
                        .filter(s => s.Student_Name.toLowerCase().includes(searchTerm.toLowerCase()) || s.Student_ID.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(s => (
                          <tr key={s.Student_ID} className="hover:bg-slate-50/40 transition-colors">
                            <td className="px-5 py-3.5 whitespace-nowrap font-mono font-bold text-slate-500">{s.Student_ID}</td>
                            <td className="px-5 py-3.5 whitespace-nowrap font-extrabold text-slate-800">{s.Student_Name}</td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-700">
                                Grade {s.Grade} - {s.Section}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap font-semibold text-slate-600 truncate max-w-[150px]" title={getSchoolName(s.School_ID)}>
                              {getSchoolName(s.School_ID)}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap font-semibold text-slate-700">{getTeacherName(s.Teacher_ID)}</td>
                            {permissions.add_students && (
                              <td className="px-5 py-3.5 whitespace-nowrap text-center">
                                <button
                                  onClick={() => handleDeleteStudent(s.Student_ID)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg active:scale-90 transition-all cursor-pointer"
                                  title="Unenroll Student"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </main>
      )}

    </div>
  );
}
