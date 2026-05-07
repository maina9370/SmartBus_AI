export interface Student {
  id: string;
  name: string;
  wing: string;
  department: string;
  year: string;
  busRoute: string;
  parentEmail: string;
  parentPhone: string;
  photoUrl: string;
  userId?: string;
  status: 'active' | 'suspended';
}

export interface AttendanceLog {
  id: string;
  studentId: string;
  busId: string;
  action: 'board' | 'exit';
  timestamp: any; // Firestore timestamp
  location: {
    lat: number;
    lng: number;
    stopName: string;
  };
}

export interface Bus {
  id: string;
  busNumber: string;
  route: string;
  driverName: string;
  currentOccupancy: number;
  maxCapacity: number;
}

export interface Notification {
  id: string;
  studentId: string;
  recipientEmail: string;
  message: string;
  type: 'boarding' | 'exiting';
  timestamp: any;
  sent: boolean;
}
