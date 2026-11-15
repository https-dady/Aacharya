import { useCallback, useEffect, useMemo, useState } from 'react';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import facultyCourseService from '../../services/facultyCourseService.js';
import facultyAttendanceService from '../../services/facultyAttendanceService.js';
import facultyAttendanceRosterService from '../../services/facultyAttendanceRosterService.js';

const ATTENDANCE_STATUSES = [
  'PRESENT',
  'ABSENT',
  'LATE',
];

function getTodayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function getStudentStatusClass(status) {
  if (status === 'PRESENT') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (status === 'ABSENT') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }

  if (status === 'LATE') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  }

  return 'border-[#454650] bg-[#26272B] text-[#B8B8C2]';
}

function normalizeDate(value) {
  if (!value) {
    return '';
  }

  return String(value).slice(0, 10);
}

export default function FacultyAttendance({
  workspace = 'faculty',
}) {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');

  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  const [attendanceStatuses, setAttendanceStatuses] = useState({});
  const [remarks, setRemarks] = useState({});

  const [sessionDate, setSessionDate] = useState(getTodayDate());
  const [sessionKey, setSessionKey] = useState('');

  const [recordFilters, setRecordFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
  });

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [courseError, setCourseError] = useState('');
  const [rosterError, setRosterError] = useState('');
  const [recordsError, setRecordsError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedCourse = useMemo(
    () => courses.find(
      (course) => course.id === selectedCourseId,
    ) || null,
    [courses, selectedCourseId],
  );

  const statusSummary = useMemo(() => {
    const values = Object.values(attendanceStatuses);

    return {
      total: students.length,
      present: values.filter((status) => status === 'PRESENT').length,
      absent: values.filter((status) => status === 'ABSENT').length,
      late: values.filter((status) => status === 'LATE').length,
      unmarked: students.length - values.length,
    };
  }, [students, attendanceStatuses]);

  const recordSummary = useMemo(() => ({
    total: attendanceRecords.length,
    present: attendanceRecords.filter(
      (record) => record.status === 'PRESENT',
    ).length,
    absent: attendanceRecords.filter(
      (record) => record.status === 'ABSENT',
    ).length,
    late: attendanceRecords.filter(
      (record) => record.status === 'LATE',
    ).length,
  }), [attendanceRecords]);

  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);
    setCourseError('');

    try {
      const result = await facultyCourseService.listAssignedCourses();
      const items = Array.isArray(result?.items)
        ? result.items
        : Array.isArray(result?.courses)
          ? result.courses
          : [];

      setCourses(items);

      setSelectedCourseId((current) => {
        if (current && items.some((course) => course.id === current)) {
          return current;
        }

        return items[0]?.id || '';
      });
    } catch (error) {
      setCourseError(
        getErrorMessage(error, 'Unable to load assigned courses.'),
      );
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  const loadRoster = useCallback(async () => {
    if (!selectedCourseId) {
      setStudents([]);
      setAttendanceStatuses({});
      setRemarks({});
      return;
    }

    setLoadingRoster(true);
    setRosterError('');

    try {
      const result =
        await facultyAttendanceRosterService.listStudents(
          selectedCourseId,
        );

      const roster = Array.isArray(result?.items)
        ? result.items
        : [];

      setStudents(roster);

      setAttendanceStatuses((current) => {
        const next = {};

        roster.forEach((student) => {
          next[student.id] = current[student.id] || 'PRESENT';
        });

        return next;
      });

      setRemarks((current) => {
        const next = {};

        roster.forEach((student) => {
          next[student.id] = current[student.id] || '';
        });

        return next;
      });
    } catch (error) {
      setStudents([]);
      setAttendanceStatuses({});
      setRemarks({});

      setRosterError(
        getErrorMessage(error, 'Unable to load the course student roster.'),
      );
    } finally {
      setLoadingRoster(false);
    }
  }, [selectedCourseId]);

  const loadAttendanceRecords = useCallback(async () => {
    if (!selectedCourseId) {
      setAttendanceRecords([]);
      return;
    }

    setLoadingRecords(true);
    setRecordsError('');

    try {
      const filters = {};

      if (recordFilters.startDate) {
        filters.startDate = recordFilters.startDate;
      }

      if (recordFilters.endDate) {
        filters.endDate = recordFilters.endDate;
      }

      if (recordFilters.status) {
        filters.status = recordFilters.status;
      }

      const result =
        await facultyAttendanceService.listAttendance(
          selectedCourseId,
          filters,
        );

      setAttendanceRecords(
        Array.isArray(result?.items) ? result.items : [],
      );
    } catch (error) {
      setAttendanceRecords([]);

      setRecordsError(
        getErrorMessage(error, 'Unable to load attendance records.'),
      );
    } finally {
      setLoadingRecords(false);
    }
  }, [selectedCourseId, recordFilters]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    loadRoster();
    loadAttendanceRecords();
  }, [loadRoster, loadAttendanceRecords]);

  function handleCourseChange(event) {
    setSelectedCourseId(event.target.value);
    setNotice('');
  }

  function handleStatusChange(studentId, status) {
    setAttendanceStatuses((current) => ({
      ...current,
      [studentId]: status,
    }));

    setNotice('');
  }

  function handleRemarksChange(studentId, value) {
    setRemarks((current) => ({
      ...current,
      [studentId]: value,
    }));
  }

  function handleMarkAll(status) {
    const next = {};

    students.forEach((student) => {
      next[student.id] = status;
    });

    setAttendanceStatuses(next);
    setNotice('');
  }

  function handleRecordFilterChange(event) {
    const { name, value } = event.target;

    setRecordFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmitAttendance(event) {
    event.preventDefault();

    setNotice('');

    if (!selectedCourseId) {
      setNotice('Select an assigned course first.');
      return;
    }

    if (!sessionDate) {
      setNotice('Select the attendance session date.');
      return;
    }

    if (!sessionKey.trim()) {
      setNotice('Enter a session key for this class.');
      return;
    }

    if (students.length === 0) {
      setNotice('No eligible students are available for this course.');
      return;
    }

    const records = students.map((student) => ({
      studentId: student.id,
      status: attendanceStatuses[student.id] || 'PRESENT',
      remarks: remarks[student.id] || '',
    }));

    if (
      records.some(
        (record) => !ATTENDANCE_STATUSES.includes(record.status),
      )
    ) {
      setNotice('Please select a valid attendance status for every student.');
      return;
    }

    setSubmitting(true);

    try {
      await facultyAttendanceService.markAttendance(
        selectedCourseId,
        {
          sessionDate,
          sessionKey: sessionKey.trim(),
          records,
        },
      );

      setNotice('Attendance saved successfully.');

      await loadAttendanceRecords();
    } catch (error) {
      setNotice(
        getErrorMessage(error, 'Unable to save attendance.'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(value) {
    const dateValue = normalizeDate(value);

    if (!dateValue) {
      return '—';
    }

    const date = new Date(`${dateValue}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
  eyebrow={
    workspace === 'mentor'
      ? 'MENTOR WORKSPACE'
      : 'FACULTY WORKSPACE'
  }
  title="Class Attendance"
  description="Manage assigned course attendance, mark student participation, and review saved attendance records."
  breadcrumbs={[
    {
      label:
        workspace === 'mentor'
          ? 'Mentor Dashboard'
          : 'Faculty Dashboard',
      to:
        workspace === 'mentor'
          ? '/mentor/dashboard'
          : '/faculty/dashboard',
    },
    {
      label: 'Class Attendance',
    },
  ]}
        actions={
          <ActionButton
            variant="secondary"
            onClick={() => {
              loadCourses();
              loadRoster();
              loadAttendanceRecords();
            }}
            loading={loadingCourses || loadingRoster || loadingRecords}
          >
            Refresh
          </ActionButton>
        }
      />

      <SectionCard
        eyebrow="COURSE SELECTION"
        title="Assigned Course"
        description="Choose one of your assigned active courses to manage its attendance."
      >
        {loadingCourses ? (
          <p className="text-sm text-[#A5A6B0]">
            Loading assigned courses...
          </p>
        ) : courseError ? (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"
          >
            {courseError}
          </div>
        ) : courses.length === 0 ? (
          <EmptyState
            title="No assigned courses"
            description="There are currently no active courses assigned to your Faculty account."
            action={
              <ActionButton
                variant="secondary"
                onClick={loadCourses}
              >
                Retry
              </ActionButton>
            }
          />
        ) : (
          <div>
            <label
              htmlFor="attendance-course-select"
              className="mb-2 block text-sm font-medium text-[#D0D0D8]"
            >
              Select course
            </label>

            <select
              id="attendance-course-select"
              value={selectedCourseId}
              onChange={handleCourseChange}
              className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code ? `${course.code} — ` : ''}
                  {course.title}
                </option>
              ))}
            </select>

            {selectedCourse && (
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {selectedCourse.code && (
                  <span className="rounded-lg border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 px-3 py-1.5 text-[#CDB5F7]">
                    {selectedCourse.code}
                  </span>
                )}

                {selectedCourse.semester && (
                  <span className="rounded-lg border border-[#454650] bg-[#26272B] px-3 py-1.5 text-[#B8B8C2]">
                    {selectedCourse.semester}
                  </span>
                )}

                <span className="rounded-lg border border-[#454650] bg-[#26272B] px-3 py-1.5 text-[#B8B8C2]">
                  {students.length} eligible students
                </span>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {selectedCourseId && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[
              {
                label: 'Total Students',
                value: statusSummary.total,
                text: 'text-[#EAEAE6]',
              },
              {
                label: 'Present',
                value: statusSummary.present,
                text: 'text-emerald-300',
              },
              {
                label: 'Absent',
                value: statusSummary.absent,
                text: 'text-red-300',
              },
              {
                label: 'Late',
                value: statusSummary.late,
                text: 'text-amber-200',
              },
            ].map((item) => (
              <section
                key={item.label}
                className="rounded-2xl border border-[#343640] bg-[#191A21] p-5"
              >
                <p className="text-sm text-[#9697A2]">
                  {item.label}
                </p>

                <p className={`mt-3 text-3xl font-semibold ${item.text}`}>
                  {item.value}
                </p>
              </section>
            ))}
          </div>

          <div className="mt-6">
            <SectionCard
              eyebrow="ATTENDANCE MANAGEMENT"
              title="Mark Class Attendance"
              description="Set the session details and mark the attendance status for each eligible student."
              action={
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    size="sm"
                    variant="outline"
                    disabled={loadingRoster || students.length === 0}
                    onClick={() => handleMarkAll('PRESENT')}
                  >
                    All Present
                  </ActionButton>

                  <ActionButton
                    size="sm"
                    variant="secondary"
                    disabled={loadingRoster || students.length === 0}
                    onClick={() => handleMarkAll('ABSENT')}
                  >
                    All Absent
                  </ActionButton>
                </div>
              }
            >
              {rosterError && (
                <div
                  role="alert"
                  className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"
                >
                  {rosterError}
                </div>
              )}

              {loadingRoster ? (
                <p className="text-sm text-[#A5A6B0]">
                  Loading eligible students...
                </p>
              ) : students.length === 0 ? (
                <EmptyState
                  title="No eligible students found"
                  description="No active students are currently linked to this course's assigned batches or sections."
                  action={
                    <ActionButton
                      variant="secondary"
                      onClick={loadRoster}
                    >
                      Retry
                    </ActionButton>
                  }
                />
              ) : (
                <form onSubmit={handleSubmitAttendance}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="attendance-session-date"
                        className="mb-2 block text-sm font-medium text-[#D0D0D8]"
                      >
                        Session Date
                      </label>

                      <input
                        id="attendance-session-date"
                        type="date"
                        value={sessionDate}
                        onChange={(event) => setSessionDate(event.target.value)}
                        required
                        className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="attendance-session-key"
                        className="mb-2 block text-sm font-medium text-[#D0D0D8]"
                      >
                        Session Key
                      </label>

                      <input
                        id="attendance-session-key"
                        type="text"
                        value={sessionKey}
                        onChange={(event) => setSessionKey(event.target.value)}
                        placeholder="Example: CS301-2026-11-13-01"
                        maxLength={100}
                        required
                        className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none placeholder:text-[#777986] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                      />

                      <p className="mt-1 text-xs text-[#777986]">
                        Use the same key when updating this class session.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 overflow-x-auto rounded-xl border border-[#343640]">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <caption className="sr-only">
                        Student attendance marking table
                      </caption>

                      <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                        <tr>
                          <th scope="col" className="px-4 py-3 font-medium">
                            Student
                          </th>

                          <th scope="col" className="px-4 py-3 font-medium">
                            Enrollment ID
                          </th>

                          <th scope="col" className="px-4 py-3 font-medium">
                            Attendance Status
                          </th>

                          <th scope="col" className="px-4 py-3 font-medium">
                            Remarks
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#343640]">
                        {students.map((student) => (
                          <tr
                            key={student.id}
                            className="bg-[#191A21] transition-colors hover:bg-[#202129]"
                          >
                            <td className="px-4 py-4">
                              <p className="font-medium text-[#EAEAE6]">
                                {student.fullName}
                              </p>

                              <p className="mt-1 text-xs text-[#9697A2]">
                                {student.batchId || student.sectionId || '—'}
                              </p>
                            </td>

                            <td className="px-4 py-4 text-[#B8B8C2]">
                              {student.institutionalId || '—'}
                            </td>

                            <td className="px-4 py-4">
                              <select
                                aria-label={`Attendance status for ${student.fullName}`}
                                value={attendanceStatuses[student.id] || 'PRESENT'}
                                onChange={(event) => handleStatusChange(
                                  student.id,
                                  event.target.value,
                                )}
                                className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#CDB5F7]/20 ${getStudentStatusClass(attendanceStatuses[student.id])}`}
                              >
                                {ATTENDANCE_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="px-4 py-4">
                              <input
                                type="text"
                                value={remarks[student.id] || ''}
                                onChange={(event) => handleRemarksChange(
                                  student.id,
                                  event.target.value,
                                )}
                                maxLength={500}
                                placeholder="Optional remarks"
                                aria-label={`Remarks for ${student.fullName}`}
                                className="min-h-10 w-full rounded-lg border border-[#454650] bg-[#202129] px-3 py-2 text-xs text-[#EAEAE6] outline-none placeholder:text-[#777986] focus:border-[#CDB5F7]"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-5">
                    <p className="text-xs text-[#9697A2]">
                      {statusSummary.unmarked} students still unmarked.
                    </p>

                    <ActionButton
                      type="submit"
                      loading={submitting}
                      disabled={
                        submitting ||
                        loadingRoster ||
                        students.length === 0
                      }
                    >
                      Save Attendance
                    </ActionButton>
                  </div>
                </form>
              )}

              {notice && (
                <div
                  role="status"
                  className="mt-5 rounded-xl border border-[#CDB5F7]/25 bg-[#CDB5F7]/10 p-4 text-sm leading-6 text-[#DCCBFA]"
                >
                  {notice}
                </div>
              )}
            </SectionCard>
          </div>

          <div className="mt-6">
            <SectionCard
              eyebrow="ATTENDANCE HISTORY"
              title="Saved Attendance Records"
              description="Review the records returned by the attendance API for the selected course."
              action={
                <ActionButton
                  size="sm"
                  variant="secondary"
                  onClick={loadAttendanceRecords}
                  loading={loadingRecords}
                >
                  Refresh Records
                </ActionButton>
              }
            >
              <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label
                    htmlFor="attendance-start-date"
                    className="mb-2 block text-xs font-medium text-[#B8B8C2]"
                  >
                    From Date
                  </label>

                  <input
                    id="attendance-start-date"
                    name="startDate"
                    type="date"
                    value={recordFilters.startDate}
                    onChange={handleRecordFilterChange}
                    className="min-h-10 w-full rounded-lg border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="attendance-end-date"
                    className="mb-2 block text-xs font-medium text-[#B8B8C2]"
                  >
                    To Date
                  </label>

                  <input
                    id="attendance-end-date"
                    name="endDate"
                    type="date"
                    value={recordFilters.endDate}
                    onChange={handleRecordFilterChange}
                    className="min-h-10 w-full rounded-lg border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="attendance-status-filter"
                    className="mb-2 block text-xs font-medium text-[#B8B8C2]"
                  >
                    Status
                  </label>

                  <select
                    id="attendance-status-filter"
                    name="status"
                    value={recordFilters.status}
                    onChange={handleRecordFilterChange}
                    className="min-h-10 w-full rounded-lg border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7]"
                  >
                    <option value="">All statuses</option>
                    {ATTENDANCE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Records', recordSummary.total],
                  ['Present', recordSummary.present],
                  ['Absent', recordSummary.absent],
                  ['Late', recordSummary.late],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-[#343640] bg-[#191A21] p-4"
                  >
                    <p className="text-xs text-[#9697A2]">{label}</p>
                    <p className="mt-2 text-xl font-semibold text-[#EAEAE6]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {recordsError && (
                <div
                  role="alert"
                  className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"
                >
                  {recordsError}
                </div>
              )}

              {loadingRecords ? (
                <p className="text-sm text-[#A5A6B0]">
                  Loading attendance records...
                </p>
              ) : attendanceRecords.length === 0 ? (
                <EmptyState
                  title="No attendance records found"
                  description="There are no saved attendance records matching the selected course and filters."
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#343640]">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <caption className="sr-only">
                      Saved course attendance records
                    </caption>

                    <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Student
                        </th>

                        <th scope="col" className="px-4 py-3 font-medium">
                          Date
                        </th>

                        <th scope="col" className="px-4 py-3 font-medium">
                          Session
                        </th>

                        <th scope="col" className="px-4 py-3 font-medium">
                          Status
                        </th>

                        <th scope="col" className="px-4 py-3 font-medium">
                          Remarks
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#343640]">
                      {attendanceRecords.map((record, index) => (
                        <tr
                          key={record.id || record._id || index}
                          className="bg-[#191A21] transition-colors hover:bg-[#202129]"
                        >
                          <td className="px-4 py-4">
                            <p className="font-medium text-[#EAEAE6]">
                              {record.studentName || record.student?.fullName || '—'}
                            </p>

                            <p className="mt-1 text-xs text-[#9697A2]">
                              {record.institutionalId || record.student?.institutionalId || ''}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-[#D0D0D8]">
                            {formatDate(record.sessionDate || record.date)}
                          </td>

                          <td className="px-4 py-4 text-[#B8B8C2]">
                            {record.sessionKey || '—'}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStudentStatusClass(record.status)}`}
                            >
                              {record.status || '—'}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-[#B8B8C2]">
                            {record.remarks || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}