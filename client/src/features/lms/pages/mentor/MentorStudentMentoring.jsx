import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import mentorAssignedStudentsService from '../../services/mentorAssignedStudentsService.js';
import mentorAttendanceService from '../../services/mentorAttendanceService.js';

function MetricCard({ title, value, description }) {
  return (
    <article className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
      <p className="text-sm text-[#A5A6B0]">{title}</p>

      <p className="mt-3 text-3xl font-semibold text-[#EAEAE6]">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-[#858590]">
        {description}
      </p>
    </article>
  );
}

function ActionLink({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#3B3C43] bg-[#26272B] px-4 py-2 text-sm font-semibold text-[#EAEAE6] transition hover:border-[#CDB5F7]/40 hover:bg-[#303139] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
    >
      {children}
    </Link>
  );
}

function AttendanceStatus({ percentage }) {
  if (percentage === null || percentage === undefined) {
    return (
      <span className="text-xs text-[#858590]">
        No attendance records
      </span>
    );
  }

  const safePercentage = Math.max(0, Math.min(100, percentage));

  return (
    <div className="min-w-[130px] space-y-2">
      <div className="flex justify-between text-xs">
        <span className="font-semibold text-[#EAEAE6]">
          {percentage.toFixed(2)}%
        </span>

        <span className="text-[#858590]">100%</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[#343640]">
        <div
          className={[
            'h-full rounded-full',
            percentage < 75 ? 'bg-rose-400' : 'bg-emerald-400',
          ].join(' ')}
          style={{ width: `${safePercentage}%` }}
        />
      </div>
    </div>
  );
}

export default function MentorStudentMentoring() {
  const [studentSummary, setStudentSummary] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    disabled: 0,
  });

  const [attendance, setAttendance] = useState(null);
  const [atRiskStudents, setAtRiskStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadMentoringOverview() {
      setLoading(true);
      setError('');

      try {
        const [studentResult, attendanceResult] = await Promise.all([
          mentorAssignedStudentsService.getStudents({
            page: 1,
            limit: 1,
            signal: controller.signal,
          }),

          mentorAttendanceService.getOverview(
            {},
            { signal: controller.signal },
          ),
        ]);

        if (controller.signal.aborted) return;

        setStudentSummary(studentResult.summary);
        setAttendance(attendanceResult.attendance);
        setAtRiskStudents(attendanceResult.atRiskStudents);
      } catch (err) {
        if (
          controller.signal.aborted ||
          err.name === 'CanceledError' ||
          err.name === 'AbortError'
        ) {
          return;
        }

        setError(
          err.response?.data?.error?.message ||
          err.message ||
          'Unable to load mentoring overview.',
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadMentoringOverview();

    return () => controller.abort();
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow="MENTOR WORKSPACE"
        title="Student Mentoring"
        description="Review assigned students and identify attendance-related follow-up requirements."
        breadcrumbs={[
          { label: 'Mentor', to: '/mentor/dashboard' },
          { label: 'Student Mentoring' },
        ]}
        actions={
          <ActionLink to="/mentor/students">
            Assigned Students
          </ActionLink>
        }
      />

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      <section
        aria-label="Mentoring summary"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          title="Assigned Students"
          value={loading ? '—' : studentSummary.total}
          description="Students within your authorized mentoring scope."
        />

        <MetricCard
          title="Active Students"
          value={loading ? '—' : studentSummary.active}
          description="Active student accounts."
        />

        <MetricCard
          title="Average Attendance"
          value={
            loading
              ? '—'
              : attendance?.averagePercentage === null
                ? 'N/A'
                : `${attendance?.averagePercentage ?? 0}%`
          }
          description="Calculated from available attendance records."
        />

        <MetricCard
          title="Students Below Threshold"
          value={
            loading
              ? '—'
              : attendance?.belowThresholdCount ?? 0
          }
          description={`Attendance below ${attendance?.threshold ?? 75}%.`}
        />
      </section>

      <SectionCard
        eyebrow="STUDENT FOLLOW-UP"
        title="Students requiring attention"
        description="Students identified from actual attendance records."
      >
        {loading ? (
          <div className="py-10 text-center text-sm text-[#A5A6B0]">
            Loading mentoring records...
          </div>
        ) : atRiskStudents.length === 0 ? (
          <EmptyState
            title="No attendance follow-up required"
            description="No students currently fall below the configured attendance threshold in the available records."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="border-b border-[#343640] text-xs uppercase tracking-wide text-[#858590]">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Institutional ID</th>
                  <th className="px-4 py-3">Attendance</th>
                  <th className="px-4 py-3">Present</th>
                  <th className="px-4 py-3">Absent</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#343640]">
                {atRiskStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="transition hover:bg-[#26272B]/60"
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium text-[#EAEAE6]">
                        {student.fullName}
                      </p>

                      <p className="mt-1 text-xs text-[#858590]">
                        {student.email || 'Email unavailable'}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-[#B8B8C2]">
                      {student.institutionalId || '—'}
                    </td>

                    <td className="px-4 py-4">
                      <AttendanceStatus
                        percentage={student.percentage}
                      />
                    </td>

                    <td className="px-4 py-4 text-emerald-300">
                      {student.present}
                    </td>

                    <td className="px-4 py-4 text-rose-300">
                      {student.absent}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3 border-t border-[#343640] pt-5">
          <ActionLink to="/mentor/attendance">
            Open Attendance Overview
          </ActionLink>

          <ActionLink to="/mentor/students">
            Open Student Directory
          </ActionLink>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard
          title="Attendance follow-up"
          description="Use verified attendance information to identify students who may need academic guidance."
        >
          <div className="space-y-3">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-[#A5A6B0]">Total attendance records</span>
              <span className="font-semibold text-[#EAEAE6]">
                {loading ? '—' : attendance?.totalRecords ?? 0}
              </span>
            </div>

            <div className="flex justify-between gap-4 text-sm">
              <span className="text-[#A5A6B0]">Present</span>
              <span className="font-semibold text-emerald-300">
                {loading ? '—' : attendance?.present ?? 0}
              </span>
            </div>

            <div className="flex justify-between gap-4 text-sm">
              <span className="text-[#A5A6B0]">Absent</span>
              <span className="font-semibold text-rose-300">
                {loading ? '—' : attendance?.absent ?? 0}
              </span>
            </div>

            <div className="flex justify-between gap-4 text-sm">
              <span className="text-[#A5A6B0]">Late</span>
              <span className="font-semibold text-amber-300">
                {loading ? '—' : attendance?.late ?? 0}
              </span>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Academic performance"
          description="Academic results and assignment progress."
        >
          <p className="text-sm leading-6 text-[#A5A6B0]">
            The current Mentor backend does not provide a verified
            consolidated academic-performance response. Results and
            assignment progress are therefore not displayed as fabricated
            values.
          </p>

          <div className="mt-4">
            <ActionLink to="/mentor/students">
              Browse Student Records
            </ActionLink>
          </div>
        </SectionCard>
      </div>

      <div className="rounded-2xl border border-[#CDB5F7]/15 bg-[#CDB5F7]/[0.04] p-5">
        <h2 className="text-sm font-semibold text-[#CDB5F7]">
          Mentoring access policy
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#B8B8C2]">
          Student records and attendance are retrieved through the
          authenticated Mentor APIs. The backend remains responsible
          for validating section ownership and student access.
        </p>
      </div>
    </div>
  );
}