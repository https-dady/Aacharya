import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import studentAttendanceService from '../../services/studentAttendanceService.js';

const ATTENDANCE_FILTERS = [
  { value: 'all', label: 'All Records' },
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
];

// Reference threshold only; institutional policy may differ.
const ATTENDANCE_THRESHOLD = 75;

function formatDate(dateValue) {
  if (!dateValue) return '—';

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase();

  if (value === 'present') return 'present';
  if (value === 'absent') return 'absent';
  if (value === 'late') return 'late';

  return 'unknown';
}

function StatusBadge({ status }) {
  const normalizedStatus = normalizeStatus(status);

  const styles = {
    present: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    absent: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
    late: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    unknown: 'border-[#454650] bg-[#252630] text-[#A5A6B0]',
  };

  const labels = {
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    unknown: 'Unknown',
  };

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1',
        'text-xs font-medium',
        styles[normalizedStatus],
      ].join(' ')}
    >
      {labels[normalizedStatus]}
    </span>
  );
}

function calculateSubjectAttendance(records) {
  const attended = records.filter(
    (record) => normalizeStatus(record.status) === 'present',
  ).length;

  const total = records.filter((record) =>
    ['present', 'absent', 'late'].includes(
      normalizeStatus(record.status),
    ),
  ).length;

  if (total === 0) return null;

  return {
    attended,
    total,
    percentage: Math.round((attended / total) * 100),
  };
}

