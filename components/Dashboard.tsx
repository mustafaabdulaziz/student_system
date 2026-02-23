import React from 'react';
import { Student, Application, Program } from '../types';
import { Users, FileText, School, TrendingUp } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface DashboardProps {
  students: Student[];
  applications: Application[];
  programs: Program[];
  universitiesCount: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
  students,
  applications,
  programs,
  universitiesCount
}) => {
  const { t, translateStatus } = useTranslation();

  // Helper to get program name
  const getProgramName = (progId: string) => programs.find(p => p.id === progId)?.name || t.noPrograms;
  const getStudentName = (studId: string) => {
    const s = students.find(std => std.id === studId);
    return s ? `${s.firstName} ${s.lastName}` : t.noStudents;
  };

  const stats = [
    { label: t.totalStudents, value: students.length, icon: Users, color: 'bg-blue-500' },
    { label: t.totalApplications, value: applications.length, icon: FileText, color: 'bg-emerald-500' },
    { label: t.totalUniversities, value: universitiesCount, icon: School, color: 'bg-purple-500' },
    { label: t.totalPrograms, value: programs.length, icon: TrendingUp, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">{t.dashboardTitle}</h2>
        <p className="text-gray-500">{t.recentApplications}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 space-x-reverse">
            <div className={`p-4 rounded-lg text-white ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-800">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Applications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-800">{t.recentApplications}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-6 py-3 font-medium">{t.applicationDetails}</th>
                  <th className="px-6 py-3 font-medium">{t.selectStudent}</th>
                  <th className="px-6 py-3 font-medium">{t.selectProgram}</th>
                  <th className="px-6 py-3 font-medium">{t.applicationStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.slice(-5).reverse().map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs">{app.id.substring(0, 8)}...</td>
                    <td className="px-6 py-4">{getStudentName(app.studentId)}</td>
                    <td className="px-6 py-4 text-gray-600">{getProgramName(app.programId)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium 
                        ${app.status === 'Accepted' || app.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                          app.status === 'Rejected' || app.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'}`}>
                        {translateStatus(app.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {applications.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">{t.noApplications}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Students */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-800">{t.students}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-6 py-3 font-medium">{t.userName}</th>
                  <th className="px-6 py-3 font-medium">{t.nationality}</th>
                  <th className="px-6 py-3 font-medium">{t.dateOfBirth}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.slice(-5).reverse().map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{student.firstName} {student.lastName}</td>
                    <td className="px-6 py-4 text-gray-600">{student.nationality}</td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{t.recentApplications}</td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-400">{t.noStudents}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};