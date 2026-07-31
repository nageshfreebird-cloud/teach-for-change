import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList } from 'recharts';
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
    
    // Find results for these students for the requested phase
    const getPhaseResults = (targetPhase: TestPhase) => results.filter(r => 
      r.Test_Type === targetPhase && 
      gradeStudents.some(s => s.Student_ID === r.Student_ID) &&
      r.Total_Marks !== undefined &&
      r.Know !== null && r.Read !== null && r.Spell !== null && r.Camera_Word_Read !== null && r.Camera_Word_Spell !== null
    );

    const currentResults = getPhaseResults(phase);
    const assessedCount = currentResults.length;

    // Helper to calculate average for a specific parameter across a set of results
    const getAvg = (res: TestResult[], key: keyof TestResult) => {
      if (res.length === 0) return 0;
      const sum = res.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
      return Number((sum / res.length).toFixed(2));
    };

    // Current phase averages
    const avgKnow = getAvg(currentResults, 'Know');
    const avgRead = getAvg(currentResults, 'Read');
    const avgSpell = getAvg(currentResults, 'Spell');
    const avgCWR = getAvg(currentResults, 'Camera_Word_Read');
    const avgCWS = getAvg(currentResults, 'Camera_Word_Spell');
    const avgTotal = getAvg(currentResults, 'Total_Marks');

    // For the pie chart (Baseline only)
    const chartData = [
      { name: 'KNOW', value: avgKnow, color: COLORS.Know },
      { name: 'READ', value: avgRead, color: COLORS.Read },
      { name: 'SPELL', value: avgSpell, color: COLORS.Spell },
      { name: 'CAMERA WORD READ', value: avgCWR, color: COLORS.CWR },
      { name: 'CAMERA WORD SPELL', value: avgCWS, color: COLORS.CWS }
    ];

    // For the Bar Chart (Midline/Endline comparison)
    const barData = [];
    if (phase !== 'Baseline') {
      const baselineResults = getPhaseResults('Baseline');
      const midlineResults = phase === 'Endline' ? getPhaseResults('Midline') : [];

      const params = [
        { key: 'Know', label: 'Phonics (10)' },
        { key: 'Read', label: 'Phonological\nAwareness\n(10)' },
        { key: 'Spell', label: 'Vocabulary\n(10)' },
        { key: 'Camera_Word_Read', label: 'Story Reading\n(10)' },
        { key: 'Camera_Word_Spell', label: 'Make\nsentences (10)' }
      ];

      params.forEach(p => {
        const dataPoint: any = { name: p.label };
        
        // Always include baseline if available
        if (baselineResults.length > 0) {
          dataPoint.Baseline = getAvg(baselineResults, p.key as keyof TestResult);
        }

        if (phase === 'Midline') {
          dataPoint.Midline = getAvg(currentResults, p.key as keyof TestResult);
        } else if (phase === 'Endline') {
          if (midlineResults.length > 0) {
            dataPoint.Midline = getAvg(midlineResults, p.key as keyof TestResult);
          }
          dataPoint.Endline = getAvg(currentResults, p.key as keyof TestResult);
        }
        
        barData.push(dataPoint);
      });
    }

    return { 
      assessedCount, 
      totalStudentsCount, 
      avgTotal: avgTotal.toFixed(2), 
      chartData,
      barData
    };
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
      // Position label closer to avoid clipping
      const radius = innerRadius + (outerRadius - innerRadius) + 15; 
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);

      return (
        <text x={x} y={y} fill="black" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
          <tspan x={x} dy="-0.5em" fontSize="7.5" fontWeight="bold">{name}</tspan>
          <tspan x={x} dy="1.2em" fontSize="7.5" fill="#666">{(percent * 100).toFixed(1)}%</tspan>
        </text>
      );
    };

    return (
      <div className="flex flex-col items-center pt-1 pb-2">
        <h4 className="text-sm font-bold italic mb-2">{title}</h4>
        <div className="w-[328px] h-[195px] relative mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart style={{ overflow: 'visible' }}>
              <Pie
                data={stats.chartData}
                cx="50%"
                cy="50%"
                outerRadius={88}
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

  const CustomizedAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const lines = payload.value.split('\n');
    return (
      <g transform={`translate(${x},${y})`}>
        {lines.map((line: string, index: number) => (
          <text key={index} x={0} y={10 + index * 10} textAnchor="middle" fill="#000" fontSize={7}>
            {line}
          </text>
        ))}
      </g>
    );
  };

  const renderBarChart = (stats: any) => {
    if (stats.assessedCount === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 bg-slate-50 border border-slate-200 mt-4 mx-4">
          <p className="text-sm font-bold text-slate-400">No {phase} data for this grade</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center pt-1 pb-2">
        <div className="w-[328px] h-[195px] relative mx-auto px-2 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stats.barData}
              margin={{ top: 15, right: 5, left: -25, bottom: 20 }}
              barGap={0}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" interval={0} tick={<CustomizedAxisTick />} axisLine={{ stroke: '#000' }} tickLine={false} />
              <YAxis domain={[0, 8]} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} tickCount={5} />
              <Legend verticalAlign="top" height={20} iconType="square" iconSize={8} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
              
              {stats.barData[0] && stats.barData[0].Baseline !== undefined && (
                <Bar dataKey="Baseline" fill="#4285F4" name="BASELINE">
                  <LabelList dataKey="Baseline" position="top" fill="#4285F4" fontSize={8} formatter={(v: number) => v.toFixed(2)} />
                </Bar>
              )}
              {stats.barData[0] && stats.barData[0].Midline !== undefined && (
                <Bar dataKey="Midline" fill="#EA4335" name="MIDLINE">
                  <LabelList dataKey="Midline" position="top" fill="#EA4335" fontSize={8} formatter={(v: number) => v.toFixed(2)} />
                </Bar>
              )}
              {stats.barData[0] && stats.barData[0].Endline !== undefined && (
                <Bar dataKey="Endline" fill="#34A853" name="ENDLINE">
                  <LabelList dataKey="Endline" position="top" fill="#34A853" fontSize={8} formatter={(v: number) => v.toFixed(2)} />
                </Bar>
              )}
            </BarChart>
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
    <div className="bg-white text-black p-6 w-[210mm] h-[297mm] mx-auto box-border relative overflow-hidden" id={`pdf-report-${school.School_ID}`} style={{ fontFamily: "'Times New Roman', Times, serif" }}>
      {/* --- HEADER --- */}
      <div className="text-center mb-6 relative">
        <div className="absolute right-4 top-2">
          <div className="w-16 h-auto">
            <img src="/pdf-logo.png" alt="Teach For Change" className="w-full h-auto object-contain" />
          </div>
        </div>

        <h1 className="font-bold italic mb-1 px-16 truncate" style={{ fontSize: getSchoolTitle().length > 40 ? '16px' : '18px' }}>
          {getSchoolTitle()}
        </h1>
        <h2 className="font-bold italic mb-2 truncate" style={{ fontSize: '15px' }}>
          {school.Mandal ? `${school.Mandal} Mandal, ` : ''}{school.District} District.
        </h2>
        
        <h3 className="font-bold mt-4 mb-2" style={{ fontSize: '13px' }}>{phase} Report</h3>
        <p className="text-right mr-16" style={{ fontSize: '14px' }}>
          - <span className="font-normal">By</span> <span className="font-bold">Teach For Change Trust</span>
        </p>
      </div>

      {/* --- ABOUT --- */}
      <div className="mb-4 px-4">
        <p className="text-[17px] italic leading-relaxed text-justify">
          <strong className="font-bold">About:</strong> {
            phase === 'Baseline' ? "The Baseline Assessment is conducted in the beginning of the smart classroom program of Teach For Change. In this assessment, the students are individually assessed in 5 parameters of English Language Literacy." :
            phase === 'Midline' ? "The Midline Assessment is conducted in the mid of year of the smart classroom program of Teach For Change. In this assessment, the students are individually assessed in 5 parameters of English Language Literacy." :
            "The Endline Assessment is conducted at the end of the year of the smart classroom program of Teach For Change. In this assessment, the students are individually assessed in 5 parameters of English Language Literacy."
          }
        </p>
      </div>

      <div className="mb-2 px-4">
        <p className="text-[17px] font-bold">Results: The grade wise details:</p>
      </div>

      {/* --- GRADES 3 & 4 GRID --- */}
      <div className="grid grid-cols-2 gap-0 border-t border-slate-300">
        
        {/* Grade 3 Column */}
        <div className="border-r border-slate-300">
          <div className="bg-[#A9D18E] py-1.5 text-center border-b border-white">
            <h3 className="font-bold text-lg">Grade 3</h3>
          </div>
          {phase === 'Baseline' ? renderPieChart(grade3, `${shortName}_3rd Class ${phase} Test_Result`) : renderBarChart(grade3)}
          <div className="px-4 text-center pb-4 text-[13px] italic">
            {phase === 'Endline' ? (
              <>Fig 1: A total of {grade3.assessedCount} students were assessed, the English<br/>
              Language Literacy level is increased from<br/>
              baseline to endline {grade3.barData[0] && grade3.barData[0].Baseline ? ((grade3.avgTotal - grade3.barData[0].Baseline) / grade3.barData[0].Baseline * 100).toFixed(0) : 0}%</>
            ) : (
              <>Fig 1: A total of {grade3.assessedCount} students were assessed, the average<br/>
              English Language Literacy level is {grade3.avgTotal}</>
            )}
          </div>
        </div>

        {/* Grade 4 Column */}
        <div>
          <div className="bg-[#A9D18E] py-1.5 text-center border-b border-white border-l">
            <h3 className="font-bold text-lg">Grade 4</h3>
          </div>
          {phase === 'Baseline' ? renderPieChart(grade4, `${shortName}_4th Class ${phase} Test_Result`) : renderBarChart(grade4)}
          <div className="px-4 text-center pb-4 text-[13px] italic">
            {phase === 'Endline' ? (
              <>Fig 2: A total of {grade4.assessedCount} students were assessed, the English<br/>
              Language Literacy level is increased from<br/>
              baseline to endline {grade4.barData[0] && grade4.barData[0].Baseline ? ((grade4.avgTotal - grade4.barData[0].Baseline) / grade4.barData[0].Baseline * 100).toFixed(0) : 0}%</>
            ) : (
              <>Fig 2: A total of {grade4.assessedCount} students were assessed, the average<br/>
              English Language Literacy level is {grade4.avgTotal}</>
            )}
          </div>
        </div>
      </div>

      {/* --- GRADE 5 & NEXT STEPS GRID --- */}
      <div className="grid grid-cols-2 gap-0 border-t border-slate-300">
        
        {/* Grade 5 Column */}
        <div className="border-r border-slate-300">
          <div className="bg-[#A9D18E] py-1.5 text-center border-b border-white">
            <h3 className="font-bold text-lg">Grade 5</h3>
          </div>
          {phase === 'Baseline' ? renderPieChart(grade5, `${shortName}_5th Class ${phase} Test_Result`) : renderBarChart(grade5)}
          <div className="px-4 text-center pb-2 text-[12px] italic">
            {phase === 'Endline' ? (
              <>Fig 3: A total of {grade5.assessedCount} students were assessed, the English<br/>
              Language Literacy level is increased from<br/>
              baseline to endline {grade5.barData[0] && grade5.barData[0].Baseline ? ((grade5.avgTotal - grade5.barData[0].Baseline) / grade5.barData[0].Baseline * 100).toFixed(0) : 0}%</>
            ) : (
              <>Fig 3: A total of {grade5.assessedCount} students were assessed, the average<br/>
              English Language Literacy level is {grade5.avgTotal}</>
            )}
          </div>
        </div>

        {/* Next Steps Column */}
        <div>
          <div className="bg-[#FFD966] py-1.5 text-center border-b border-white border-l">
            <h3 className="font-bold text-lg">{phase === 'Endline' ? 'THANK YOU' : 'Next Steps'}</h3>
          </div>
          
          {phase === 'Baseline' ? (
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
          ) : phase === 'Midline' ? (
            <div className="p-8 pt-10 space-y-8 text-[15px]">
              <p>Focus on phonics and small group help.</p>
              <div className="w-full border-b border-slate-300"></div>
              <p>Make classrooms rich with reading books.</p>
              <p>Train teachers on effective ESL methods.</p>
              <p>Set clear goals and assess progress often</p>
            </div>
          ) : (
            <div className="p-6 pt-8 text-[16px] leading-relaxed font-bold text-justify">
              Thank you very much for your valuable support throughout this year. We truly 
              appreciate your collaboration and guidance. As we move forward, we look 
              forward to working together in the coming year to further enhance English 
              language skills among students in Grades 3, 4, and 5.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