function SubjectAttendanceCard({ subject }) {
  const percentage = subject.attendance.percentage;
  const isBelowThreshold = percentage < ATTENDANCE_THRESHOLD;

  return (
    <article className="rounded-2xl border border-[#343640] bg-[#191A21] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#858590]">
            {subject.subjectCode || 'Subject'}
          </p>

          <h3 className="mt-2 break-words text-base font-semibold text-[#EAEAE6]">
            {subject.subjectName}
          </h3>

          <p className="mt-1 text-sm text-[#A5A6B0]">
            {subject.facultyName || 'Faculty information unavailable'}
          </p>
        </div>

        {isBelowThreshold && (
          <span className="shrink-0 rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-xs font-medium text-rose-300">
            Shortage
          </span>
        )}
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-[#858590]">Attendance</p>

          <p
            className={[
              'mt-1 text-3xl font-semibold tracking-tight',
              isBelowThreshold ? 'text-rose-300' : 'text-[#EAEAE6]',
            ].join(' ')}
          >
            {percentage}%
          </p>
        </div>

        <p className="text-right text-xs leading-5 text-[#A5A6B0]">
          {subject.attendance.attended} of {subject.attendance.total}
          <br />
          recorded classes
        </p>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-[#30313A]"
        role="progressbar"
        aria-label={`${subject.subjectName} attendance`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
      >
        <div
          className={[
            'h-full rounded-full transition-all',
            isBelowThreshold ? 'bg-rose-400' : 'bg-[#CDB5F7]',
          ].join(' ')}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {isBelowThreshold && (
        <p className="mt-3 text-xs leading-5 text-rose-300">
          Attendance is below the {ATTENDANCE_THRESHOLD}% reference
          threshold. Check your institution's attendance policy.
        </p>
      )}
    </article>
  );
}

function AttendanceLoading() {
  return (
    <div
      className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-8 text-center"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm text-[#A5A6B0]">
        Loading your attendance records...
      </p>
    </div>
  );
}

export default function StudentAttendance() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [requestStatus, setRequestStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const loadAttendance = useCallback(async () => {
    setRequestStatus('loading');
    setErrorMessage('');

    try {
      const records = await studentAttendanceService.getMyAttendance();

      setAttendanceRecords(records);
      setRequestStatus('success');
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          'Unable to load attendance. Please try again.',
      );
      setRequestStatus('error');
    }
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return attendanceRecords
      .filter((record) => {
        const matchesStatus =
          selectedStatus === 'all' ||
          normalizeStatus(record.status) === selectedStatus;

        const matchesSearch =
          !query ||
          [
            record.subjectName,
            record.subjectCode,
            record.facultyName,
          ].some((value) =>
            String(value || '').toLowerCase().includes(query),
          );

        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();

        return dateB - dateA;
      });
  }, [attendanceRecords, selectedStatus, searchQuery]);

  const subjectSummaries = useMemo(() => {
    const subjects = new Map();

    attendanceRecords.forEach((record) => {
      const key =
        record.subjectCode ||
        record.subjectName ||
        record.id;

      if (!key) return;

      if (!subjects.has(key)) {
        subjects.set(key, {
          subjectCode: record.subjectCode || '',
          subjectName: record.subjectName || 'Unnamed subject',
          facultyName: record.facultyName || '',
          records: [],
        });
      }

      const subject = subjects.get(key);

      subject.records.push(record);

      if (!subject.facultyName && record.facultyName) {
        subject.facultyName = record.facultyName;
      }
    });

    return Array.from(subjects.values())
      .map((subject) => ({
        ...subject,
        attendance: calculateSubjectAttendance(subject.records),
      }))
      .filter((subject) => subject.attendance !== null);
  }, [attendanceRecords]);

  const validRecords = useMemo(
    () =>
      attendanceRecords.filter((record) =>
        ['present', 'absent', 'late'].includes(
          normalizeStatus(record.status),
        ),
      ),
    [attendanceRecords],
  );

  const presentCount = validRecords.filter(
    (record) => normalizeStatus(record.status) === 'present',
  ).length;

  const absentCount = validRecords.filter(
    (record) => normalizeStatus(record.status) === 'absent',
  ).length;

  const overallAttendance =
    validRecords.length > 0
      ? Math.round((presentCount / validRecords.length) * 100)
      : null;

  const hasActiveFilters =
    selectedStatus !== 'all' || searchQuery.trim() !== '';

  const hasShortage = subjectSummaries.some(
    (subject) =>
      subject.attendance.percentage < ATTENDANCE_THRESHOLD,
  );

  function resetFilters() {
    setSelectedStatus('all');
    setSearchQuery('');
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="STUDENT WORKSPACE"
        title="My Attendance"
        description="Review your attendance records, subject-wise percentages, and attendance warnings."
        breadcrumbs={[
          { label: 'Dashboard', to: '/student/dashboard' },
          { label: 'Attendance' },
        ]}
        actions={
          <button
            type="button"
            onClick={loadAttendance}
            disabled={requestStatus === 'loading'}
            className={[
              'inline-flex min-h-10 items-center justify-center',
              'rounded-xl border border-[#454650] px-4 py-2',
              'text-sm font-semibold text-[#CDB5F7]',
              'transition-colors hover:border-[#CDB5F7]',
              'disabled:cursor-not-allowed disabled:opacity-50',
            ].join(' ')}
          >
            {requestStatus === 'loading' ? 'Refreshing...' : 'Refresh'}
          </button>
        }
      />

      {requestStatus === 'loading' && <AttendanceLoading />}

      {requestStatus === 'error' && (
        <div
          className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/5 p-6"
          role="alert"
        >
          <h2 className="font-semibold text-[#EAEAE6]">
            Could not load attendance
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={loadAttendance}
            className="mt-4 min-h-10 rounded-xl border border-[#454650] px-4 py-2 text-sm font-semibold text-[#CDB5F7] hover:border-[#CDB5F7]"
          >
            Try Again
          </button>
        </div>
      )}

      {requestStatus === 'success' && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
              <p className="text-sm text-[#A5A6B0]">
                Overall Attendance
              </p>

              <p className="mt-3 text-3xl font-semibold text-[#EAEAE6]">
                {overallAttendance === null
                  ? '—'
                  : `${overallAttendance}%`}
              </p>

              <p className="mt-2 text-xs text-[#858590]">
                Based on recorded attendance
              </p>
            </div>

            <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
              <p className="text-sm text-[#A5A6B0]">Present Classes</p>

              <p className="mt-3 text-3xl font-semibold text-emerald-300">
                {validRecords.length ? presentCount : '—'}
              </p>

              <p className="mt-2 text-xs text-[#858590]">
                Recorded as present
              </p>
            </div>

            <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
              <p className="text-sm text-[#A5A6B0]">Absent Classes</p>

              <p className="mt-3 text-3xl font-semibold text-rose-300">
                {validRecords.length ? absentCount : '—'}
              </p>

              <p className="mt-2 text-xs text-[#858590]">
                Recorded as absent
              </p>
            </div>

            <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
              <p className="text-sm text-[#A5A6B0]">Subjects Tracked</p>

              <p className="mt-3 text-3xl font-semibold text-[#EAEAE6]">
                {subjectSummaries.length || '—'}
              </p>

              <p className="mt-2 text-xs text-[#858590]">
                Subjects with attendance records
              </p>
            </div>
          </div>

          {hasShortage && (
            <div
              role="status"
              className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/5 p-4"
            >
              <span
                className="text-lg text-rose-300"
                aria-hidden="true"
              >
                !
              </span>

              <div>
                <h2 className="text-sm font-semibold text-rose-200">
                  Attendance shortage detected
                </h2>

                <p className="mt-1 text-sm leading-6 text-[#D1A8AD]">
                  One or more subjects are below the{' '}
                  {ATTENDANCE_THRESHOLD}% reference threshold. Review
                  the affected subjects and follow your institution's
                  attendance policy.
                </p>
              </div>
            </div>
          )}

          <SectionCard
            eyebrow="SUBJECT BREAKDOWN"
            title="Subject-wise Attendance"
            description="Review attendance percentages calculated from recorded class entries."
          >
            {subjectSummaries.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {subjectSummaries.map((subject) => (
                  <SubjectAttendanceCard
                    key={
                      subject.subjectCode ||
                      subject.subjectName
                    }
                    subject={subject}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No subject attendance available"
                description="Subject-wise percentages will appear when attendance records are available."
                icon={
                  <span aria-hidden="true" className="text-2xl">
                    ✓
                  </span>
                }
              />
            )}
          </SectionCard>

          <section
            className="mt-6"
            aria-labelledby="attendance-history-heading"
          >
            <SectionCard
              eyebrow="ATTENDANCE LOG"
              title="Attendance History"
              description="Search and filter your recorded class attendance."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                <div className="min-w-0">
                  <label
                    htmlFor="attendance-search"
                    className="mb-2 block text-sm font-medium text-[#D1D1D8]"
                  >
                    Search subject
                  </label>

                  <input
                    id="attendance-search"
                    type="search"
                    value={searchQuery}
                    onChange={(event) =>
                      setSearchQuery(event.target.value)
                    }
                    placeholder="Subject, code, or faculty..."
                    className={[
                      'min-h-11 w-full rounded-xl border border-[#454650]',
                      'bg-[#191A21] px-4 py-2.5 text-sm text-[#EAEAE6]',
                      'placeholder:text-[#777884]',
                      'focus:border-[#CDB5F7] focus:outline-none',
                      'focus:ring-2 focus:ring-[#CDB5F7]/20',
                    ].join(' ')}
                  />
                </div>

                <div className="min-w-0">
                  <label
                    htmlFor="attendance-status"
                    className="mb-2 block text-sm font-medium text-[#D1D1D8]"
                  >
                    Attendance status
                  </label>

                  <select
                    id="attendance-status"
                    value={selectedStatus}
                    onChange={(event) =>
                      setSelectedStatus(event.target.value)
                    }
                    className={[
                      'min-h-11 w-full rounded-xl border border-[#454650]',
                      'bg-[#191A21] px-3 py-2.5 text-sm text-[#EAEAE6]',
                      'focus:border-[#CDB5F7] focus:outline-none',
                      'focus:ring-2 focus:ring-[#CDB5F7]/20',
                    ].join(' ')}
                  >
                    {ATTENDANCE_FILTERS.map((filter) => (
                      <option
                        key={filter.value}
                        value={filter.value}
                      >
                        {filter.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={resetFilters}
                    disabled={!hasActiveFilters}
                    className={[
                      'min-h-11 w-full rounded-xl border px-4 py-2.5',
                      'text-sm font-semibold transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2',
                      'focus-visible:ring-[#CDB5F7]',
                      hasActiveFilters
                        ? 'border-[#454650] text-[#D1D1D8] hover:border-[#CDB5F7]'
                        : 'cursor-not-allowed border-[#343640] text-[#666772]',
                    ].join(' ')}
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto rounded-xl border border-[#343640]">
                <table className="w-full min-w-[680px] border-collapse text-left">
                  <thead className="bg-[#191A21]">
                    <tr>
                      {['Subject', 'Date', 'Faculty', 'Status'].map(
                        (heading) => (
                          <th
                            key={heading}
                            scope="col"
                            className="border-b border-[#343640] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#858590]"
                          >
                            {heading}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#343640]">
                    {filteredRecords.map((record) => (
                      <tr
                        key={record.id}
                        className="transition-colors hover:bg-[#22232D]"
                      >
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-[#EAEAE6]">
                            {record.subjectName || 'Unnamed subject'}
                          </p>

                          {record.subjectCode && (
                            <p className="mt-1 text-xs text-[#858590]">
                              {record.subjectCode}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm text-[#A5A6B0]">
                          {formatDate(record.date)}
                        </td>

                        <td className="px-4 py-4 text-sm text-[#A5A6B0]">
                          {record.facultyName || '—'}
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={record.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredRecords.length === 0 && (
                  <div className="p-5">
                    <EmptyState
                      title={
                        hasActiveFilters
                          ? 'No matching attendance records'
                          : 'No attendance history available'
                      }
                      description={
                        hasActiveFilters
                          ? 'Try changing your search or status filter.'
                          : 'Your recorded attendance history will appear here when data is available.'
                      }
                      icon={
                        <span
                          aria-hidden="true"
                          className="text-2xl"
                        >
                          ▤
                        </span>
                      }
                      action={
                        hasActiveFilters ? (
                          <button
                            type="button"
                            onClick={resetFilters}
                            className="rounded-xl border border-[#454650] px-4 py-2 text-sm font-semibold text-[#CDB5F7] hover:border-[#CDB5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                          >
                            Clear filters
                          </button>
                        ) : null
                      }
                    />
                  </div>
                )}
              </div>

              <p className="mt-3 text-xs text-[#858590]">
                Showing {filteredRecords.length} of{' '}
                {attendanceRecords.length} records.
              </p>
            </SectionCard>
          </section>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
            <div>
              <h3 className="text-sm font-semibold text-[#EAEAE6]">
                Need your course information?
              </h3>

              <p className="mt-1 text-sm text-[#A5A6B0]">
                Visit your enrolled courses to review your subjects.
              </p>
            </div>

            <Link
              to="/student/courses"
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
              My Courses
              <span className="ml-2" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}