import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import sectionManagementService from '../../services/sectionManagementService.js';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import FormField from '../../components/FormField.jsx';
import LoadingState from '../../components/LoadingState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const INITIAL_FORM = {
  name: '',
  code: '',
  batchId: '',
};

const PAGE_SIZE = 100;

function validateForm(form) {
  const errors = {};

  const name = form.name.trim();
  const code = form.code.trim();
  const batchId = form.batchId.trim();

  if (!name) {
    errors.name = 'Section name is required.';
  } else if (name.length > 50) {
    errors.name = 'Section name cannot exceed 50 characters.';
  }

  if (!code) {
    errors.code = 'Section code is required.';
  } else if (code.length > 20) {
    errors.code = 'Section code cannot exceed 20 characters.';
  } else if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(code)) {
    errors.code =
      'Use letters, numbers, and single hyphens between code parts.';
  }

  if (!batchId) {
    errors.batchId = 'Please select an academic batch.';
  }

  return errors;
}

function getErrorMessage(error) {
  const status = error?.response?.status;

  if (status === 400) {
    return (
      error?.response?.data?.message
      || 'Invalid batch ID or section information.'
    );
  }

  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }

  if (status === 403) {
    return 'You are not authorized to create sections in this department.';
  }

  if (status === 404) {
    return 'The selected batch was not found in your department.';
  }

  if (status === 409) {
    return (
      error?.response?.data?.message
      || 'A section with this code already exists in the selected batch.'
    );
  }

  if (status === 422) {
    return (
      error?.response?.data?.message
      || 'The section information failed server-side validation.'
    );
  }

  return (
    error?.response?.data?.message
    || error?.response?.data?.error?.message
    || error?.message
    || 'Unable to create the section. Please try again.'
  );
}

async function fetchAllActiveBatches(signal) {
  const batches = [];
  let page = 1;

  while (true) {
    const result = await sectionManagementService.listBatches({
      page,
      limit: PAGE_SIZE,
      status: 'ACTIVE',
      signal,
    });

    batches.push(...result.batches);

    if (!result.pagination.hasNextPage) {
      break;
    }

    page += 1;
  }

  return batches.filter(
    (batch) => batch.status === 'ACTIVE',
  );
}

