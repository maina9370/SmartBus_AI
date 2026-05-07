import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Student } from '../types';
import { 
  UserPlus, 
  Upload, 
  Mail, 
  Phone, 
  MapPin, 
  CheckCircle,
  Hash,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { deleteDoc, doc } from 'firebase/firestore';
import { resizeImage } from '../lib/imageUtils';

export default function StudentRegistration() {
  const [formData, setFormData] = useState({
    name: '',
    wing: '',
    department: '',
    year: '',
    busRoute: '',
    parentEmail: '',
    parentPhone: '',
    photoUrl: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [existingStudents, setExistingStudents] = useState<Student[]>([]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const snap = await getDocs(collection(db, 'students'));
      setExistingStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Student[]);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'students');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this student resource? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'students', id));
        fetchStudents();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `students/${id}`);
      }
    }
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const compressed = await resizeImage(base64);
        setFormData({ ...formData, photoUrl: compressed });
      } catch (err) {
        console.error("Failed to compress image:", err);
        setFormData({ ...formData, photoUrl: base64 });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.photoUrl || formData.photoUrl.startsWith('https://api.dicebear.com')) {
      alert("Please upload a real profile photo for face recognition.");
      return;
    }
    setIsSubmitting(true);
    try {
      // Ensure all fields are present and not undefined
      const studentData = {
        name: formData.name || '',
        wing: formData.wing || '',
        department: formData.department || '',
        year: formData.year || '',
        busRoute: formData.busRoute || '',
        parentEmail: formData.parentEmail || '',
        parentPhone: formData.parentPhone || '',
        photoUrl: formData.photoUrl || '',
        userId: auth.currentUser?.uid || null,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'students'), studentData);
      setSuccess(true);
      fetchStudents();
      setFormData({
        name: '', wing: '', department: '', year: '', busRoute: '',
        parentEmail: '', parentPhone: '',
        photoUrl: ''
      });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Enrollment error:", err);
      handleFirestoreError(err, OperationType.CREATE, 'students');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      {/* Registration Form */}
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Manager</h1>
          <p className="text-gray-500 mt-2">Register new bus pass users and manage existing profiles.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex justify-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl bg-gray-100 overflow-hidden border-4 border-gray-50 group-hover:border-black transition-colors flex items-center justify-center">
                {formData.photoUrl && !formData.photoUrl.startsWith('https://api.dicebear.com') ? (
                  <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <UserPlus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-[10px] text-gray-400 font-bold uppercase">No Photo</p>
                  </div>
                )}
              </div>
              <label 
                className="absolute -bottom-2 -right-2 bg-black text-white p-2 rounded-xl shadow-lg hover:scale-110 transition-transform cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Full Name</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black transition-all"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Wing / Degree</label>
              <select 
                required
                value={formData.wing}
                onChange={e => setFormData({...formData, wing: e.target.value})}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black"
              >
                <option value="">Select Wing...</option>
                <option value="Engg. Degree">Engg. Degree</option>
                <option value="ITI">ITI</option>
                <option value="Engg. Diploma">Engg. Diploma</option>
                <option value="B.Pharm">B.Pharm</option>
                <option value="D.Pharm">D.Pharm</option>
                <option value="M.Pharm">M.Pharm</option>
                <option value="Apex">Apex</option>
              </select>
            </div>
            
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Department</label>
              <select 
                required
                value={formData.department}
                onChange={e => setFormData({...formData, department: e.target.value})}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black"
              >
                <option value="">Select Dept...</option>
                <option value="AIML">AIML</option>
                <option value="Electrical">Electrical</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Civil">Civil</option>
                <option value="CS">CS</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Academic Year</label>
              <select 
                required
                value={formData.year}
                onChange={e => setFormData({...formData, year: e.target.value})}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black"
              >
                <option value="">Select Year...</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Bus Route</label>
              <select 
                required
                value={formData.busRoute}
                onChange={e => setFormData({...formData, busRoute: e.target.value})}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black"
              >
                <option value="">Select Route...</option>
                <option value="Vikhale (08)">Vikhale (Bus 08)</option>
                <option value="Takari (03)">Takari (Bus 03)</option>
                <option value="Kundal (06)">Kundal (Bus 06)</option>
                <option value="Tasgav (09)">Tasgav (Bus 09)</option>
                <option value="Kirloskarwadi (04)">Kirloskarwadi (Bus 04)</option>
                <option value="Amanpur (02)">Amanpur (Bus 02)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Parent Email</label>
              <input 
                required
                type="email" 
                value={formData.parentEmail}
                onChange={e => setFormData({...formData, parentEmail: e.target.value})}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black"
                placeholder="parent@example.com"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Parent Phone</label>
              <input 
                required
                type="tel" 
                value={formData.parentPhone}
                onChange={e => setFormData({...formData, parentPhone: e.target.value})}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black"
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-xl shadow-black/10 disabled:opacity-50"
          >
            {isSubmitting ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Enroll Student
              </>
            )}
          </button>

          {success && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-50 text-green-600 p-4 rounded-2xl text-center text-sm font-bold flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Student enrolled successfully!
            </motion.div>
          )}
        </form>
      </div>

      {/* Directory Table */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Hash className="w-5 h-5" /> Registered Students ({existingStudents.length})
        </h2>
        
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
          <div className="grid grid-cols-4 bg-gray-50 p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100">
            <div className="col-span-2">Identity</div>
            <div>Route</div>
            <div className="text-right">Status</div>
          </div>
          <div className="divide-y divide-gray-100">
            {existingStudents.length === 0 ? (
              <div className="p-12 text-center text-gray-400 italic">No students registered yet.</div>
            ) : (
              existingStudents.map(student => (
                <div key={student.id} className="grid grid-cols-4 p-4 items-center hover:bg-gray-50 transition-colors text-sm">
                  <div className="col-span-2 flex items-center gap-3">
                    <img src={student.photoUrl} className="w-10 h-10 rounded-xl bg-gray-100" alt="" />
                    <div>
                      <div className="font-bold">{student.name}</div>
                      <div className="text-xs text-gray-400">{student.wing} • {student.department} • {student.year || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <MapPin className="w-3 h-3" /> {student.busRoute}
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <span className="px-2 py-1 rounded-full bg-green-50 text-green-600 text-[10px] font-bold uppercase tracking-wider">
                      {student.status}
                    </span>
                    <button 
                      onClick={() => handleDelete(student.id)}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
