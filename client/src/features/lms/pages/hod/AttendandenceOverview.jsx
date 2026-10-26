import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const ATTENDANCE_THRESHOLD = 75;

export default function AttendanceOverview() {
  const [searchTerm, setSearchTerm] = useState('');

  // Actual attendance records will be connected during backend integration.
  const attendanceRecords = [];

  const summary = useMemo(() => {
    if (attendanceRecords.length === 0) {
      return {
        totalStudents: null,
        averageAttendance: null,
        lowAttendanceCount: null,
      };
    }

    const totalStudents = attendanceRecords.length;

    const averageAttendance =
      attendanceRecords.reduce(
        (total, record) => total + Number(record.attendancePercentage || 0),
        0,
      ) / totalStudents;

    const lowAttendanceCount = attendanceRecords.filter(
      (record) =>
        Number(record.attendancePercentage) < ATTENDANCE_THRESHOLD,
    ).length;

    return {
      totalStudents,
      averageAttendance,
      lowAttendanceCount,
    };
  }, [attendanceRecords]);

  const filteredRecords = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return attendanceRecords;
    }

    return attendanceRecords.filter((record) =>
      [
        record.studentName,
        record.studentId,
        record.batchName,
        record.sectionName,
        record.courseName,
      ].some((value) =>
        String(value || '').toLowerCase().includes(query),
      ),
    );
  }, [searchTerm, attendanceRecords]);

  function formatPercentage(value) {
    const percentage = Number(value);

    return Number.isFinite(percentage)
      ? `${percentage.toFixed(1)}%`
      : '—';
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="ACADEMIC OVERSIGHT"
        title="Attendance Overview"
        description="Monitor attendance across department sections and identify students who may need academic support."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Attendance Overview' },
        ]}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link to="/hod/sections">
              <ActionButton variant="secondary">
                View Sections
              </ActionButton>
            </Link>

            <Link to="/hod/attendance/reports">
              <ActionButton>
                Attendance Reports
              </ActionButton>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Students Tracked
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            {summary.totalStudents ?? '—'}
          </p>

          <p className="mt-2 text-xs text-[#777986]">
            {summary.totalStudents === null
              ? 'Awaiting attendance records'
              : 'Students with attendance records'}
          </p>
        </div>

        <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Average Attendance
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            {summary.averageAttendance === null
              ? '—'
              : formatPercentage(summary.averageAttendance)}
          </p>

          <p className="mt-2 text-xs text-[#777986]">
            Calculated from available student records
          </p>
        </div>

        <div className="rounded-xl border border-red-500/20 bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Below Attendance Threshold
          </p>

          <p className="mt-3 text-2xl font-semibold text-red-300">
            {summary.lowAttendanceCount ?? '—'}
          </p>

          <p className="mt-2 text-xs text-[#777986]">
            Students below {ATTENDANCE_THRESHOLD}% attendance
          </p>
        </div>
      </div>

      <div className="mt-6">
        <SectionCard
          eyebrow="ATTENDANCE MONITORING"
          title="Student Attendance Records"
          description={`Review individual attendance and flag records below ${ATTENDANCE_THRESHOLD}%.`}
        >
          <div className="mb-5 max-w-md">
            <SearchInput
              name="attendanceSearch"
              label="Search attendance records"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search student, batch, section, or course..."
            />
          </div>

          {filteredRecords.length === 0 ? (
            <EmptyState
              title={
                searchTerm.trim()
                  ? 'No matching attendance records'
                  : 'Attendance records unavailable'
              }
              description={
                searchTerm.trim()
                  ? 'Try another search term.'
                  : 'Student attendance data will appear here after actual records are connected.'
              }
              action={
                searchTerm.trim() ? (
                  <ActionButton
                    variant="secondary"
                    onClick={() => setSearchTerm('')}
                  >
                    Clear Search
                  </ActionButton>
                ) : (
                  <Link to="/hod/attendance/reports">
                    <ActionButton variant="secondary">
                      View Attendance Reports
                    </ActionButton>
                  </Link>
                )
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Student ID</th>
                    <th className="px-4 py-3 font-medium">Batch</th>
                    <th className="px-4 py-3 font-medium">Section</th>
                    <th className="px-4 py-3 font-medium">Attendance</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {filteredRecords.map((record, index) => {
                    const percentage = Number(
                      record.attendancePercentage,
                    );

                    const isBelowThreshold =
                      Number.isFinite(percentage) &&
                      percentage < ATTENDANCE_THRESHOLD;

                    return (
                      <tr
                        key={record.id || record._id || index}
                        className="bg-[#191A21] hover:bg-[#202129]"
                      >
                        <td className="px-4 py-4 font-medium text-[#EAEAE6]">
                          {record.studentName || '—'}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {record.studentId || '—'}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {record.batchName || '—'}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {record.sectionName || '—'}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {formatPercentage(record.attendancePercentage)}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                              isBelowThreshold
                                ? 'border-red-500/30 bg-red-500/10 text-red-300'
                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            }`}
                          >
                            {isBelowThreshold
                              ? 'Below 75%'
                              : 'At or Above 75%'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-sm font-medium text-amber-200">
          Attendance threshold: {ATTENDANCE_THRESHOLD}%
        </p>

        <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
          Records below this threshold are marked for review. Actual
          attendance calculations, authorized student data, report
          generation, and persistence will be connected during backend
          integration.
        </p>
      </div>
    </div>
  );
}