import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Notification, Student } from '../types';
import { 
  Bell, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  Bus,
  MapPin,
  ArrowRight,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function ParentView() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For demo, we either use auth email or pick the first student's parent email
    const fetchContent = async () => {
      const email = auth.currentUser?.email || '';
      if (!email) return;

      try {
        // Try to find if user is a parent of any student
        const studentSnap = await getDocs(query(collection(db, 'students'), where('parentEmail', '==', email)));
        
        if (!studentSnap.empty) {
          const studentData = { id: studentSnap.docs[0].id, ...studentSnap.docs[0].data() } as Student;
          setStudent(studentData);
          
          // Listen to notifications - securely filtering by studentId or recipientEmail
          // If the user isn't admin, the rule check will force the result to match their email anyway.
          const q = query(
            collection(db, 'notifications'), 
            where('studentId', '==', studentData.id),
            orderBy('timestamp', 'desc')
          );
          
          const unsubscribe = onSnapshot(q, (snapshot) => {
            setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[]);
            setLoading(false);
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, 'notifications');
          });
          
          return unsubscribe;
        } else {
          // Fallback for demo if no student found for account
          // Important: We must filter by recipientEmail to satisfy security rules for non-admins
          const q = query(
            collection(db, 'notifications'), 
            where('recipientEmail', '==', email),
            orderBy('timestamp', 'desc')
          );
          const unsubscribe = onSnapshot(q, (snapshot) => {
            setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[]);
            setLoading(false);
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, 'notifications_fallback');
          });
          return unsubscribe;
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'parent_initial_fetch');
        setLoading(false);
      }
    };

    const unsubPromise = fetchContent();
    return () => { unsubPromise.then(u => u?.()); };
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Phone Simulation Header */}
      <div className="bg-black text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">
              <Smartphone className="w-4 h-4" /> SmartBus Mobile Push
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Parent Portal</h1>
            <p className="text-gray-400 mt-1 max-w-md">Real-time safety updates for {student ? student.name : "your children"}.</p>
          </div>
          <div className="flex gap-2">
            <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/10 flex flex-col items-center">
              <div className="text-lg font-bold">{notifications.length}</div>
              <div className="text-[10px] uppercase font-bold text-gray-500">Alerts</div>
            </div>
            <div className="bg-green-500/20 px-4 py-2 rounded-2xl border border-green-500/20 flex flex-col items-center">
              <div className="text-lg font-bold text-green-400">Live</div>
              <div className="text-[10px] uppercase font-bold text-green-500">System</div>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
      </div>

      {/* Notification List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-700" /> Notification History
          </h2>
          <button className="text-sm font-bold text-gray-400 hover:text-black transition-colors">Clear All</button>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-gray-100 border-t-black rounded-full animate-spin" />
              <p className="text-gray-400 font-medium">Connecting to safety node...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-[32px] p-16 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-gray-200" />
              </div>
              <div>
                <h3 className="font-bold text-lg">No New Alerts</h3>
                <p className="text-gray-400 text-sm">All set! We'll notify you as soon as your child scans their ID.</p>
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {notifications.map((notif, i) => (
                <motion.div 
                  key={notif.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "bg-white border rounded-[28px] p-5 shadow-sm hover:shadow-md transition-all group border-gray-100",
                    i === 0 && "ring-2 ring-black ring-offset-2"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                      notif.type === 'boarding' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                    )}>
                      {notif.type === 'boarding' ? <Bus className="w-6 h-6" /> : <MapPin className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {notif.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {i === 0 && <span className="bg-black text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">Newest</span>}
                      </div>
                      <h4 className="font-bold text-lg leading-tight group-hover:text-black transition-colors">
                        {notif.type === 'boarding' ? 'Student Boarded' : 'Student Exited'}
                      </h4>
                      <p className="text-gray-500 text-sm leading-relaxed">{notif.message}</p>
                      
                      <div className="pt-3 flex items-center gap-6 mt-2 border-t border-gray-50">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                           <CheckCircle2 className="w-3 h-3 text-green-500" /> Verified by AI
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                           <MessageSquare className="w-3 h-3 text-blue-500" /> SMS Delivered
                        </div>
                      </div>
                    </div>
                    <div className="self-center">
                      <ArrowRight className="w-5 h-5 text-gray-100 group-hover:text-gray-400 transition-colors" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-gray-50 rounded-[32px] p-6 border border-gray-100 flex flex-col md:flex-row items-center gap-6">
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
          <Smartphone className="w-8 h-8 opacity-20" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="font-bold">How notifications work</h3>
          <p className="text-sm text-gray-500">Notifications are triggered instantly when the AI camera module verifies your child's face at the bus entry and exit points. Real-time GPS location is included in every alert.</p>
        </div>
      </div>
    </div>
  );
}
