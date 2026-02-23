import React, { useState } from 'react';
import { Student, Application, Program, University, ApplicationStatus } from '../types';
import { Plus, User, Search, Eye, X } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface StudentManagerProps {
  students: Student[];
  applications: Application[];
  programs: Program[];
  universities: University[];
  onAddStudent: (student: Student) => Promise<string | null> | string | null;
  onCreateApplicationForStudent?: (studentId: string) => void;
  onViewApplication?: (applicationId: string) => void;
  currentUser: { id: string; role: string } | null;
}

export const StudentManager: React.FC<StudentManagerProps> = ({
  students,
  applications = [],
  programs = [],
  universities = [],
  onAddStudent,
  onCreateApplicationForStudent,
  onViewApplication,
  currentUser
}) => {
  const { t, translateGender, translateStatus } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<Student | null>(null);

  const [formData, setFormData] = useState<Partial<Student>>({
    firstName: '',
    lastName: '',
    passportNumber: '',
    nationality: '',
    email: '',
    phone: '',
    fatherName: '',
    motherName: '',
    gender: 'Male',
    degreeTarget: '',
    dob: '',
    residenceCountry: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiredFields = ['firstName', 'lastName', 'passportNumber', 'nationality', 'email', 'phone'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof Student]);

    if (missingFields.length > 0) {
      alert(`${t.fillRequired}: ${missingFields.join(', ')}`);
      return;
    }

    const newStudent: Student & { user_id?: string; role?: string } = {
      id: Date.now().toString(),
      firstName: formData.firstName!,
      lastName: formData.lastName!,
      passportNumber: formData.passportNumber!,
      nationality: formData.nationality!,
      email: formData.email!,
      phone: formData.phone!,
      fatherName: formData.fatherName || '',
      motherName: formData.motherName || '',
      gender: formData.gender as 'Male' | 'Female' || 'Male',
      degreeTarget: formData.degreeTarget || '',
      dob: formData.dob || '',
      residenceCountry: formData.residenceCountry || '',
      user_id: currentUser?.id,
      role: currentUser?.role
    };

    try {
      await onAddStudent(newStudent as Student);
      setModalOpen(false);
      setFormData({
        firstName: '', lastName: '', passportNumber: '', nationality: '', email: '', phone: '',
        fatherName: '', motherName: '', gender: 'Male', degreeTarget: '', dob: '', residenceCountry: ''
      });
    } catch (error) {
      alert(t.errorAdd);
    }
  };

  const filteredStudents = students.filter(student =>
    student.firstName.includes(searchTerm) ||
    student.lastName.includes(searchTerm) ||
    student.passportNumber.includes(searchTerm)
  );

  const getStudentApplications = (studentId: string) => {
    return applications
      .filter(a => a.studentId === studentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const getProgramInfo = (programId: string) => {
    const program = programs.find(p => p.id === programId);
    const university = program ? universities.find(u => u.id === program.universityId) : null;
    return {
      programName: program ? program.name : t.noPrograms,
      universityName: university ? university.name : t.noUniversities,
      degree: program ? program.degree : ''
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case ApplicationStatus.ACCEPTED: return <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">{t.approved}</span>;
      case ApplicationStatus.REJECTED: return <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">{t.rejected}</span>;
      case ApplicationStatus.MISSING_DOCS: return <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">{t.pending}</span>;
      default: return <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">{t.pending}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t.studentsTitle}</h2>
          <p className="text-gray-500">{t.studentsTitle}</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center space-x-2 space-x-reverse bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          <span>{t.addStudent}</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={t.search}
            className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map(student => (
          <div key={student.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <User className="text-blue-600" size={24} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedStudentForDetails(student)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="عرض التفاصيل"
                >
                  <Eye size={20} />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-bold text-gray-800 mb-2">{student.firstName} {student.lastName}</h3>

            <div className="space-y-2 text-sm text-gray-600 mb-6">
              <div className="flex justify-between">
                <span>{t.passportNumber}:</span>
                <span className="font-mono">{student.passportNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>{t.nationality}:</span>
                <span>{student.nationality}</span>
              </div>
              <div className="flex justify-between">
                <span>{t.email}:</span>
                <span>{student.email}</span>
              </div>
            </div>

            <button
              onClick={() => onCreateApplicationForStudent?.(student.id)}
              className="w-full py-2 bg-gray-50 text-blue-600 rounded-lg hover:bg-blue-50 font-medium transition-colors"
            >
              {t.addApplication}
            </button>
          </div>
        ))}
      </div>

      {/* Add Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{t.addStudent}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
              {/* Personal Names */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.firstName}</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-blue-500"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.lastName}</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-blue-500"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.fatherName}</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-blue-500"
                    value={formData.fatherName}
                    onChange={e => setFormData({ ...formData, fatherName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.motherName}</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-blue-500"
                    value={formData.motherName}
                    onChange={e => setFormData({ ...formData, motherName: e.target.value })}
                  />
                </div>
              </div>

              {/* Identity & Demographics */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.passportNumber}</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-blue-500"
                    value={formData.passportNumber}
                    onChange={e => setFormData({ ...formData, passportNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.dateOfBirth}</label>
                  <input
                    type="date"
                    required
                    className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-blue-500"
                    value={formData.dob}
                    onChange={e => setFormData({ ...formData, dob: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.gender}</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-blue-500"
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as 'Male' | 'Female' })}
                  >
                    <option value="Male">{t.male}</option>
                    <option value="Female">{t.female}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.nationality}</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-blue-500"
                    value={formData.nationality}
                    onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.residenceCountry}</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-blue-500"
                    value={formData.residenceCountry}
                    onChange={e => setFormData({ ...formData, residenceCountry: e.target.value })}
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
                  <input
                    type="email"
                    required
                    className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-blue-500"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.phone}</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-blue-500"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Academic Interest */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.degreeTarget}</label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-blue-500 bg-white"
                  value={formData.degreeTarget}
                  onChange={e => setFormData({ ...formData, degreeTarget: e.target.value })}
                >
                  <option value="">{t.selectDegree}</option>
                  <option value="Bachelor">{t.bachelor}</option>
                  <option value="Master">{t.master}</option>
                  <option value="PhD">{t.phd}</option>
                </select>
              </div>

              <div className="flex justify-end pt-4 gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Details & Applications Modal */}
      {selectedStudentForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-6 bg-gray-50 border-b flex justify-between items-center sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{t.userName}: {selectedStudentForDetails.firstName} {selectedStudentForDetails.lastName}</h3>
                <p className="text-gray-500 text-sm">{t.passportNumber}: {selectedStudentForDetails.passportNumber}</p>
              </div>
              <button onClick={() => setSelectedStudentForDetails(null)} className="text-gray-400 hover:text-gray-600 p-1 bg-white rounded-full shadow-sm hover:shadow">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Personal Info Section */}
              <section>
                <h4 className="flex items-center gap-2 font-bold text-gray-700 mb-4 pb-2 border-b">
                  <User size={18} />
                  {t.userName}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8 text-sm">
                  <div className="flex flex-col"><span className="text-gray-500">{t.userName}</span> <span className="font-medium">{selectedStudentForDetails.firstName} {selectedStudentForDetails.lastName}</span></div>
                  <div className="flex flex-col"><span className="text-gray-500">{t.fatherName}</span> <span className="font-medium">{selectedStudentForDetails.fatherName || '-'}</span></div>
                  <div className="flex flex-col"><span className="text-gray-500">{t.motherName}</span> <span className="font-medium">{selectedStudentForDetails.motherName || '-'}</span></div>
                  <div className="flex flex-col"><span className="text-gray-500">{t.nationality}</span> <span className="font-medium">{selectedStudentForDetails.nationality}</span></div>
                  <div className="flex flex-col"><span className="text-gray-500">{t.residenceCountry}</span> <span className="font-medium">{selectedStudentForDetails.residenceCountry || '-'}</span></div>
                  <div className="flex flex-col"><span className="text-gray-500">{t.dateOfBirth}</span> <span className="font-medium">{selectedStudentForDetails.dob || '-'}</span></div>
                  <div className="flex flex-col"><span className="text-gray-500">{t.email}</span> <span className="font-medium">{selectedStudentForDetails.email}</span></div>
                  <div className="flex flex-col"><span className="text-gray-500">{t.phone}</span> <span className="font-medium">{selectedStudentForDetails.phone}</span></div>
                  <div className="flex flex-col"><span className="text-gray-500">{t.degreeTarget}</span> <span className="font-medium">{selectedStudentForDetails.degreeTarget || '-'}</span></div>
                </div>
              </section>

              {/* Applications Section */}
              <section>
                <div className="flex justify-between items-center mb-4 pb-2 border-b">
                  <h4 className="flex items-center gap-2 font-bold text-gray-700">
                    <Eye size={18} />
                    {t.applicationsTitle} ({getStudentApplications(selectedStudentForDetails.id).length})
                  </h4>
                  <button
                    onClick={() => { setSelectedStudentForDetails(null); onCreateApplicationForStudent?.(selectedStudentForDetails.id); }}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + {t.addApplication}
                  </button>
                </div>

                <div className="space-y-3">
                  {getStudentApplications(selectedStudentForDetails.id).length > 0 ? (
                    getStudentApplications(selectedStudentForDetails.id).map(app => {
                      const info = getProgramInfo(app.programId);
                      return (
                        <div
                          key={app.id}
                          className="border rounded-lg p-4 bg-gray-50 hover:bg-white hover:shadow-sm transition-all cursor-pointer group"
                          onClick={() => onViewApplication?.(app.id)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{info.programName}</div>
                            {getStatusBadge(app.status)}
                          </div>
                          <div className="text-sm text-gray-600 mb-1">{info.universityName} - <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">{info.degree}</span></div>
                          <div className="text-xs text-gray-400 mt-2 flex justify-between">
                            <span>{t.applicationDetails}: #{app.id}</span>
                            <span>{t.dateOfBirth}: {new Date(app.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg text-gray-400 border border-dashed">
                      {t.noApplications}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};