export default function CreateSection() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialBatchId = location.state?.batchId || '';

  const [form, setForm] = useState({
    ...INITIAL_FORM,
    batchId: initialBatchId,
  });

  const [batches, setBatches] = useState([]);

  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');

  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [batchError, setBatchError] = useState('');

  const loadBatches = useCallback(async (signal) => {
    setIsLoadingBatches(true);
    setBatchError('');

    try {
      const activeBatches = await fetchAllActiveBatches(signal);

      if (signal?.aborted) {
        return;
      }

      setBatches(activeBatches);

      setForm((current) => {
        const selectedBatchExists = activeBatches.some(
          (batch) => batch.id === current.batchId,
        );

        if (selectedBatchExists) {
          return current;
        }

        return {
          ...current,
          batchId: '',
        };
      });
    } catch (error) {
      if (
        signal?.aborted
        || error?.code === 'ERR_CANCELED'
      ) {
        return;
      }

      setBatches([]);
      setBatchError(getErrorMessage(error));
    } finally {
      if (!signal?.aborted) {
        setIsLoadingBatches(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadBatches(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadBatches]);

  const selectedBatch = batches.find(
    (batch) => batch.id === form.batchId,
  );

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: name === 'code'
        ? value.toUpperCase()
        : value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: '',
    }));

    setNotice('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const validationErrors = validateForm(form);

    setErrors(validationErrors);
    setNotice('');

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    if (!selectedBatch) {
      setErrors({
        batchId: 'Select a valid active batch before continuing.',
      });

      return;
    }

    setIsSubmitting(true);

    try {
      const section = await sectionManagementService.createSection(
        selectedBatch.id,
        {
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
        },
      );

      navigate('/hod/sections/details', {
        replace: true,
        state: {
          section: {
            ...section,
            batch: section.batch || selectedBatch,
            batchName: selectedBatch.name,
            batchCode: selectedBatch.code,
            academicYear: selectedBatch.academicYear,
          },
        },
      });
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    if (isSubmitting) {
      return;
    }

    setForm({
      ...INITIAL_FORM,
      batchId: initialBatchId,
    });

    setErrors({});
    setNotice('');
  }

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Create Section"
        description="Create an academic section and associate it with an active batch."
        breadcrumbs={[
          {
            label: 'HOD Dashboard',
            to: '/hod/dashboard',
          },
          {
            label: 'Sections',
            to: '/hod/sections',
          },
          {
            label: 'Create Section',
          },
        ]}
        actions={
          <Link to="/hod/sections">
            <ActionButton variant="secondary">
              Back to Sections
            </ActionButton>
          </Link>
        }
      />

      <SectionCard
        eyebrow="SECTION CONFIGURATION"
        title="Section Information"
        description="Enter the section name and unique code, then select its academic batch."
      >
        {isLoadingBatches ? (
          <LoadingState
            message="Loading active academic batches..."
            rows={2}
          />
        ) : batchError ? (
          <EmptyState
            title="Unable to load academic batches"
            description={batchError}
            action={
              <ActionButton
                type="button"
                onClick={() => {
                  const controller = new AbortController();
                  loadBatches(controller.signal);
                }}
              >
                Retry
              </ActionButton>
            }
          />
        ) : batches.length === 0 ? (
          <EmptyState
            title="No active batches available"
            description="Create an active academic batch before creating its sections."
            action={
              <Link to="/hod/batches/new">
                <ActionButton>
                  Create Batch
                </ActionButton>
              </Link>
            }
          />
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField
                label="Section Name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Section A"
                helperText="Enter a recognizable name for the section."
                error={errors.name}
                required
                maxLength={50}
                autoComplete="off"
                disabled={isSubmitting}
              />

              <FormField
                label="Section Code"
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="e.g. AIDS-A"
                helperText="Letters, numbers, and hyphens. Maximum 20 characters."
                error={errors.code}
                required
                maxLength={20}
                autoComplete="off"
                disabled={isSubmitting}
                spellCheck={false}
              />

              <div className="flex flex-col gap-2 md:col-span-2">
                <label
                  htmlFor="batchId"
                  className="text-sm font-semibold text-[#EAEAE6]"
                >
                  Academic Batch
                  <span className="ml-1 text-[#E5DF98]">*</span>
                </label>

                <select
                  id="batchId"
                  name="batchId"
                  value={form.batchId}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required
                  aria-invalid={Boolean(errors.batchId)}
                  aria-describedby={
                    errors.batchId
                      ? 'batchId-error'
                      : 'batchId-help'
                  }
                  className={[
                    'min-h-11 w-full rounded-xl border',
                    'bg-[#1D1F27] px-3.5 py-2.5 text-sm',
                    'text-[#EAEAE6] outline-none transition-colors',
                    'focus:border-[#CDB5F7]',
                    'focus:ring-2 focus:ring-[#CDB5F7]/20',
                    errors.batchId
                      ? 'border-[#D58B95]'
                      : 'border-[#454650]',
                  ].join(' ')}
                >
                  <option value="">
                    Select an active batch
                  </option>

                  {batches.map((batch) => (
                    <option
                      key={batch.id}
                      value={batch.id}
                    >
                      {batch.name} ({batch.code}) — {batch.academicYear}
                    </option>
                  ))}
                </select>

                {errors.batchId ? (
                  <p
                    id="batchId-error"
                    role="alert"
                    className="text-sm text-[#D58B95]"
                  >
                    {errors.batchId}
                  </p>
                ) : (
                  <p
                    id="batchId-help"
                    className="text-xs leading-5 text-[#A7A7B0]"
                  >
                    Sections can only be created inside an active batch
                    belonging to your department.
                  </p>
                )}
              </div>
            </div>

            {selectedBatch && (
              <div className="mt-5 rounded-xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#CDB5F7]">
                  Selected Academic Batch
                </p>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-[#858590]">
                      Batch Name
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#EAEAE6]">
                      {selectedBatch.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#858590]">
                      Batch Code
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#EAEAE6]">
                      {selectedBatch.code}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#858590]">
                      Academic Year
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#EAEAE6]">
                      {selectedBatch.academicYear}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {notice && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-[#D58B95]/30 bg-[#D58B95]/10 p-4 text-sm leading-6 text-[#E8AAB2]"
              >
                {notice}
              </div>
            )}

            <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-[#343640] pt-5">
              <ActionButton
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={handleReset}
              >
                Reset Form
              </ActionButton>

              <ActionButton
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => navigate('/hod/sections')}
              >
                Cancel
              </ActionButton>

              <ActionButton
                type="submit"
                loading={isSubmitting}
                disabled={isSubmitting || !selectedBatch}
              >
                Create Section
              </ActionButton>
            </div>
          </form>
        )}
      </SectionCard>

      <p className="mt-5 text-xs leading-5 text-[#777986]">
        Section codes must be unique within their selected batch.
        The backend enforces department ownership and duplicate-code
        protection.
      </p>
    </div>
  );
}