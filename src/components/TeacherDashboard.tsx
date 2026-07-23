import React, { useState, useEffect, useRef } from 'react';
import { Calendar, User, BookOpen, ChevronRight, Edit2, CheckCircle2, AlertCircle, LogOut, ChevronDown, MessageSquare, Save, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Teacher, Student, TestResult } from '../types';
import { SyncManager } from '../utils/sync';
import OfflineIndicator from './OfflineIndicator';
import CompactCell from './CompactCell';

interface TeacherDashboardProps {
  teacher: Teacher;
  onLogout: () => void;
}

export default function TeacherDashboard({ teacher, onLogout }: TeacherDashboardProps) {
  const [selectedGrade, setSelectedGrade] = useState<3 | 4 | 5>(3);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - offset * 60 * 1000);
    return localToday.toISOString().split('T')[0];
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [resultsCache, setResultsCache] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<any[]>([]);
  const [schoolName, setSchoolName] = useState('My School');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<Record<string, 'saved' | 'saving' | 'offline'>>({});
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Ref to student cards for auto-scrolling
  const studentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    fetchStudentsAndResults();
  }, [selectedGrade, selectedDate]);

  const fetchSchools = async () => {
    try {
      const res = await fetch('/api/schools');
      if (res.ok) {
        const data = await res.json();
        setSchools(data);
        const mySchool = data.find((s: any) => s.School_ID === teacher.School_ID);
        if (mySchool) {
          setSchoolName(mySchool.School_Name);
        }
      }
    } catch (err) {
      console.error('Error fetching schools:', err);
    }
  };

  const fetchStudentsAndResults = async () => {
    setLoading(true);
    try {
      // 1. Fetch Students
      const studentRes = await fetch(`/api/teacher/students?teacherId=${teacher.Teacher_ID}&grade=${selectedGrade}`);
      let fetchedStudents: Student[] = [];
      if (studentRes.ok) {
        fetchedStudents = await studentRes.json();
        setStudents(fetchedStudents);
      }

      // 2. Fetch Results for this class and date
      const resultsRes = await fetch(`/api/teacher/results?teacherId=${teacher.Teacher_ID}&grade=${selectedGrade}&date=${selectedDate}`);
      if (resultsRes.ok) {
        const resultsData: TestResult[] = await resultsRes.json();
        SyncManager.mergeServerResults(resultsData);
      }
    } catch (err) {
      console.warn('Offline or error loading from server, using local cache:', err);
    } finally {
      // Always load from client local storage cache (even if server fails or to merge changes)
      setResultsCache(SyncManager.getCache());
      setLoading(false);
    }
  };

  // Manual cache sync handler
  const handleSyncComplete = () => {
    setResultsCache(SyncManager.getCache());
  };

  const getStudentResult = (studentId: string): TestResult => {
    const key = `${studentId}_${selectedDate}`;
    return resultsCache[key] || {
      Student_ID: studentId,
      Test_Date: selectedDate,
      Know: null,
      Read: null,
      Spell: null,
      Camera_Word_Read: null,
      Camera_Word_Spell: null,
      Total_Marks: 0,
      Teacher_ID: teacher.Teacher_ID,
      Last_Updated: new Date().toISOString(),
      Notes: ''
    };
  };

  const isAssessmentComplete = (result: TestResult): boolean => {
    return (
      result.Know !== null &&
      result.Read !== null &&
      result.Spell !== null &&
      result.Camera_Word_Read !== null &&
      result.Camera_Word_Spell !== null
    );
  };

  // Metrics calculations
  const totalStudents = students.length;
  const completedStudents = students.filter(s => isAssessmentComplete(getStudentResult(s.Student_ID)));
  const completedCount = completedStudents.length;
  const pendingCount = totalStudents - completedCount;
  const completionPercentage = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;

  // First incomplete student for resume support
  const firstIncompleteStudent = students.find(s => !isAssessmentComplete(getStudentResult(s.Student_ID)));

  const handleScrollToFirstIncomplete = () => {
    if (firstIncompleteStudent) {
      const studentIdx = students.findIndex(s => s.Student_ID === firstIncompleteStudent.Student_ID);
      if (studentIdx !== -1) {
        const firstCell = document.getElementById(`cell-${studentIdx}-0`);
        if (firstCell) {
          firstCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (firstCell as HTMLInputElement).focus();
          (firstCell as HTMLInputElement).select();
        }
      }
    }
  };

  const handleMarkChange = async (
    studentId: string,
    component: 'Know' | 'Read' | 'Spell' | 'Camera_Word_Read' | 'Camera_Word_Spell' | 'Notes',
    val: number | string | null
  ) => {
    // 1. Instantly update client UI cache state (highly responsive!)
    const updatedResult = SyncManager.updateCachedResult(
      studentId,
      selectedDate,
      teacher.Teacher_ID,
      component,
      val
    );
    setResultsCache(SyncManager.getCache());

    // Set saving state
    const compKey = `${studentId}_${component}`;
    setSavingStatus(prev => ({ ...prev, [compKey]: 'saving' }));

    // 2. Queue the change in local storage sync queue
    SyncManager.addToQueue(studentId, selectedDate, teacher.Teacher_ID, component, val);

    // 3. Immediately trigger background sync if online
    if (navigator.onLine) {
      const syncRes = await SyncManager.syncPending();
      if (syncRes.success) {
        setSavingStatus(prev => ({ ...prev, [compKey]: 'saved' }));
      } else {
        setSavingStatus(prev => ({ ...prev, [compKey]: 'offline' }));
      }
    } else {
      setSavingStatus(prev => ({ ...prev, [compKey]: 'offline' }));
    }
  };

  const handleSaveAllAndSync = async () => {
    setSyncLoading(true);
    setSyncFeedback(null);
    try {
      const syncRes = await SyncManager.syncPending();
      if (syncRes.success) {
        setSyncFeedback(`All data successfully synchronized online (${syncRes.synced} items synced).`);
      } else {
        setSyncFeedback(`Data saved locally! Working offline (${SyncManager.getQueue().length} pending items queued to sync when online).`);
      }
      setResultsCache(SyncManager.getCache());
    } catch (err) {
      setSyncFeedback('Saved locally. Connection error during sync.');
    } finally {
      setSyncLoading(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Student ID", "Student Name", "Grade", "Section", "Know", "Read", "Spell", "Camera Word Read", "Camera Word Spell", "Total Marks", "Observations", "Assessment Date"];
    const rows = students.map(student => {
      const res = getStudentResult(student.Student_ID);
      return [
        student.Student_ID,
        `"${student.Student_Name.replace(/"/g, '""')}"`,
        selectedGrade,
        student.Section,
        res.Know !== null ? res.Know : '',
        res.Read !== null ? res.Read : '',
        res.Spell !== null ? res.Spell : '',
        res.Camera_Word_Read !== null ? res.Camera_Word_Read : '',
        res.Camera_Word_Spell !== null ? res.Camera_Word_Spell : '',
        res.Total_Marks,
        `"${(res.Notes || '').replace(/"/g, '""')}"`,
        selectedDate
      ];
    });

    const csvString = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Grade_${selectedGrade}_Marks_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16 flex flex-col">
      {/* Offline sync monitor header */}
      <OfflineIndicator onSyncComplete={handleSyncComplete} />

      {/* Main Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-indigo-100 shadow-sm sticky top-0 z-40 transition-all">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg border border-indigo-100">
              {teacher.Teacher_Name.charAt(0)}
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800">{teacher.Teacher_Name}</h1>
              <p className="text-[11px] text-slate-500 font-medium">{schoolName}</p>
            </div>
          </div>

          <button
            id="btn-logout"
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-rose-600 active:scale-90 transition-all rounded-lg hover:bg-rose-50 cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-4 space-y-4">
        {/* Date, Grade & Progress Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Date Selector */}
          <div className="glass-card p-4 rounded-2xl shadow-sm space-y-2 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <div className="flex items-center space-x-2 text-slate-800">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Assessment Date</span>
            </div>
            <input
              type="date"
              id="assessment-date-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 bg-white/50 hover:bg-white/80 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl text-sm font-bold text-slate-800 focus:outline-none transition-all"
            />
          </div>

          {/* Grade Selector */}
          <div className="glass-card p-4 rounded-2xl shadow-sm space-y-2 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
              <BookOpen className="w-4 h-4 text-indigo-600 mr-1.5" />
              Select Grade
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {([3, 4, 5] as const).map((grade) => (
                <button
                  key={grade}
                  id={`btn-grade-${grade}`}
                  onClick={() => {
                    setSelectedGrade(grade);
                    setExpandedStudentId(null);
                  }}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer active:scale-95 ${
                    selectedGrade === grade
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20'
                      : 'bg-white/50 text-slate-700 hover:bg-white/80 border border-slate-100'
                  }`}
                >
                  Grade {grade}
                </button>
              ))}
            </div>
          </div>

          {/* Live Progress Card */}
          <div className="glass-card p-4 rounded-2xl shadow-sm space-y-2 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Grade {selectedGrade} Progress</h3>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                {completedCount} / {totalStudents} Completed
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden my-1 shadow-inner">
              <div
                className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full transition-all duration-700 rounded-full"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <span>{pendingCount} Pending Marks</span>
              <span className="text-emerald-600 font-bold">{completionPercentage}% Done</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Resume helper */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-card p-4 rounded-2xl shadow-sm">
          <div className="min-w-0 flex-1">
            {firstIncompleteStudent ? (
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse border border-amber-200"></span>
                <span className="text-xs text-slate-600 font-medium">
                  Next up: <strong className="font-bold text-slate-900">{firstIncompleteStudent.Student_Name}</strong> (Sec {firstIncompleteStudent.Section})
                </span>
                <button
                  onClick={handleScrollToFirstIncomplete}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer ml-1"
                >
                  Focus & Enter
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-bold">Awesome! All assessments completed for Grade {selectedGrade}.</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              id="btn-export-csv"
              onClick={handleExportCSV}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white/50 hover:bg-white/80 text-slate-700 text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer border border-slate-200/60 shadow-sm hover:shadow"
              title="Download results as CSV Excel spreadsheet"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              id="btn-save-all-sync"
              onClick={handleSaveAllAndSync}
              disabled={syncLoading}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 active:scale-95 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{syncLoading ? 'Syncing...' : 'Save All & Sync'}</span>
            </button>
          </div>
        </div>

        {/* Notification Toast Feedback */}
        <AnimatePresence>
          {syncFeedback && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-6 right-6 z-50 rounded-2xl bg-indigo-900/90 backdrop-blur-md border border-indigo-700/50 p-4 text-sm text-indigo-50 font-bold leading-relaxed shadow-2xl flex items-center space-x-3"
            >
              <CheckCircle2 className="w-5 h-5 text-indigo-300" />
              <span>{syncFeedback}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Student Spreadsheet Grid */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/50 flex items-center justify-between bg-white/30">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Class Marks Matrix</h2>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">Use <kbd className="bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-200">Tab</kbd> or <kbd className="bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-200">Arrow Keys</kbd> for fast navigation.</p>
            </div>
            <div className="flex items-center space-x-1.5 text-[10px] uppercase font-bold text-slate-400 bg-white/50 px-2.5 py-1 rounded-full shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <span>Online Auto-Save Active</span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center animate-fade-in">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-500 mt-3 font-medium">Loading class list...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center animate-fade-in">
              <p className="text-sm text-slate-500 font-medium">No students registered in Grade {selectedGrade} for this class.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse text-left">
                <thead>
                  <tr className="bg-white/40 border-b border-white/50 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-4 min-w-[140px] sticky left-0 bg-white/40 backdrop-blur-md border-r border-white/50 z-10 shadow-[1px_0_2px_rgba(0,0,0,0.02)]">Student Name</th>
                    <th className="py-3 px-2 text-center w-16">Know</th>
                    <th className="py-3 px-2 text-center w-16">Read</th>
                    <th className="py-3 px-2 text-center w-16">Spell</th>
                    <th className="py-3 px-2 text-center w-16">CWR</th>
                    <th className="py-3 px-2 text-center w-16">CWS</th>
                    <th className="py-3 px-2 text-center w-14">Total</th>
                    <th className="py-3 px-4 min-w-[160px]">Observations / Notes</th>
                    <th className="py-3 px-3 text-center w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40 text-xs">
                  <AnimatePresence>
                    {students.map((student, studentIndex) => {
                      const res = getStudentResult(student.Student_ID);
                      const complete = isAssessmentComplete(res);

                      return (
                        <motion.tr 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: studentIndex * 0.03, duration: 0.3 }}
                          key={student.Student_ID}
                          className={`hover:bg-white/60 transition-colors ${
                            complete ? 'bg-emerald-50/20' : 'bg-white/20'
                          }`}
                        >
                          {/* Index */}
                          <td className="py-2 px-3 text-center text-slate-400 font-mono font-bold">
                            {String(studentIndex + 1).padStart(2, '0')}
                          </td>

                          {/* Sticky Name Column */}
                          <td className={`py-2 px-4 sticky left-0 border-r border-white/50 font-bold z-10 shadow-[1px_0_2px_rgba(0,0,0,0.02)] transition-colors ${complete ? 'bg-emerald-50/90 text-emerald-900' : 'bg-white/80 text-slate-800'}`}>
                            <div className="truncate max-w-[150px]" title={student.Student_Name}>
                              {student.Student_Name}
                            </div>
                            <div className={`text-[10px] font-semibold mt-0.5 ${complete ? 'text-emerald-700/70' : 'text-slate-400'}`}>
                              Sec {student.Section}
                            </div>
                          </td>

                          {/* Know */}
                          <td className="py-2 px-2 text-center">
                            <CompactCell
                              studentIndex={studentIndex}
                              fieldIndex={0}
                              value={res.Know}
                              onChange={(val) => handleMarkChange(student.Student_ID, 'Know', val)}
                              saving={savingStatus[`${student.Student_ID}_Know`] === 'saving'}
                            />
                          </td>

                          {/* Read */}
                          <td className="py-2 px-2 text-center">
                            <CompactCell
                              studentIndex={studentIndex}
                              fieldIndex={1}
                              value={res.Read}
                              onChange={(val) => handleMarkChange(student.Student_ID, 'Read', val)}
                              saving={savingStatus[`${student.Student_ID}_Read`] === 'saving'}
                            />
                          </td>

                          {/* Spell */}
                          <td className="py-2 px-2 text-center">
                            <CompactCell
                              studentIndex={studentIndex}
                              fieldIndex={2}
                              value={res.Spell}
                              onChange={(val) => handleMarkChange(student.Student_ID, 'Spell', val)}
                              saving={savingStatus[`${student.Student_ID}_Spell`] === 'saving'}
                            />
                          </td>

                          {/* CWR */}
                          <td className="py-2 px-2 text-center">
                            <CompactCell
                              studentIndex={studentIndex}
                              fieldIndex={3}
                              value={res.Camera_Word_Read}
                              onChange={(val) => handleMarkChange(student.Student_ID, 'Camera_Word_Read', val)}
                              saving={savingStatus[`${student.Student_ID}_Camera_Word_Read`] === 'saving'}
                            />
                          </td>

                          {/* CWS */}
                          <td className="py-2 px-2 text-center">
                            <CompactCell
                              studentIndex={studentIndex}
                              fieldIndex={4}
                              value={res.Camera_Word_Spell}
                              onChange={(val) => handleMarkChange(student.Student_ID, 'Camera_Word_Spell', val)}
                              saving={savingStatus[`${student.Student_ID}_Camera_Word_Spell`] === 'saving'}
                            />
                          </td>

                          {/* Total */}
                          <td className="py-2 px-2 text-center">
                            <span className={`font-mono font-extrabold text-sm ${
                              complete ? 'text-emerald-600' : 'text-slate-500'
                            }`}>
                              {res.Total_Marks}
                            </span>
                            <span className="text-[10px] text-slate-300 font-bold block">/50</span>
                          </td>

                          {/* Notes Input */}
                          <td className="py-2 px-4">
                            <input
                              type="text"
                              value={res.Notes || ''}
                              onChange={(e) => handleMarkChange(student.Student_ID, 'Notes', e.target.value)}
                              placeholder="Observations..."
                              className="w-full px-2.5 py-1.5 text-xs font-semibold border border-white/50 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white/50 placeholder:text-slate-400 transition-all shadow-inner hover:bg-white"
                            />
                          </td>

                          {/* Status Label */}
                          <td className="py-2 px-3 text-center">
                            {complete ? (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/50 border border-emerald-200 px-2 py-0.5 rounded-full shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                <span>Done</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-700 bg-amber-100/50 border border-amber-200 px-2 py-0.5 rounded-full shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block"></span>
                                <span>Pending</span>
                              </span>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
