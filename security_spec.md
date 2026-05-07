# Security Specification: SmartBus AI Tracking

## Data Invariants
1. A student's profile can only be created by an authorized admin.
2. Attendance logs are append-only by the verification terminal (bus driver/camera system).
3. Notifications are system-generated and read-only for the relevant student's parent (simulated).
4. No student can impersonate another; verification is based on face/ID.

## The Dirty Dozen (Threat Models)
1. **The Ghost Boarding**: Attempting to create an attendance log for a non-existent student.
2. **The Time Warp**: Creating a log with a backdated or future timestamp.
3. **The Identity Thief**: A student trying to update another student's profile.
4. **The Squatter**: Attempting to set own status to 'active' without admin permission.
5. **The Spam Engine**: Creating thousands of notification records manually.
6. **The Data Scraper**: Attempting to list all students without being an admin.
7. **The Location Fabricator**: Adding a log with impossible GPS coordinates.
8. **The Status Hijacker**: Changing 'sent' status of a notification to trigger re-sends.
9. **The Bus Hijacker**: Creating or modifying bus capacity as a normal user.
10. **The Orphan Maker**: Deleting a student while they are still marked as 'inside' a bus.
11. **The PII Leaker**: Reading a student's `parentPhone` without being that student or an admin.
12. **The Shadow Update**: Adding a field like `isVerified: true` to a student record.

## Security Controls
- **Admin Role**: Controlled via a `/admins/{uid}` collection.
- **Verification Terminals**: Any authenticated user (drivers) can write to `attendance_logs` but not edit them.
- **Parent Access**: Authenticated parents can view logs and notifications associated with their child's `studentId` (or matching email).

## Implementation Rules
- All writes to `attendance_logs` must validate `studentId` exists.
- All timestamps must be `request.time`.
- `affectedKeys().hasOnly()` used religiously for updates.
