import AppLayout from "../features/lms/layout/AppLayout.jsx";

// Super Admin pages
import SuperAdminDashboard from "../features/lms/pages/super-admin/SuperAdminDashboard.jsx";
import SuperAdminProfile from "../features/lms/pages/super-admin/SuperAdminProfile.jsx";
import SuperAdminNotifications from "../features/lms/pages/super-admin/SuperAdminNotifications.jsx";

import DepartmentList from "../features/lms/pages/super-admin/DepartmentList.jsx";
import CreateDepartment from "../features/lms/pages/super-admin/CreateDepartment.jsx";
import DepartmentDetails from "../features/lms/pages/super-admin/DepartmentDetails.jsx";

import HodList from "../features/lms/pages/super-admin/HodList.jsx";
import CreateHod from "../features/lms/pages/super-admin/CreateHod.jsx";
import HodDetails from "../features/lms/pages/super-admin/HodDetails.jsx";

// HOD pages
import HodDashboard from "../features/lms/pages/hod/HodDashboard.jsx";

import FacultyList from "../features/lms/pages/hod/FacultyList.jsx";
import CreateFaculty from "../features/lms/pages/hod/CreateFaculty.jsx";
import FacultyDetails from "../features/lms/pages/hod/FacultyDetails.jsx";
import EditFaculty from "../features/lms/pages/hod/EditFaculty.jsx";

import GrantMentorRole from "../features/lms/pages/hod/GrantMentorRole.jsx";
import MentorAssignments from "../features/lms/pages/hod/MentorAssignments.jsx";

import BatchList from "../features/lms/pages/hod/BatchList.jsx";
import CreateBatch from "../features/lms/pages/hod/CreateBatch.jsx";
import BatchDetails from "../features/lms/pages/hod/BatchDetails.jsx";

import SectionList from "../features/lms/pages/hod/SectionList.jsx";
import CreateSection from "../features/lms/pages/hod/CreateSection.jsx";
import SectionDetails from "../features/lms/pages/hod/SectionDetails.jsx";
import EditSection from "../features/lms/pages/hod/EditSection.jsx";

import TimetableOverview from "../features/lms/pages/hod/TimetableOverview.jsx";
import CreateTimetable from "../features/lms/pages/hod/CreateTimetable.jsx";
import EditTimetable from "../features/lms/pages/hod/EditTimetable.jsx";

import AttendanceOverview from "../features/lms/pages/hod/AttendandenceOverview.jsx";
import AttendanceReports from "../features/lms/pages/hod/AttendanceReports.jsx";

import CourseOverview from "../features/lms/pages/hod/CourseOverview.jsx";
import CourseDetails from "../features/lms/pages/hod/CourseDetails.jsx";
import EditCourse from "../features/lms/pages/hod/EditCourse.jsx";

import AssignmentOverview from "../features/lms/pages/hod/AssignmentOverview.jsx";
import AssignmentDetails from "../features/lms/pages/hod/AssignmentDetails.jsx";
import EditAssignment from "../features/lms/pages/hod/EditAssignment.jsx";

import QuizOverview from "../features/lms/pages/hod/QuizOverview.jsx";
import QuizDetails from "../features/lms/pages/hod/QuizDetails.jsx";
import QuizEdit from "../features/lms/pages/hod/QuizEdit.jsx";

import ResultOverview from "../features/lms/pages/hod/ResultOverview.jsx";
import ResultDetails from "../features/lms/pages/hod/ResultDetails.jsx";
import ResultEdit from "../features/lms/pages/hod/ResultEdit.jsx";

// Faculty pages
import FacultyDashboard from "../features/lms/pages/faculty/FacultyDashboard.jsx";
import FacultyProfile from "../features/lms/pages/faculty/FacultyProfile.jsx";
import FacultyNotifications from "../features/lms/pages/faculty/FacultyNotifications.jsx";

