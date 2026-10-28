import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import useAuth from '../../../auth/context/useAuth.js';

import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import LoadingState from '../../components/LoadingState.jsx';

import studentProfileService from '../../services/studentProfileService.js';

const STUDENT_SECTIONS = [
  {
    title: 'My Timetable',
    description: 'View your class schedule and upcoming lectures.',
    path: '/student/timetable',
    icon: '◷',
    eyebrow: 'SCHEDULE',
  },
  {
    title: 'My Courses',
    description: 'Access your enrolled courses and learning materials.',
    path: '/student/courses',
    icon: '▤',
    eyebrow: 'LEARNING',
  },
  {
    title: 'My Attendance',
    description: 'Track your attendance records and subject-wise status.',
    path: '/student/attendance',
    icon: '✓',
    eyebrow: 'ACADEMICS',
  },
  {
    title: 'Assignments',
    description: 'Review assigned work, deadlines, and submissions.',
    path: '/student/assignments',
    icon: '▣',
    eyebrow: 'COURSEWORK',
  },
  {
    title: 'Quizzes',
    description: 'View available quizzes and your assessment activity.',
    path: '/student/quizzes',
    icon: '✎',
    eyebrow: 'ASSESSMENTS',
  },
  {
    title: 'My Results',
    description: 'Access published academic results when available.',
    path: '/student/results',
    icon: '↗',
    eyebrow: 'PERFORMANCE',
  },
];

const DASHBOARD_METRICS = [
  {
    label: 'Enrolled Courses',
    description: 'Your registered courses',
    icon: '▤',
    path: '/student/courses',
  },
  {
    label: 'Attendance',
    description: 'Your attendance overview',
    icon: '✓',
    path: '/student/attendance',
  },
  {
    label: 'Pending Assignments',
    description: 'Work awaiting submission',
    icon: '▣',
    path: '/student/assignments',
  },
  {
    label: 'Published Results',
    description: 'Your available results',
    icon: '↗',
    path: '/student/results',
  },
];

function getDisplayName(user, profile) {
  const profileName =
    typeof profile?.fullName === 'string'
      ? profile.fullName.trim()
      : '';

  const fullName =
    typeof user?.fullName === 'string'
      ? user.fullName.trim()
      : '';

  const name =
    typeof user?.name === 'string'
      ? user.name.trim()
      : '';

  return profileName || fullName || name || 'Student';
}

function getText(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not available';
  }

  return String(value);
}

