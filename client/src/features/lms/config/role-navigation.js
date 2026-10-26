/**
 * Aacharya LMS — Role Navigation Configuration
 *
 * Purpose:
 * Central configuration for role-specific application navigation.
 *
 * Rules:
 * - JavaScript only.
 * - Navigation must follow the locked role hierarchy.
 * - No public student registration.
 * - Mentors operate only within assigned batches and sections.
 * - Navigation visibility is not a substitute for backend authorization.
 */

export const LMS_ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  HOD: 'HOD',
  FACULTY: 'FACULTY',
  MENTOR: 'MENTOR',
  STUDENT: 'STUDENT',
  ALUMNI: 'ALUMNI',
});

export const LMS_ROLE_HIERARCHY = Object.freeze([
  LMS_ROLES.SUPER_ADMIN,
  LMS_ROLES.HOD,
  LMS_ROLES.FACULTY,
  LMS_ROLES.MENTOR,
  LMS_ROLES.STUDENT,
  LMS_ROLES.ALUMNI,
]);

export const ROLE_NAVIGATION = Object.freeze({
  [LMS_ROLES.SUPER_ADMIN]: [
    {
      id: 'overview',
      label: 'Dashboard',
      path: '/super-admin/dashboard',
      group: 'main',
    },
    {
      id: 'departments',
      label: 'Departments',
      path: '/super-admin/departments',
      group: 'administration',
    },
    {
      id: 'hod-accounts',
      label: 'HOD Accounts',
      path: '/super-admin/hods',
      group: 'administration',
    },
    {
      id: 'profile',
      label: 'My Profile',
      path: '/super-admin/profile',
      group: 'account',
    },
  ],

  [LMS_ROLES.HOD]: [
    {
      id: 'overview',
      label: 'Dashboard',
      path: '/hod/dashboard',
      group: 'main',
    },
    {
      id: 'faculty',
      label: 'Faculty',
      path: '/hod/faculty',
      group: 'department',
    },
    {
      id: 'mentors',
      label: 'Mentors & TG',
      path: '/hod/mentors',
      group: 'department',
    },
    {
      id: 'batches',
      label: 'Batches & Sections',
      path: '/hod/batches',
      group: 'department',
    },
    {
      id: 'timetable',
      label: 'Timetable',
      path: '/hod/timetable',
      group: 'academics',
    },
    {
      id: 'courses',
      label: 'Courses',
      path: '/hod/courses',
      group: 'academics',
    },
    {
      id: 'attendance',
      label: 'Attendance',
      path: '/hod/attendance',
      group: 'academics',
    },
    {
      id: 'assignments',
      label: 'Assignments',
      path: '/hod/assignments',
      group: 'academics',
    },
    {
      id: 'quizzes',
      label: 'Quizzes',
      path: '/hod/quizzes',
      group: 'academics',
    },
    {
      id: 'results',
      label: 'Results',
      path: '/hod/results',
      group: 'academics',
    },
    {
      id: 'profile',
      label: 'My Profile',
      path: '/hod/profile',
      group: 'account',
    },
  ],

  [LMS_ROLES.FACULTY]: [
    {
      id: 'overview',
      label: 'Dashboard',
      path: '/faculty/dashboard',
      group: 'main',
    },
    {
      id: 'timetable',
      label: 'My Timetable',
      path: '/faculty/timetable',
      group: 'teaching',
    },
    {
      id: 'courses',
      label: 'Courses',
      path: '/faculty/courses',
      group: 'teaching',
    },
    {
      id: 'attendance',
      label: 'Attendance',
      path: '/faculty/attendance',
      group: 'teaching',
    },
    {
      id: 'assignments',
      label: 'Assignments',
      path: '/faculty/assignments',
      group: 'assessment',
    },
    {
      id: 'quizzes',
      label: 'Quizzes',
      path: '/faculty/quizzes',
      group: 'assessment',
    },
    {
      id: 'results',
      label: 'Results',
      path: '/faculty/results',
      group: 'assessment',
    },
    {
      id: 'profile',
      label: 'My Profile',
      path: '/faculty/profile',
      group: 'account',
    },
  ],

  [LMS_ROLES.MENTOR]: [
    {
      id: 'overview',
      label: 'Dashboard',
      path: '/mentor/dashboard',
      group: 'main',
    },
    {
      id: 'students',
      label: 'Assigned Students',
      path: '/mentor/students',
      group: 'mentoring',
    },
    {
      id: 'student-import',
      label: 'Student Import',
      path: '/mentor/students/import',
      group: 'mentoring',
    },
    {
      id: 'batches',
      label: 'My Batches & Sections',
      path: '/mentor/batches',
      group: 'mentoring',
    },
    {
      id: 'attendance',
      label: 'Attendance',
      path: '/mentor/attendance',
      group: 'academics',
    },
    {
      id: 'profile',
      label: 'My Profile',
      path: '/mentor/profile',
      group: 'account',
    },
  ],

  [LMS_ROLES.STUDENT]: [
    {
      id: 'overview',
      label: 'Dashboard',
      path: '/student/dashboard',
      group: 'main',
    },
    {
      id: 'timetable',
      label: 'My Timetable',
      path: '/student/timetable',
      group: 'academics',
    },
    {
      id: 'courses',
      label: 'My Courses',
      path: '/student/courses',
      group: 'academics',
    },
    {
      id: 'attendance',
      label: 'My Attendance',
      path: '/student/attendance',
      group: 'academics',
    },
    {
      id: 'assignments',
      label: 'Assignments',
      path: '/student/assignments',
      group: 'learning',
    },
    {
      id: 'quizzes',
      label: 'Quizzes',
      path: '/student/quizzes',
      group: 'learning',
    },
    {
      id: 'results',
      label: 'My Results',
      path: '/student/results',
      group: 'learning',
    },
    {
      id: 'profile',
      label: 'My Profile',
      path: '/student/profile',
      group: 'account',
    },
  ],

  [LMS_ROLES.ALUMNI]: [
    {
      id: 'overview',
      label: 'Dashboard',
      path: '/alumni/dashboard',
      group: 'main',
    },
    {
      id: 'profile',
      label: 'My Profile',
      path: '/alumni/profile',
      group: 'account',
    },
  ],
});

export function getRoleNavigation(role) {
  if (typeof role !== 'string') {
    return [];
  }

  const normalizedRole = role.trim().toUpperCase();

  return ROLE_NAVIGATION[normalizedRole] ?? [];
}

export function isSupportedRole(role) {
  if (typeof role !== 'string') {
    return false;
  }

  return LMS_ROLE_HIERARCHY.includes(role.trim().toUpperCase());
}