export const applicationRoutes = [
  // Super Admin
  {
    id: "super-admin",
    path: "/super-admin",
    roles: ["SUPER_ADMIN"],
    element: <AppLayout />,
    children: [
      {
        id: "super-admin-dashboard",
        path: "dashboard",
        element: <SuperAdminDashboard />,
      },
      {
        id: "super-admin-profile",
        path: "profile",
        element: <SuperAdminProfile />,
      },
      {
        id: "super-admin-notifications",
        path: "notifications",
        element: <SuperAdminNotifications />,
      },
      {
        id: "super-admin-departments",
        path: "departments",
        element: <DepartmentList />,
      },
      {
        id: "super-admin-department-create",
        path: "departments/new",
        element: <CreateDepartment />,
      },
      {
        id: "super-admin-department-details",
        path: "departments/details",
        element: <DepartmentDetails />,
      },
      {
        id: "super-admin-hods",
        path: "hods",
        element: <HodList />,
      },
      {
        id: "super-admin-hod-create",
        path: "hods/new",
        element: <CreateHod />,
      },
      {
        id: "super-admin-hod-details",
        path: "hods/details",
        element: <HodDetails />,
      },
    ],
  },

  // Head of Department
  {
    id: "hod",
    path: "/hod",
    roles: ["HOD"],
    element: <AppLayout />,
    children: [
      {
        id: "hod-dashboard",
        path: "dashboard",
        element: <HodDashboard />,
      },

      // Faculty Management
      {
        id: "hod-faculty-list",
        path: "faculty",
        element: <FacultyList />,
      },
      {
        id: "hod-faculty-create",
        path: "faculty/new",
        element: <CreateFaculty />,
      },
      {
        id: "hod-faculty-details",
        path: "faculty/details",
        element: <FacultyDetails />,
      },
      {
        id: "hod-faculty-edit",
        path: "faculty/edit",
        element: <EditFaculty />,
      },

      // Mentor / TG Management
      {
        id: "hod-grant-mentor-role",
        path: "faculty/grant-mentor",
        element: <GrantMentorRole />,
      },
      {
        id: "hod-mentor-assignments",
        path: "mentors/assignments",
        element: <MentorAssignments />,
      },

      // Batch Management
      {
        id: "hod-batches",
        path: "batches",
        element: <BatchList />,
      },
      {
        id: "hod-batch-create",
        path: "batches/new",
        element: <CreateBatch />,
      },
      {
        id: "hod-batch-details",
        path: "batches/details",
        element: <BatchDetails />,
      },

      // Section Management
      {
        id: "hod-sections",
        path: "sections",
        element: <SectionList />,
      },
      {
        id: "hod-section-create",
        path: "sections/new",
        element: <CreateSection />,
      },
      {
        id: "hod-section-details",
        path: "sections/details",
        element: <SectionDetails />,
      },
      {
        id: "hod-section-edit",
        path: "sections/edit",
        element: <EditSection />,
      },

      // Timetable Management
      {
        id: "hod-timetable",
        path: "timetable",
        element: <TimetableOverview />,
      },
      {
        id: "hod-timetable-create",
        path: "timetable/new",
        element: <CreateTimetable />,
      },
      {
        id: "hod-timetable-edit",
        path: "timetable/edit",
        element: <EditTimetable />,
      },

      // Attendance
      {
        id: "hod-attendance",
        path: "attendance",
        element: <AttendanceOverview />,
      },
      {
        id: "hod-attendance-reports",
        path: "attendance/reports",
        element: <AttendanceReports />,
      },

      // Courses
      {
        id: "hod-courses",
        path: "courses",
        element: <CourseOverview />,
      },
      {
        id: "hod-course-details",
        path: "courses/details",
        element: <CourseDetails />,
      },
      {
        id: "hod-course-edit",
        path: "courses/edit",
        element: <EditCourse />,
      },

      // Assignments
      {
        id: "hod-assignments",
        path: "assignments",
        element: <AssignmentOverview />,
      },
      {
        id: "hod-assignment-details",
        path: "assignments/details",
        element: <AssignmentDetails />,
      },
      {
        id: "hod-assignment-edit",
        path: "assignments/edit",
        element: <EditAssignment />,
      },

      // Quizzes
      {
        id: "hod-quizzes",
        path: "quizzes",
        element: <QuizOverview />,
      },
      {
        id: "hod-quiz-details",
        path: "quizzes/details",
        element: <QuizDetails />,
      },
      {
        id: "hod-quiz-edit",
        path: "quizzes/edit",
        element: <QuizEdit />,
      },

      // Results
      {
        id: "hod-results",
        path: "results",
        element: <ResultOverview />,
      },
      {
        id: "hod-result-details",
        path: "results/details",
        element: <ResultDetails />,
      },
      {
        id: "hod-result-edit",
        path: "results/edit",
        element: <ResultEdit />,
      },
    ],
  },

  // Faculty
  {
    id: "faculty",
    path: "/faculty",
    roles: ["FACULTY"],
    element: <AppLayout />,
    children: [
      {
        id: "faculty-dashboard",
        path: "dashboard",
        element: <FacultyDashboard />,
      },
      {
        id: "faculty-profile",
        path: "profile",
        element: <FacultyProfile />,
      },
      {
        id: "faculty-notifications",
        path: "notifications",
        element: <FacultyNotifications />,
      },
    ],
  },
];