import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import mentorManagementService from '../../services/mentorManagementService.js';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

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
    ...new Set(
      values.map(getId).filter(Boolean),
    ),
  ];
}

function getErrorMessage(error) {
  const code = error?.response?.data?.error?.code;

  if (code === 'SECTION_ALREADY_ASSIGNED') {
    return 'One or more selected sections already belong to another mentor. Refresh the assignments and try again.';
  }

  if (code === 'ASSIGNMENT_UPDATE_CONFLICT') {
    return 'Assignments changed while saving. Reload the data and try again.';
  }

  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    'Something went wrong. Please try again.'
  );
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
          <span className="ml-1 text-[#E5DF98]">*</span>
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
        <p role="alert" className="mt-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      {!error && helperText && (
        <p className="mt-2 text-xs leading-5 text-[#858590]">
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
        className={[
          'min-h-40 w-full rounded-xl border bg-[#1D1F27]',
          'px-3 py-2 text-sm text-[#EAEAE6]',
          'outline-none transition-colors',
          'focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'border-[#454650]',
        ].join(' ')}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={Boolean(option.disabled)}
          >
            {option.label}
          </option>
        ))}
      </select>

      {helperText && (
        <p className="mt-2 text-xs leading-5 text-[#858590]">
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

export default function GrantMentorRole() {
  const location = useLocation();

  const initialFaculty = location.state?.faculty ?? null;

  const [facultyMembers, setFacultyMembers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sections, setSections] = useState([]);
  const [mentors, setMentors] = useState([]);

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
  const [isLoadingMentors, setIsLoadingMentors] = useState(true);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [pageError, setPageError] = useState('');
  const [mentorLoadError, setMentorLoadError] = useState('');
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
      ) ||
      (
        getId(initialFaculty) === facultyId
          ? initialFaculty
          : null
      )
    ),
    [facultyMembers, facultyId, initialFaculty],
  );

  const isExistingMentor =
    selectedFaculty?.role === 'MENTOR';

  const loadOptions = useCallback(async (signal) => {
    setIsLoadingOptions(true);
    setPageError('');

    try {
      const [facultyResult, batchResult] = await Promise.all([
        mentorManagementService.listFaculty(
          { page: 1, limit: 100, status: 'ACTIVE' },
          { signal },
        ),

        mentorManagementService.listBatches(
          { page: 1, limit: 100, status: 'ACTIVE' },
          { signal },
        ),
      ]);

      if (signal.aborted) return;

      setFacultyMembers(facultyResult.items);
      setBatches(batchResult.items);
    } catch (error) {
      if (signal.aborted || error?.code === 'ERR_CANCELED') {
        return;
      }

      setPageError(getErrorMessage(error));
    } finally {
      if (!signal.aborted) {
        setIsLoadingOptions(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadOptions(controller.signal);

    return () => controller.abort();
  }, [loadOptions, reloadKey]);

  const loadMentors = useCallback(async (signal) => {
    setIsLoadingMentors(true);
    setMentorLoadError('');

    try {
      const result = await mentorManagementService.listMentors(
        { page: 1, limit: 100 },
        { signal },
      );

      if (signal.aborted) return;

      setMentors(result.items);
    } catch (error) {
      if (signal.aborted || error?.code === 'ERR_CANCELED') {
        return;
      }

      setMentors([]);
      setMentorLoadError(getErrorMessage(error));
    } finally {
      if (!signal.aborted) {
        setIsLoadingMentors(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadMentors(controller.signal);

    return () => controller.abort();
  }, [loadMentors, reloadKey]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSavedAssignments() {
      if (
        isLoadingOptions ||
        !facultyId ||
        !selectedFaculty
      ) {
        return;
      }

      if (!isExistingMentor) {
        setLoadedMentorId('');
        setAssignmentLoadError('');
        setIsLoadingAssignments(false);
        return;
      }

      setLoadedMentorId('');
      setAssignmentLoadError('');
      setIsLoadingAssignments(true);

      try {
        const result = await mentorManagementService.listMentors(
          {
            page: 1,
            limit: 100,
            search: selectedFaculty.institutionalId,
          },
          { signal: controller.signal },
        );

        const savedMentor = result.items.find(
          (mentor) => getId(mentor) === facultyId,
        );

        if (!savedMentor) {
          throw new Error(
            'Could not retrieve saved assignments. Saving is disabled to protect the existing allocation.',
          );
        }

        if (controller.signal.aborted) return;

        setSelectedBatchIds(
          getAssignedIds(savedMentor.assignedBatches),
        );

        setSelectedSectionIds(
          getAssignedIds(savedMentor.assignedSections),
        );

        setLoadedMentorId(facultyId);
      } catch (error) {
        if (controller.signal.aborted || error?.code === 'ERR_CANCELED') {
          return;
        }

        setAssignmentLoadError(getErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingAssignments(false);
        }
      }
    }

    loadSavedAssignments();

    return () => controller.abort();
  }, [
    facultyId,
    isExistingMentor,
    isLoadingOptions,
    selectedFaculty,
  ]);

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
        const results = await Promise.all(
          selectedBatchIds.map((batchId) =>
            mentorManagementService.listSections(
              batchId,
              { page: 1, limit: 100, status: 'ACTIVE' },
              { signal: controller.signal },
            ),
          ),
        );

        if (controller.signal.aborted) return;

        const sectionMap = new Map();

        results.forEach((result) => {
          result.items.forEach((section) => {
            const id = getId(section);

            if (id) {
              sectionMap.set(id, section);
            }
          });
        });

        setSections([...sectionMap.values()]);

        setSelectedSectionIds((current) =>
          current.filter((id) => sectionMap.has(id)),
        );
      } catch (error) {
        if (controller.signal.aborted || error?.code === 'ERR_CANCELED') {
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
        ['FACULTY', 'MENTOR'].includes(faculty.role) &&
        faculty.status === 'ACTIVE'
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
      const sectionId = getId(section);

      const assignedMentor = mentors.find((mentor) =>
        getAssignedIds(mentor.assignedSections).includes(sectionId),
      );

      const assignedToAnotherMentor =
        assignedMentor &&
        getId(assignedMentor) !== facultyId;

      return {
        value: sectionId,
        label: assignedToAnotherMentor
          ? `${section.name} · Assigned to ${assignedMentor.fullName}`
          : `${section.name}${section.code ? ` (${section.code})` : ''}`,
        disabled: Boolean(assignedToAnotherMentor),
      };
    }),
    [sections, mentors, facultyId],
  );

  function handleFacultyChange(event) {
    const nextFacultyId = event.target.value;

    const nextFaculty = facultyMembers.find(
      (faculty) => getId(faculty) === nextFacultyId,
    );

    setFacultyId(nextFacultyId);
    setLoadedMentorId('');
    setAssignmentLoadError('');
    setSaveError('');
    setNotice('');

    setSelectedBatchIds(
      getAssignedIds(nextFaculty?.assignedBatches),
    );

    setSelectedSectionIds(
      getAssignedIds(nextFaculty?.assignedSections),
    );
  }

  function handleBatchChange(nextBatchIds) {
    setSelectedBatchIds(nextBatchIds);
    setSaveError('');
    setNotice('');
  }

  function handleSectionChange(nextSectionIds) {
    setSelectedSectionIds(nextSectionIds);
    setSaveError('');
    setNotice('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaveError('');
    setNotice('');

    if (!facultyId) {
      setSaveError('Select a faculty member.');
      return;
    }

    if (isExistingMentor && loadedMentorId !== facultyId) {
      setSaveError(
        'Saved mentor assignments have not been verified. Reload them before saving.',
      );
      return;
    }

    if (!isExistingMentor && selectedBatchIds.length === 0) {
      setSaveError('Select at least one batch for the new mentor.');
      return;
    }

    if (!isExistingMentor && selectedSectionIds.length === 0) {
      setSaveError('Select at least one section for the new mentor.');
      return;
    }

    if (
      isLoadingOptions ||
      isLoadingMentors ||
      isLoadingAssignments ||
      isLoadingSections ||
      pageError ||
      mentorLoadError ||
      assignmentLoadError ||
      sectionError
    ) {
      setSaveError(
        'Resolve loading errors and wait for all assignment data before saving.',
      );
      return;
    }

    setIsSaving(true);

    try {
      const result = await mentorManagementService.assignMentor(
        facultyId,
        {
          batchIds: selectedBatchIds,
          sectionIds: selectedSectionIds,
        },
      );

      const savedMentor = result.mentor;

      setSelectedBatchIds(
        getAssignedIds(savedMentor.assignedBatches),
      );

      setSelectedSectionIds(
        getAssignedIds(savedMentor.assignedSections),
      );

      setLoadedMentorId(facultyId);

      setNotice(
        selectedBatchIds.length === 0 &&
        selectedSectionIds.length === 0
          ? 'All assignments were removed. The faculty account and Mentor role remain unchanged.'
          : 'Mentor role and assignments were saved successfully.',
      );

      setReloadKey((current) => current + 1);
    } catch (error) {
      setSaveError(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const isSavingBlocked = (
    isLoadingOptions ||
    isLoadingMentors ||
    isLoadingAssignments ||
    isLoadingSections ||
    Boolean(pageError) ||
    Boolean(mentorLoadError) ||
    Boolean(assignmentLoadError) ||
    Boolean(sectionError) ||
    facultyOptions.length === 0
  );

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Mentor Management"
        description="Assign faculty members as mentors and manage their batch and section responsibilities."
        breadcrumbs={[
          {
            label: 'HOD Dashboard',
            to: '/hod/dashboard',
          },
          {
            label: 'Mentor Management',
          },
        ]}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/hod/mentors"
          className="text-sm font-semibold text-[#CDB5F7] hover:text-[#EAEAE6]"
        >
          View Mentor Assignments →
        </Link>

        <button
          type="button"
          onClick={() => setReloadKey((current) => current + 1)}
          disabled={isLoadingOptions || isSaving}
          className="rounded-xl border border-[#454650] px-4 py-2 text-sm font-semibold text-[#CDB5F7] transition-colors hover:bg-[#292A34] disabled:opacity-50"
        >
          Refresh data
        </button>
      </div>

      {pageError && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200"
        >
          {pageError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <SectionCard
          eyebrow="FACULTY SELECTION"
          title="Select faculty member"
          description="Choose an active faculty member from your department."
        >
          <FormSelect
            label="Faculty Member"
            name="facultyId"
            value={facultyId}
            onChange={handleFacultyChange}
            options={facultyOptions}
            placeholder={
              isLoadingOptions
                ? 'Loading faculty...'
                : 'Select faculty member'
            }
            disabled={isLoadingOptions || isSaving}
            required
          />

          {selectedFaculty && (
            <div className="mt-5 grid grid-cols-1 gap-5 rounded-xl border border-[#343640] bg-[#191B22] p-4 sm:grid-cols-3">
              <InfoItem
                label="Full Name"
                value={selectedFaculty.fullName}
              />

              <InfoItem
                label="Institutional ID"
                value={selectedFaculty.institutionalId}
              />

              <InfoItem
                label="Current Role"
                value={selectedFaculty.role}
              />
            </div>
          )}
        </SectionCard>

        <div className="mt-5">
          <SectionCard
            eyebrow="BATCH RESPONSIBILITY"
            title="Assign batches"
            description="Select the batches this mentor will supervise. Use Ctrl or Command to select multiple batches."
          >
            <MultiSelect
              label="Available Batches"
              name="batchIds"
              options={batchOptions}
              selectedIds={selectedBatchIds}
              onChange={handleBatchChange}
              disabled={
                isLoadingOptions ||
                isSaving ||
                batchOptions.length === 0
              }
              helperText={
                batchOptions.length === 0
                  ? 'No active batches are currently available.'
                  : `${selectedBatchIds.length} batch(es) selected.`
              }
            />
          </SectionCard>
        </div>

        <div className="mt-5">
          <SectionCard
            eyebrow="SECTION RESPONSIBILITY"
            title="Assign sections"
            description="Only sections belonging to the selected batches are displayed."
          >
            {sectionError && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200"
              >
                {sectionError}
              </div>
            )}

            {mentorLoadError && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200"
              >
                Mentor ownership could not be verified: {mentorLoadError}
              </div>
            )}

            <MultiSelect
              label="Available Sections"
              name="sectionIds"
              options={sectionOptions}
              selectedIds={selectedSectionIds}
              onChange={handleSectionChange}
              disabled={
                selectedBatchIds.length === 0 ||
                isLoadingSections ||
                isLoadingMentors ||
                Boolean(sectionError) ||
                Boolean(mentorLoadError) ||
                isSaving
              }
              helperText={
                isLoadingSections
                  ? 'Loading sections...'
                  : selectedBatchIds.length === 0
                    ? 'Select batches first to load their sections.'
                    : `${selectedSectionIds.length} section(s) selected. Sections owned by another mentor are disabled.`
              }
            />

            {isLoadingMentors && (
              <p className="mt-3 text-xs text-[#858590]">
                Checking existing mentor ownership...
              </p>
            )}
          </SectionCard>
        </div>

        {assignmentLoadError && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200"
          >
            {assignmentLoadError}
          </div>
        )}

        {notice && (
          <div
            role="status"
            aria-live="polite"
            className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
          >
            {notice}
          </div>
        )}

        {saveError && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200"
          >
            {saveError}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/hod/mentors"
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-[#A5A6B0] transition-colors hover:bg-[#26272B] hover:text-[#EAEAE6]"
          >
            View mentor directory
          </Link>

          <ActionButton
            type="submit"
            disabled={isSaving || isSavingBlocked}
          >
            {isSaving
              ? 'Saving Assignments...'
              : isExistingMentor
                ? 'Update Mentor Assignments'
                : 'Grant Mentor Role'}
          </ActionButton>
        </div>
      </form>
    </div>
  );
}