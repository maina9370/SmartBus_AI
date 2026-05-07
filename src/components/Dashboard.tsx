import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getDocs, addDoc, doc, setDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Student, AttendanceLog, Bus } from '../types';
import { 
  Users, 
  Bus as BusIcon, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  FileCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to recent logs
    const q = query(collection(db, 'attendance_logs'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribeLogs = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AttendanceLog[];
      setLogs(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'attendance_logs');
    });

    // Get stats
    const fetchStats = async () => {
      try {
        const studentSnap = await getDocs(collection(db, 'students'));
        const studentList = studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as Student }));
        setStudents(studentList);
        
        const busSnap = await getDocs(collection(db, 'buses'));
        const busList = busSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as Bus }));
        
        // Seed if empty
        if (busList.length === 0) {
          const seedBuses = [
            { id: 'BUS-08', busNumber: '08', route: 'Vikhale', driverName: 'Sanjay Kumar', currentOccupancy: 0, maxCapacity: 50 },
            { id: 'BUS-03', busNumber: '03', route: 'Takari', driverName: 'Rajesh Patil', currentOccupancy: 0, maxCapacity: 50 },
            { id: 'BUS-06', busNumber: '06', route: 'Kundal', driverName: 'Vishal Mane', currentOccupancy: 0, maxCapacity: 50 },
            { id: 'BUS-09', busNumber: '09', route: 'Tasgav', driverName: 'Amol Deshmukh', currentOccupancy: 0, maxCapacity: 50 },
            { id: 'BUS-04', busNumber: '04', route: 'Kirloskarwadi', driverName: 'Sandeep Pawar', currentOccupancy: 0, maxCapacity: 50 },
            { id: 'BUS-02', busNumber: '02', route: 'Amanpur', driverName: 'Rahul Shinde', currentOccupancy: 0, maxCapacity: 50 },
            { id: 'BUS-001', busNumber: '01', route: 'Campus Shuttle', driverName: 'Default Driver', currentOccupancy: 0, maxCapacity: 40 },
          ];
          for (const b of seedBuses) {
            const { id, ...busData } = b;
            await setDoc(doc(db, 'buses', id), busData);
          }
          setBuses(seedBuses);
        } else {
          setBuses(busList);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'multiple_collections');
      }
    };

    fetchStats();
    return () => unsubscribeLogs();
  }, []);

  const stats = [
    { label: 'Total Students', value: students.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Buses', value: buses.length, icon: BusIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Trips Today', value: logs.length, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Overcrowding', value: buses.filter(b => b.currentOccupancy >= b.maxCapacity).length, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
        <p className="text-gray-500 mt-1">Live tracking and analytics for student bus routes.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label} 
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5" /> Recent Activity
            </h2>
          </div>
          
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-5 bg-gray-50 p-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-bottom border-gray-100">
              <div className="col-span-2">Student</div>
              <div>Bus</div>
              <div>Action</div>
              <div className="text-right">Time</div>
            </div>
            {loading ? (
              <div className="p-12 text-center text-gray-400 italic">Tracking live events...</div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-gray-400 italic">No activity logged yet.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="grid grid-cols-5 p-4 items-center hover:bg-gray-50 transition-colors border-t border-gray-100 text-sm">
                  <div className="col-span-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                      <img 
                        src={students.find(s => s.id === log.studentId)?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${log.studentId}`} 
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-bold">{students.find(s => s.id === log.studentId)?.name || 'Unknown Student'}</div>
                      <div className="text-xs text-gray-400 font-mono">ID: {log.studentId.substring(0, 8)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-gray-600">
                    <BusIcon className="w-3 h-3" /> {log.busId}
                  </div>
                  <div>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide",
                      log.action === 'board' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                    )}>
                      {log.action}ed
                    </span>
                  </div>
                  <div className="text-right text-gray-400 font-mono text-xs">
                    {log.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Health / Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> System Status
          </h2>
          <div className="bg-black text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-2">AI Engine Active</h3>
              <p className="text-gray-400 text-sm mb-4">Face recognition model is running at 99.8% precision across 4 routes.</p>
              <div className="flex items-center gap-2 text-green-400 text-xs font-bold uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Live Feed Syncing
              </div>
            </div>
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl" />
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400">Quick Actions</h3>
            <Link to="/students" className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors group">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5" />
                <span className="font-bold text-sm">Register Student</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400">Route Information</h3>
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded">08</span>
                  <span className="font-bold text-sm text-gray-900 underline underline-offset-4 decoration-green-400">Vikhale Route</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['Vikhale stand', 'Kaledhon', 'Devikhindi', 'Vejegav', 'Bhendwade', 'Salshinge', 'IT college', 'Vita', 'AIT'].map(stop => (
                    <span key={stop} className="text-[10px] bg-gray-50 text-gray-500 px-2 py-1 rounded-full border border-gray-100">{stop}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded">03</span>
                  <span className="font-bold text-sm text-gray-900 underline underline-offset-4 decoration-blue-400">Takari Route</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['Shirte', 'Yedemachindra', 'Bhawani nagar', 'Retare', 'Dudhari', 'Takari', 'Tupari', 'Dhayari', 'Ghogav', 'AIT'].map(stop => (
                    <span key={stop} className="text-[10px] bg-gray-50 text-gray-500 px-2 py-1 rounded-full border border-gray-100">{stop}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded">06</span>
                  <span className="font-bold text-sm text-gray-900 underline underline-offset-4 decoration-orange-400">Kundal Route</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['kundal', 'balawadi fata', 'balawadi', 'tandalgav', 'khambale', 'AIT'].map(stop => (
                    <span key={stop} className="text-[10px] bg-gray-50 text-gray-500 px-2 py-1 rounded-full border border-gray-100">{stop}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded">09</span>
                  <span className="font-bold text-sm text-gray-900 underline underline-offset-4 decoration-purple-400">Tasgav Route</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['tasgav', 'vanjarwadi', 'visapur', 'shirgav', 'panmalewadi', 'borgav', 'limb', 'aalte', 'karve', 'AIT'].map(stop => (
                    <span key={stop} className="text-[10px] bg-gray-50 text-gray-500 px-2 py-1 rounded-full border border-gray-100">{stop}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded">04</span>
                  <span className="font-bold text-sm text-gray-900 underline underline-offset-4 decoration-pink-400">Kirloskarwadi Route</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['dudhondi', 'Kirloskarwadi', 'palus colani', 'palus', 'AIT'].map(stop => (
                    <span key={stop} className="text-[10px] bg-gray-50 text-gray-500 px-2 py-1 rounded-full border border-gray-100">{stop}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded">02</span>
                  <span className="font-bold text-sm text-gray-900 underline underline-offset-4 decoration-yellow-400">Amanpur Route</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['burli', 'Amanpour', 'palus', 'khambale', 'AIT'].map(stop => (
                    <span key={stop} className="text-[10px] bg-gray-50 text-gray-500 px-2 py-1 rounded-full border border-gray-100">{stop}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