function DashboardMetric({ metric }) {
  return (
    <Link
      to={metric.path}
      className={[
        'group min-w-0 rounded-2xl border border-[#343640]',
        'bg-[#1D1F27] p-5 transition-colors',
        'hover:border-[#CDB5F7]/40 hover:bg-[#22232D]',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[#CDB5F7]',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#CDB5F7]/15 bg-[#CDB5F7]/10 text-lg text-[#CDB5F7]">
          <span aria-hidden="true">{metric.icon}</span>
        </div>

        <span
          aria-hidden="true"
          className="text-sm text-[#858590] transition-colors group-hover:text-[#CDB5F7]"
        >
          ↗
        </span>
      </div>

      <p className="mt-5 text-sm text-[#A5A6B0]">
        {metric.label}
      </p>

      <p
        className="mt-2 text-3xl font-semibold tracking-tight text-[#EAEAE6]"
        aria-label={`${metric.label}: data unavailable`}
      >
        —
      </p>

      <p className="mt-2 text-xs leading-5 text-[#858590]">
        {metric.description}
      </p>
    </Link>
  );
}

function StudentQuickLink({ section }) {
  return (
    <Link
      to={section.path}
      className={[
        'group flex min-w-0 items-start gap-4 rounded-xl',
        'border border-[#343640] bg-[#191A21] p-4',
        'transition-colors hover:border-[#CDB5F7]/35',
        'hover:bg-[#22232D]',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[#CDB5F7]',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          'flex h-11 w-11 shrink-0 items-center justify-center',
          'rounded-xl border border-[#CDB5F7]/15',
          'bg-[#CDB5F7]/10 text-lg text-[#CDB5F7]',
        ].join(' ')}
      >
        {section.icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A5A6B0]">
          {section.eyebrow}
        </span>

        <span className="mt-1 block break-words text-sm font-semibold text-[#EAEAE6]">
          {section.title}
        </span>

        <span className="mt-1 block text-xs leading-5 text-[#858590]">
          {section.description}
        </span>
      </span>

      <span
        aria-hidden="true"
        className="mt-1 shrink-0 text-[#858590] transition-colors group-hover:text-[#CDB5F7]"
      >
        →
      </span>
    </Link>
  );
}

function StudentAcademicSummary({ profile }) {
  const batches = Array.isArray(profile?.batches)
    ? profile.batches
    : [];

  const sections = Array.isArray(profile?.sections)
    ? profile.sections
    : [];

  const batchNames = batches.length
    ? batches.map((batch) => batch.name || batch.code).filter(Boolean).join(', ')
    : 'Not assigned';

  const sectionNames = sections.length
    ? sections
        .map((section) => section.name || section.code)
        .filter(Boolean)
        .join(', ')
    : 'Not assigned';

  return (
    <SectionCard
      eyebrow="YOUR ACCOUNT"
      title="Academic Placement"
      description="Your current institutional and academic assignment details."
      action={
        <Link
          to="/student/profile"
          className={[
            'inline-flex min-h-9 items-center justify-center',
            'rounded-lg border border-[#454650] px-3 py-2',
            'text-xs font-semibold text-[#CDB5F7]',
            'transition-colors hover:border-[#CDB5F7]',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[#CDB5F7]',
          ].join(' ')}
        >
          View profile
        </Link>
      }
    >
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-[#343640] bg-[#191A21] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#858590]">
            Student ID
          </p>

          <p className="mt-2 break-words text-sm font-semibold text-[#EAEAE6]">
            {getText(profile?.institutionalId)}
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-[#343640] bg-[#191A21] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#858590]">
            Department
          </p>

          <p className="mt-2 break-words text-sm font-semibold text-[#EAEAE6]">
            {getText(profile?.department?.name)}
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-[#343640] bg-[#191A21] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#858590]">
            Assigned Batches
          </p>

          <p className="mt-2 break-words text-sm font-semibold text-[#EAEAE6]">
            {batchNames}
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-[#343640] bg-[#191A21] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#858590]">
            Assigned Sections
          </p>

          <p className="mt-2 break-words text-sm font-semibold text-[#EAEAE6]">
            {sectionNames}
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setProfileLoading(true);
      setProfileError('');

      try {
        const result = await studentProfileService.getMyProfile();

        if (isMounted) {
          setProfile(result);
        }
      } catch (error) {
        if (isMounted) {
          setProfileError(
            error?.message ||
              'Student profile information is temporarily unavailable.',
          );
        }
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayName = getDisplayName(user, profile);

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="STUDENT WORKSPACE"
        title={`Welcome, ${displayName}`}
        description="Your academic workspace for classes, coursework, attendance, assessments, and results."
        breadcrumbs={[
          {
            label: 'Dashboard',
          },
        ]}
      />

      <section
        aria-label="Academic overview"
        className="mb-6 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {DASHBOARD_METRICS.map((metric) => (
          <DashboardMetric
            key={metric.label}
            metric={metric}
          />
        ))}
      </section>

      {profileLoading && (
        <div className="mb-6">
          <LoadingState
            message="Loading your academic placement"
            rows={2}
          />
        </div>
      )}

      {!profileLoading && profile && (
        <div className="mb-6">
          <StudentAcademicSummary profile={profile} />
        </div>
      )}

      {!profileLoading && profileError && !profile && (
        <div
          role="status"
          className="mb-6 rounded-xl border border-[#343640] bg-[#1D1F27] p-4"
        >
          <p className="text-sm text-[#A5A6B0]">
            Academic placement information is unavailable right now.
          </p>

          <p className="mt-1 text-xs text-[#858590]">
            {profileError}
          </p>

          <Link
            to="/student/profile"
            className="mt-3 inline-flex text-sm font-semibold text-[#CDB5F7] hover:underline"
          >
            Open My Profile
          </Link>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[1.35fr_1fr]">
        <SectionCard
          eyebrow="YOUR LEARNING"
          title="Academic Activities"
          description="Navigate to the academic areas available in your student workspace."
          variant="default"
        >
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            {STUDENT_SECTIONS.map((section) => (
              <StudentQuickLink
                key={section.path}
                section={section}
              />
            ))}
          </div>
        </SectionCard>

        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard
            eyebrow="STAY ORGANIZED"
            title="Upcoming Activities"
            description="Keep track of your schedule and academic commitments."
          >
            <EmptyState
              title="No upcoming activities available"
              description="Your upcoming classes, assignment deadlines, and assessments will appear here when the relevant academic data is connected."
              icon={
                <span aria-hidden="true" className="text-2xl">
                  ◷
                </span>
              }
              action={
                <Link
                  to="/student/timetable"
                  className={[
                    'inline-flex min-h-10 items-center justify-center',
                    'rounded-xl border border-[#454650] px-4 py-2',
                    'text-sm font-semibold text-[#CDB5F7]',
                    'transition-colors hover:border-[#CDB5F7]',
                    'hover:bg-[#CDB5F7]/10',
                    'focus-visible:outline-none focus-visible:ring-2',
                    'focus-visible:ring-[#CDB5F7]',
                  ].join(' ')}
                >
                  Open timetable
                </Link>
              }
            />
          </SectionCard>

          <SectionCard
            eyebrow="ACADEMIC RECORD"
            title="My Academic Progress"
            description="Your academic progress will be summarized here."
          >
            <EmptyState
              title="Progress data not available"
              description="Attendance percentages, assessment performance, and academic progress will be displayed once actual student records are available."
              icon={
                <span aria-hidden="true" className="text-2xl">
                  ↗
                </span>
              }
              action={
                <Link
                  to="/student/attendance"
                  className={[
                    'inline-flex min-h-10 items-center justify-center',
                    'rounded-xl border border-[#454650] px-4 py-2',
                    'text-sm font-semibold text-[#CDB5F7]',
                    'transition-colors hover:border-[#CDB5F7]',
                    'hover:bg-[#CDB5F7]/10',
                    'focus-visible:outline-none focus-visible:ring-2',
                    'focus-visible:ring-[#CDB5F7]',
                  ].join(' ')}
                >
                  View attendance
                </Link>
              }
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}