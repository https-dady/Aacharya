import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const ATTENDANCE_THRESHOLD = 75;

export default function AttendanceReports() {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    section: '',
  });

  const [errors, setErrors] = useState({});
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [notice, setNotice] = useState('');

  // Real report records will be connected during backend integration.
  const attendanceRecords = [];

  const filteredRecords = useMemo(() => {
    if (!appliedFilters) {
      return [];
    }

    return attendanceRecords.filter((record) => {
      const matchesSection =
        !appliedFilters.section ||
        String(record.sectionName || '').toLowerCase() ===
          appliedFilters.section.trim().toLowerCase();

      const matchesStartDate =
        !appliedFilters.startDate ||
        String(record.date || '') >= appliedFilters.startDate;

      const matchesEndDate =
        !appliedFilters.endDate ||
        String(record.date || '') <= appliedFilters.endDate;

      return (
        matchesSection &&
        matchesStartDate &&
        matchesEndDate
      );
    });
  }, [appliedFilters, attendanceRecords]);

  const summary = useMemo(() => {
    if (!appliedFilters || filteredRecords.length === 0) {
      return {
        totalRecords: null,
        averageAttendance: null,
        belowThreshold: null,
      };
    }

    const validRecords = filteredRecords.filter((record) =>
      Number.isFinite(Number(record.attendancePercentage)),
    );

    const averageAttendance =
      validRecords.length > 0
        ? validRecords.reduce(
            (total, record) =>
              total + Number(record.attendancePercentage),
            0,
          ) / validRecords.length
        : null;

    const belowThreshold = validRecords.filter(
      (record) =>
        Number(record.attendancePercentage) < ATTENDANCE_THRESHOLD,
    ).length;

    return {
      totalRecords: filteredRecords.length,
      averageAttendance,
      belowThreshold,
    };
  }, [appliedFilters, filteredRecords]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: '',
    }));

    setNotice('');
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};

    if (
      filters.startDate &&
      filters.endDate &&
      filters.startDate > filters.endDate
    ) {
      nextErrors.endDate =
        'End date must be on or after the start date.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setNotice('');
      return;
    }

    setAppliedFilters({ ...filters });

    setNotice(
      'Filters applied locally. Report data is not connected to the backend yet.',
    );
  }

  function handleReset() {
    setFilters({
      startDate: '',
      endDate: '',
      section: '',
    });

    setErrors({});
    setAppliedFilters(null);
    setNotice('');
  }

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
        title="Attendance Reports"
        description="Review attendance records over a selected period and identify sections requiring attention."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Attendance', to: '/hod/attendance' },
          { label: 'Attendance Reports' },
        ]}
        actions={
          <Link to="/hod/attendance">
            <ActionButton variant="secondary">
              Back to Attendance
            </ActionButton>
          </Link>
        }
      />

      <SectionCard
        eyebrow="REPORT CONFIGURATION"
        title="Filter Attendance Records"
        description="Choose a date range and optionally specify a section."
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <FormField
              label="Start Date"
              name="startDate"
              type="date"
              value={filters.startDate}
              onChange={handleChange}
              error={errors.startDate}
            />

            <FormField
              label="End Date"
              name="endDate"
              type="date"
              value={filters.endDate}
              onChange={handleChange}
              error={errors.endDate}
            />

            <FormField
              label="Section"
              name="section"
              value={filters.section}
              onChange={handleChange}
              placeholder="e.g. Section A"
              helperText="Leave blank to include all sections."
            />
          </div>

          {notice && (
            <div
              role="status"
              className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200"
            >
              {notice}
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-[#343640] pt-5">
            <ActionButton
              type="button"
              variant="secondary"
              onClick={handleReset}
            >
              Reset Filters
            </ActionButton>

            <ActionButton type="submit">
              Apply Filters
            </ActionButton>
          </div>
        </form>
      </SectionCard>

      <div className="mt-6">
        <SectionCard
          eyebrow="REPORT SUMMARY"
          title="Attendance Statistics"
          description={
            appliedFilters
              ? 'Summary for the selected filters.'
              : 'Apply filters to prepare the report view.'
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
              <p className="text-sm text-[#9697A2]">
                Attendance Records
              </p>

              <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
                {summary.totalRecords ?? '—'}
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
            </div>

            <div className="rounded-xl border border-red-500/20 bg-[#191A21] p-5">
              <p className="text-sm text-[#9697A2]">
                Below {ATTENDANCE_THRESHOLD}%
              </p>

              <p className="mt-3 text-2xl font-semibold text-red-300">
                {summary.belowThreshold ?? '—'}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard
          eyebrow="REPORT DETAILS"
          title="Attendance Records"
          description="Records matching the selected report filters."
        >
          {filteredRecords.length === 0 ? (
            <EmptyState
              title={
                appliedFilters
                  ? 'No attendance records available'
                  : 'No report generated yet'
              }
              description={
                appliedFilters
                  ? 'No actual attendance records are available for the selected filters. Connect the report API to retrieve department data.'
                  : 'Select your filters and apply them to prepare the report view.'
              }
              action={
                appliedFilters ? (
                  <ActionButton
                    variant="secondary"
                    onClick={handleReset}
                  >
                    Reset Report
                  </ActionButton>
                ) : null
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Section</th>
                    <th className="px-4 py-3 font-medium">Course</th>
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
                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {record.date || '—'}
                        </td>

                        <td className="px-4 py-4 text-[#EAEAE6]">
                          {record.studentName || '—'}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {record.sectionName || '—'}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {record.courseName || '—'}
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
                              ? 'Below threshold'
                              : 'At or above threshold'}
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

      <div className="mt-5 rounded-xl border border-[#343640] bg-[#191A21] p-4">
        <p className="text-sm font-medium text-[#D0D0D8]">
          Report availability
        </p>

        <p className="mt-2 text-sm leading-6 text-[#9697A2]">
          Date and section filters currently operate on the page's local
          data source, which is empty until backend integration. Download,
          export, and persistent report generation have not been
          implemented.
        </p>
      </div>
    </div>
  );
}