import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { School, Student, TestResult, TestPhase } from '../types';

interface SchoolReportPDFProps {
  school: School;
  phase: TestPhase;
  students: Student[];
  results: TestResult[];
}

export default function SchoolReportPDF({ school, phase, students, results }: SchoolReportPDFProps) {
  // Colors for the pie chart exactly matching the screenshot
  const COLORS = {
    Know: '#4285F4',    // Blue
    Read: '#EA4335',    // Red
    Spell: '#FBBC05',   // Yellow
    CWR: '#34A853',     // Green
    CWS: '#FF6D01',     // Orange
  };

  // Helper to calculate averages for a specific grade
  const calculateGradeStats = (grade: 3 | 4 | 5) => {
    const gradeStudents = students.filter(s => s.Grade === grade);
    const totalStudentsCount = gradeStudents.length;
    
    // Find results for these students
    const gradeResults = results.filter(r => 
      r.Test_Type === phase && 
      gradeStudents.some(s => s.Student_ID === r.Student_ID) &&
      r.Total_Marks !== undefined &&
      r.Know !== null && r.Read !== null && r.Spell !== null && r.Camera_Word_Read !== null && r.Camera_Word_Spell !== null
    );

    const assessedCount = gradeResults.length;

    if (assessedCount === 0) {
      return { assessedCount, totalStudentsCount, avgTotal: 0, chartData: [] };
    }

    let sumKnow = 0;
    let sumRead = 0;
    let sumSpell = 0;
    let sumCWR = 0;
    let sumCWS = 0;
    let sumTotal = 0;

    gradeResults.forEach(r => {
      sumKnow += r.Know || 0;
      sumRead += r.Read || 0;
      sumSpell += r.Spell || 0;
      sumCWR += r.Camera_Word_Read || 0;
      sumCWS += r.Camera_Word_Spell || 0;
      sumTotal += r.Total_Marks || 0;
    });

    const avgKnow = sumKnow / assessedCount;
    const avgRead = sumRead / assessedCount;
    const avgSpell = sumSpell / assessedCount;
    const avgCWR = sumCWR / assessedCount;
    const avgCWS = sumCWS / assessedCount;
    const avgTotal = sumTotal / assessedCount;

    // For the pie chart, we want the contribution of each component to the total average score
    const chartData = [
      { name: 'KNOW', value: avgKnow, color: COLORS.Know },
      { name: 'READ', value: avgRead, color: COLORS.Read },
      { name: 'SPELL', value: avgSpell, color: COLORS.Spell },
      { name: 'CAMERA WORD READ', value: avgCWR, color: COLORS.CWR },
      { name: 'CAMERA WORD SPELL', value: avgCWS, color: COLORS.CWS }
    ];

    return { assessedCount, totalStudentsCount, avgTotal: avgTotal.toFixed(2), chartData };
  };

  const grade3 = calculateGradeStats(3);
  const grade4 = calculateGradeStats(4);
  const grade5 = calculateGradeStats(5);

  const renderPieChart = (stats: any, title: string) => {
    if (stats.assessedCount === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 bg-slate-50 border border-slate-200 mt-4 mx-4">
          <p className="text-sm font-bold text-slate-400">No {phase} data for this grade</p>
        </div>
      );
    }

    // Custom label render to match screenshot format (e.g. "KNOW 37.2%")
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }: any) => {
      if (value === 0) return null;
      const RADIAN = Math.PI / 180;
      // Position label slightly outside the pie
      const radius = innerRadius + (outerRadius - innerRadius) + 40; 
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);

      return (
        <text x={x} y={y} fill="black" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
          <tspan x={x} dy="-0.5em" fontSize="9" fontWeight="bold">{name}</tspan>
          <tspan x={x} dy="1.2em" fontSize="9" fill="#666">{(percent * 100).toFixed(1)}%</tspan>
        </text>
      );
    };

    return (
      <div className="flex flex-col items-center pt-2 pb-4">
        <h4 className="text-sm font-bold italic mb-4">{title}</h4>
        <div className="w-full h-56 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.chartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                labelLine={true}
                label={renderCustomizedLabel}
                isAnimationActive={false} // Disable animation for PDF export
              >
                {stats.chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const getSchoolTitle = () => {
    if (school.School_Full_Name && school.School_Full_Name.trim() !== '') {
      return `${school.School_Full_Name}, ${school.Block_or_Village !== 'N/A' ? school.Block_or_Village + ',' : ''}`;
    }
    return `${school.School_Name}, ${school.Block_or_Village !== 'N/A' ? school.Block_or_Village + ',' : ''}`;
  };

  const shortName = school.School_Name.replace(/\s+/g, '_').toUpperCase();

  return (
    <div className="bg-white text-black p-8 font-serif w-[800px] min-h-[1131px] mx-auto box-border relative" id={`pdf-report-${school.School_ID}`}>
      {/* --- HEADER --- */}
      <div className="text-center mb-8 relative">
        <div className="absolute right-0 top-0">
          <div className="w-24 h-auto">
            <img src="/logo.png" alt="Teach For Change" className="w-full h-auto object-contain" />
          </div>
        </div>

        <h1 className="text-2xl font-bold italic mb-1 px-16">{getSchoolTitle()}</h1>
        <h2 className="text-lg font-bold italic mb-3">
          {school.Mandal ? `${school.Mandal} Mandal, ` : ''}{school.District} District.
        </h2>
        
        <h3 className="text-xl font-bold mb-3">{phase} Report</h3>
        <p className="text-right text-lg font-bold mr-16">- By Teach For Change Trust</p>
      </div>

      {/* --- ABOUT --- */}
      <div className="mb-6 px-4">
        <p className="text-base italic leading-relaxed text-justify">
          <strong className="font-bold">About:</strong> The {phase} Assessment is conducted in the beginning of the smart 
          classroom program of Teach For change. In this assessment, the students are 
          individually assessed in 5 parameters of English Language Literacy.
        </p>
      </div>

      <div className="mb-4 px-4">
        <p className="text-base font-bold">Results: The grade wise details:</p>
      </div>

      {/* --- GRADES 3 & 4 GRID --- */}
      <div className="grid grid-cols-2 gap-0 border-t border-slate-300">
        
        {/* Grade 3 Column */}
        <div className="border-r border-slate-300">
          <div className="bg-[#A9D18E] py-2 text-center border-b border-white">
            <h3 className="font-bold text-lg">Grade 3</h3>
          </div>
          {renderPieChart(grade3, `${shortName}_3rd Class ${phase} Test_Result`)}
          <div className="px-4 text-center pb-4 text-[13px] italic">
            Fig 1: A total of {grade3.assessedCount} students were assessed, the average<br/>
            English Language Literacy level is {grade3.avgTotal}
          </div>
        </div>

        {/* Grade 4 Column */}
        <div>
          <div className="bg-[#A9D18E] py-2 text-center border-b border-white border-l">
            <h3 className="font-bold text-lg">Grade 4</h3>
          </div>
          {renderPieChart(grade4, `${shortName}_4th Class ${phase} Test_Result`)}
          <div className="px-4 text-center pb-4 text-[13px] italic">
            Fig 2: A total of {grade4.assessedCount} students were assessed, the average<br/>
            English Language Literacy level is {grade4.avgTotal}
          </div>
        </div>
      </div>

      {/* --- GRADE 5 & NEXT STEPS GRID --- */}
      <div className="grid grid-cols-2 gap-0 border-t border-white mt-1">
        
        {/* Grade 5 Column */}
        <div className="border-r border-slate-300">
          <div className="bg-[#A9D18E] py-2 text-center border-b border-white">
            <h3 className="font-bold text-lg">Grade 5</h3>
          </div>
          {renderPieChart(grade5, `${shortName}_5th Class ${phase} Test_Result`)}
          <div className="px-4 text-center pb-4 text-[13px] italic">
            Fig 3: A total of {grade5.assessedCount} students were assessed, the average<br/>
            English Language Literacy level is {grade5.avgTotal}
          </div>
        </div>

        {/* Next Steps Column */}
        <div>
          <div className="bg-[#FFD966] py-2 text-center border-b border-white border-l">
            <h3 className="font-bold text-lg">Next Steps</h3>
          </div>
          <div className="p-8 pt-12 space-y-8">
            {/* 4 lines for writing */}
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-black shrink-0"></div>
              <div className="w-full border-b border-slate-400"></div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-black shrink-0"></div>
              <div className="w-full border-b border-slate-400"></div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-black shrink-0"></div>
              <div className="w-full border-b border-slate-400"></div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-black shrink-0"></div>
              <div className="w-full border-b border-slate-400"></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
