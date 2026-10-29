import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

function getResponseData(response) {
  return response?.data?.data ?? response?.data;
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || 'Something went wrong. Please try again.'
  );
}

function getId(value) {
  if (value && typeof value === 'object') {
    return String(value.id ?? value._id ?? '');
  }

  return String(value ?? '');
}

function getAssignedIds(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [
    ...new Set(values.map(getId).filter(Boolean)),
  ];
}

function FormSelect({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  required = false,
  error,
  helperText,
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
      >
        {label}
        {required && (
          <span
            className="ml-1 text-[#E5DF98]"
            aria-hidden="true"
          >
            *
          </span>
        )}
      </label>

      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={
          error
            ? `${name}-error`
            : helperText
              ? `${name}-help`
              : undefined
        }
        className={[
          'min-h-11 w-full rounded-xl border bg-[#1D1F27]',
          'px-3.5 py-2.5 text-sm text-[#EAEAE6]',
          'outline-none transition-colors',
          'focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-rose-400' : 'border-[#454650]',
        ].join(' ')}
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p
          id={`${name}-error`}
          role="alert"
          className="mt-2 text-sm text-rose-300"
        >
          {error}
        </p>
      )}

      {!error && helperText && (
        <p
          id={`${name}-help`}
          className="mt-2 text-xs leading-5 text-[#858590]"
        >
          {helperText}
        </p>
      )}
    </div>
  );
}

function MultiSelect({
  label,
  name,
  options,
  selectedIds,
  onChange,
  disabled = false,
  error,
  helperText,
}) {
  function handleChange(event) {
    onChange(
      Array.from(
        event.target.selectedOptions,
        (option) => option.value,
      ),
    );
  }

  return (
    <div className="min-w-0">
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
      >
        {label}
      </label>

      <select
        id={name}
        name={name}
        multiple
        value={selectedIds}
        onChange={handleChange}
        disabled={disabled}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={
          error
            ? `${name}-error`
            : helperText
              ? `${name}-help`
              : undefined
        }
        className={[
          'min-h-40 w-full rounded-xl border bg-[#1D1F27]',
          'px-3 py-2 text-sm text-[#EAEAE6]',
          'outline-none transition-colors',
          'focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-rose-400' : 'border-[#454650]',
        ].join(' ')}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p
          id={`${name}-error`}
          role="alert"
          className="mt-2 text-sm text-rose-300"
        >
          {error}
        </p>
      )}

      {!error && helperText && (
        <p
          id={`${name}-help`}
          className="mt-2 text-xs leading-5 text-[#858590]"
        >
          {helperText}
        </p>
      )}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-[#858590]">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-[#EAEAE6]">
        {value || 'Not available'}
      </p>
    </div>
  );
}

function RuleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
    >
      <path
        d="M12 3 20 6v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3Z"
        strokeLinejoin="round"
      />

      <path
        d="m9 12 2 2 4-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function GrantMentorRole() {
  const location = useLocation();

  const initialFaculty = location.state?.faculty ?? null;

  const [facultyMembers, setFacultyMembers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sections, setSections] = useState([]);

  const [facultyId, setFacultyId] = useState(
    () => getId(initialFaculty),
  );

  const [selectedBatchIds, setSelectedBatchIds] = useState(
    () => getAssignedIds(initialFaculty?.assignedBatches),
  );

  const [selectedSectionIds, setSelectedSectionIds] = useState(
    () => getAssignedIds(initialFaculty?.assignedSections),
  );

  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isLoadingMentorAssignments, setIsLoadingMentorAssignments] =
    useState(false);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [pageError, setPageError] = useState('');
  const [assignmentLoadError, setAssignmentLoadError] = useState('');
  const [sectionError, setSectionError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');

  const [loadedMentorId, setLoadedMentorId] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const selectedFaculty = useMemo(
    () => (
      facultyMembers.find(
        (faculty) => getId(faculty) === facultyId,
      )
      || (
        getId(initialFaculty) === facultyId
          ? initialFaculty
          : null
      )
    ),
    [facultyMembers, facultyId, initialFaculty],
  );

  const isExistingMentor = selectedFaculty?.role === 'MENTOR';

  // Load the faculty directory and active batches.
  useEffect(() => {
    const controller = new AbortController();

    async function loadOptions() {
      setIsLoadingOptions(true);
      setPageError('');

      try {
        const [facultyResponse, batchResponse] = await Promise.all([
          api.get('/v1/provisioning/faculty', {
            params: {
              page: 1,
              limit: 100,
              status: 'ACTIVE',
            },
            signal: controller.signal,
          }),

          api.get('/v1/provisioning/batches', {
            params: {
              page: 1,
              limit: 100,
              status: 'ACTIVE',
            },
            signal: controller.signal,
          }),
        ]);

        const facultyData = getResponseData(facultyResponse);
        const batchData = getResponseData(batchResponse);

        if (!Array.isArray(facultyData?.faculty)) {
          throw new Error(
            'The server returned an unexpected faculty response.',
          );
        }

        if (!Array.isArray(batchData?.batches)) {
          throw new Error(
            'The server returned an unexpected batch response.',
          );
        }

        if (controller.signal.aborted) {
          return;
        }

        setFacultyMembers(facultyData.faculty);
        setBatches(batchData.batches);
      } catch (error) {
        if (
          controller.signal.aborted
          || error?.code === 'ERR_CANCELED'
        ) {
          return;
        }

        setPageError(getErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingOptions(false);
        }
      }
    }

    loadOptions();

    return () => controller.abort();
  }, [reloadKey]);

  // Load saved allocations from the authoritative mentor endpoint.
  // The faculty-list response is not assumed to contain assignments.
  useEffect(() => {
    const controller = new AbortController();

    async function loadSavedMentorAssignments() {
      if (isLoadingOptions || !facultyId || !selectedFaculty) {
        return;
      }

      if (selectedFaculty.role !== 'MENTOR') {
        setLoadedMentorId('');
        setAssignmentLoadError('');
        setIsLoadingMentorAssignments(false);

        return;
      }

      setLoadedMentorId('');
      setAssignmentLoadError('');
      setIsLoadingMentorAssignments(true);

      try {
        const institutionalId = selectedFaculty.institutionalId;

        if (!institutionalId) {
          throw new Error(
            'The selected mentor has no institutional ID. Saved assignments cannot be retrieved safely.',
          );
        }

        const response = await api.get(
          '/v1/provisioning/mentors',
          {
            params: {
              page: 1,
              limit: 100,
              search: institutionalId,
            },
            signal: controller.signal,
          },
        );

        const data = getResponseData(response);

        if (!Array.isArray(data?.mentors)) {
          throw new Error(
            'The server returned an unexpected mentor response.',
          );
        }

        const savedMentor = data.mentors.find(
          (mentor) => (
            getId(mentor) === facultyId
            || (
              mentor.institutionalId
              && mentor.institutionalId === institutionalId
            )
          ),
        );

        if (!savedMentor) {
          throw new Error(
            'Could not retrieve this mentor’s saved assignments. Saving is disabled to protect the existing allocation.',
          );
        }

        if (controller.signal.aborted) {
          return;
        }

        setSelectedBatchIds(
          getAssignedIds(savedMentor.assignedBatches),
        );

        setSelectedSectionIds(
          getAssignedIds(savedMentor.assignedSections),
        );

        setLoadedMentorId(facultyId);
        setAssignmentLoadError('');
      } catch (error) {
        if (
          controller.signal.aborted
          || error?.code === 'ERR_CANCELED'
        ) {
          return;
        }

        setAssignmentLoadError(getErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingMentorAssignments(false);
        }
      }
    }

    loadSavedMentorAssignments();

    return () => controller.abort();
  }, [
    facultyId,
    facultyMembers,
    initialFaculty,
    isLoadingOptions,
    selectedFaculty,
  ]);

  // Load active sections for the selected batches.
  useEffect(() => {
    const controller = new AbortController();

    async function loadSections() {
      if (selectedBatchIds.length === 0) {
        setSections([]);
        setSelectedSectionIds([]);
        setSectionError('');
        setIsLoadingSections(false);
        return;
      }

      setIsLoadingSections(true);
      setSectionError('');

      try {
        const responses = await Promise.all(
          selectedBatchIds.map((batchId) =>
            api.get(
              `/v1/provisioning/batches/${batchId}/sections`,
              {
                params: {
                  page: 1,
                  limit: 100,
                  status: 'ACTIVE',
                },
                signal: controller.signal,
              },
            ),
          ),
        );

        const sectionMap = new Map();

        responses.forEach((response) => {
          const data = getResponseData(response);

          if (!Array.isArray(data?.sections)) {
            throw new Error(
              'The server returned an unexpected section response.',
            );
          }

          data.sections.forEach((section) => {
            const id = getId(section);

            if (id) {
              sectionMap.set(id, section);
            }
          });
        });

        if (controller.signal.aborted) {
          return;
        }

        setSections([...sectionMap.values()]);

        // Preserve selected sections only when they remain available
        // in the currently selected active batches.
        setSelectedSectionIds((current) =>
          current.filter((id) => sectionMap.has(id)),
        );
      } catch (error) {
        if (
          controller.signal.aborted
          || error?.code === 'ERR_CANCELED'
        ) {
          return;
        }

        setSections([]);
        setSectionError(getErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingSections(false);
        }
      }
    }

    loadSections();

    return () => controller.abort();
  }, [selectedBatchIds]);

  const facultyOptions = useMemo(
    () => facultyMembers
      .filter((faculty) => (
        ['FACULTY', 'MENTOR'].includes(faculty.role)
        && faculty.status === 'ACTIVE'
      ))
      .map((faculty) => ({
        value: getId(faculty),
        label: `${faculty.fullName} · ${faculty.institutionalId} · ${faculty.role}`,
      })),
    [facultyMembers],
  );

  const batchOptions = useMemo(
    () => batches.map((batch) => ({
      value: getId(batch),
      label: `${batch.name} (${batch.code}) · ${batch.academicYear}`,
    })),
    [batches],
  );

  const sectionOptions = useMemo(
    () => sections.map((section) => {
      const batch = batches.find(
        (item) => getId(item) === getId(section.batch),
      );

      return {
        value: getId(section),
        label: `${section.name} (${section.code})${batch ? ` · ${batch.name}` : ''}`,
      };
    }),
    [sections, batches],
  );

  function handleFacultyChange(event) {
    const nextFacultyId = event.target.value;

    const nextFaculty = facultyMembers.find(
      (faculty) => getId(faculty) === nextFacultyId,
    );

    setFacultyId(nextFacultyId);

    // Existing mentor allocations will be loaded from the backend.
    // For a faculty member who is not yet a mentor, start unassigned.
    if (nextFaculty?.role !== 'MENTOR') {
      setSelectedBatchIds([]);
      setSelectedSectionIds([]);
    } else {
      // These are provisional only. The backend fetch below is
      // authoritative, and saving remains disabled until it succeeds.
      setSelectedBatchIds(
        getAssignedIds(nextFaculty?.assignedBatches),
      );

      setSelectedSectionIds(
        getAssignedIds(nextFaculty?.assignedSections),
      );
    }

    setLoadedMentorId('');
    setAssignmentLoadError('');
    setSectionError('');
    setSaveError('');
    setNotice('');
  }

  function handleBatchChange(nextBatchIds) {
    setSelectedBatchIds(nextBatchIds);

    const allowedSectionIds = new Set(
      sections
        .filter((section) => (
          nextBatchIds.includes(getId(section.batch))
        ))
        .map(getId),
    );

    setSelectedSectionIds((current) =>
      current.filter((id) => allowedSectionIds.has(id)),
    );

    setSaveError('');
    setNotice('');
  }

  function handleSectionChange(nextSectionIds) {
    setSelectedSectionIds(nextSectionIds);
    setSaveError('');
    setNotice('');
  }

  function handleReset() {
    if (isExistingMentor) {
      // Re-fetch the authoritative saved assignment rather than
      // resetting to potentially incomplete navigation state.
      setLoadedMentorId('');
      setAssignmentLoadError('');
      setReloadKey((current) => current + 1);
    } else {
      setSelectedBatchIds([]);
      setSelectedSectionIds([]);
    }

    setSaveError('');
    setNotice('');
    setPageError('');
    setSectionError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaveError('');
    setNotice('');

    if (!facultyId) {
      setSaveError('Select an existing faculty member.');
      return;
    }

    if (isExistingMentor && loadedMentorId !== facultyId) {
      setSaveError(
        'The mentor’s saved assignments have not been verified. Retry loading them before saving.',
      );
      return;
    }

    if (selectedBatchIds.length === 0) {
      setSaveError('Select at least one batch.');
      return;
    }

    if (selectedSectionIds.length === 0) {
      setSaveError('Select at least one section.');
      return;
    }

    if (
      isLoadingOptions
      || isLoadingMentorAssignments
      || isLoadingSections
      || pageError
      || assignmentLoadError
      || sectionError
    ) {
      setSaveError(
        'Resolve the loading errors and wait for all assignment data to finish loading before saving.',
      );
      return;
    }

    setIsSaving(true);

    try {
      const response = await api.patch(
        `/v1/provisioning/faculty/${facultyId}/mentor`,
        {
          batchIds: selectedBatchIds,
          sectionIds: selectedSectionIds,
        },
      );

      const data = getResponseData(response);

      if (data?.mentor) {
        setSelectedBatchIds(
          getAssignedIds(data.mentor.assignedBatches),
        );

        setSelectedSectionIds(
          getAssignedIds(data.mentor.assignedSections),
        );

        setLoadedMentorId(facultyId);
      }

      setNotice(
        data?.mentor
          ? 'Mentor role and assignments were saved successfully.'
          : 'The server accepted the assignment update.',
      );
    } catch (error) {
      setSaveError(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const isSavingBlocked = (
    isLoadingOptions
    || isLoadingMentorAssignments
    || isLoadingSections
    || Boolean(pageError)
    || Boolean(assignmentLoadError)
    || Boolean(sectionError)
    || facultyOptions.length === 0
    || (
      isExistingMentor
      && loadedMentorId !== facultyId
    )
  );

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Grant Mentor / TG Role"
        description="Designate an existing faculty member and manage their batch and section allocations."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Faculty Management', to: '/hod/faculty' },
          { label: 'Grant Mentor / TG Role' },
        ]}
        actions={
          <Link
            to="/hod/faculty"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-3.5 py-2 text-sm font-semibold text-[#EAEAE6] transition-colors hover:border-[#CDB5F7]/50 hover:bg-[#CDB5F7]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            Faculty directory
          </Link>
        }
      />

      <div className="mb-6 rounded-2xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-[#CDB5F7]">
            <RuleIcon />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#D8C7FA]">
              Role assignment rules
            </h2>

            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#B8B8C2]">
              <li>
                Only an authorized HOD can grant the Mentor/TG role.
              </li>
              <li>
                The faculty account must belong to the HOD's department.
              </li>
              <li>
                Every assigned batch and section must be valid for that department.
              </li>
              <li>
                Existing mentor assignments are retrieved from the backend before they can be updated.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {pageError && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4"
        >
          <p className="text-sm leading-6 text-rose-200">
            {pageError}
          </p>

          <div className="mt-3">
            <ActionButton
              variant="secondary"
              onClick={() => setReloadKey((current) => current + 1)}
            >
              Retry loading options
            </ActionButton>
          </div>
        </div>
      )}

      {selectedFaculty && (
        <SectionCard
          eyebrow="SELECTED ACCOUNT"
          title="Faculty member"
          description="Verify the account before changing its mentor designation."
          className="mb-5"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-lg font-semibold text-[#CDB5F7]">
              {(selectedFaculty.fullName || 'F')
                .trim()
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="grid min-w-0 flex-1 grid-cols-1 gap-5 sm:grid-cols-2">
              <InfoItem
                label="Faculty name"
                value={selectedFaculty.fullName}
              />

              <InfoItem
                label="Institutional ID"
                value={selectedFaculty.institutionalId}
              />

              <InfoItem
                label="Email address"
                value={selectedFaculty.email}
              />

              <InfoItem
                label="Current role"
                value={selectedFaculty.role}
              />
            </div>
          </div>
        </SectionCard>
      )}

      {!isLoadingOptions
        && facultyOptions.length === 0
        && !pageError && (
          <div className="mb-5">
            <EmptyState
              title="No active faculty accounts found"
              description="An active faculty account is required before the Mentor/TG role can be assigned."
              action={
                <Link to="/hod/faculty">
                  <ActionButton variant="secondary">
                    Open faculty directory
                  </ActionButton>
                </Link>
              }
            />
          </div>
        )}

      <form onSubmit={handleSubmit} noValidate>
        <SectionCard
          eyebrow="MENTOR DESIGNATION"
          title="Faculty identification"
          description="Select an existing active faculty or mentor account."
        >
          <FormSelect
            label="Faculty member"
            name="facultyId"
            value={facultyId}
            onChange={handleFacultyChange}
            options={facultyOptions}
            placeholder={
              isLoadingOptions
                ? 'Loading faculty accounts…'
                : 'Select faculty member'
            }
            disabled={isLoadingOptions || facultyOptions.length === 0}
            required
          />

          {isLoadingMentorAssignments && (
            <p
              role="status"
              className="mt-3 text-sm text-[#CDB5F7]"
            >
              Retrieving saved mentor assignments…
            </p>
          )}

          {assignmentLoadError && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4"
            >
              <p className="text-sm leading-6 text-rose-200">
                {assignmentLoadError}
              </p>

              <p className="mt-2 text-xs leading-5 text-rose-200/80">
                Saving is disabled until the existing assignment has been retrieved successfully.
              </p>

              <div className="mt-3">
                <ActionButton
                  variant="secondary"
                  onClick={() => setReloadKey((current) => current + 1)}
                  disabled={isLoadingOptions}
                >
                  Retry
                </ActionButton>
              </div>
            </div>
          )}
        </SectionCard>

        <div className="mt-5">
          <SectionCard
            eyebrow="MENTOR ALLOCATION"
            title="Batch and section"
            description="Choose active batches and sections belonging to those batches."
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <MultiSelect
                label="Assigned batches"
                name="batchIds"
                options={batchOptions}
                selectedIds={selectedBatchIds}
                onChange={handleBatchChange}
                disabled={
                  isLoadingOptions
                  || Boolean(pageError)
                  || (
                    isExistingMentor
                    && loadedMentorId !== facultyId
                  )
                }
                helperText="Use Ctrl (Windows) or Command (Mac) to select multiple options."
              />

              <MultiSelect
                label="Assigned sections"
                name="sectionIds"
                options={sectionOptions}
                selectedIds={selectedSectionIds}
                onChange={handleSectionChange}
                disabled={
                  isLoadingSections
                  || selectedBatchIds.length === 0
                  || Boolean(sectionError)
                  || (
                    isExistingMentor
                    && loadedMentorId !== facultyId
                  )
                }
                helperText={
                  isLoadingSections
                    ? 'Loading sections…'
                    : 'Only sections from the selected batches are shown.'
                }
                error={sectionError}
              />
            </div>

            <div className="mt-5 rounded-xl border border-[#454650] bg-[#14161C]/60 p-4">
              <p className="text-sm font-medium text-[#EAEAE6]">
                Current selection
              </p>

              <div className="mt-3 grid grid-cols-2 gap-4">
                <InfoItem
                  label="Selected batches"
                  value={String(selectedBatchIds.length)}
                />

                <InfoItem
                  label="Selected sections"
                  value={String(selectedSectionIds.length)}
                />
              </div>
            </div>
          </SectionCard>
        </div>

        {saveError && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm leading-6 text-rose-200"
          >
            {saveError}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200"
          >
            {notice}

            <div className="mt-3">
              <Link
                to="/hod/mentors/assignments"
                className="font-semibold underline underline-offset-4"
              >
                View mentor assignments
              </Link>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <ActionButton
            variant="secondary"
            type="button"
            onClick={handleReset}
            disabled={isSaving}
          >
            Reset
          </ActionButton>

          <ActionButton
            type="submit"
            loading={isSaving}
            disabled={isSaving || isSavingBlocked}
          >
            {isExistingMentor
              ? 'Save Assignment Changes'
              : 'Grant Mentor Role'}
          </ActionButton>
        </div>
      </form>
    </div>
  );
}