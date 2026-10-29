import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const INITIAL_FORM = {
  name: '',
  code: '',
  batchId: '',
};

const BATCH_PAGE_SIZE = 100;

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
      'Use only letters, numbers, and hyphens. The code cannot start or end with a hyphen.';
  }

  if (!batchId) {
    errors.batchId = 'Please select an academic batch.';
  }

  return errors;
}

function getResponseData(response) {
  const body = response?.data;

  return body?.data ?? body;
}

function getErrorMessage(error) {
  const status = error?.response?.status;

  if (status === 400) {
    return (
      error?.response?.data?.message
      || error?.response?.data?.error?.message
      || 'Invalid batch ID or section information.'
    );
  }

  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }

  if (status === 403) {
    return 'You are not authorized to create sections.';
  }

  if (status === 404) {
    return 'The selected batch was not found or is no longer active.';
  }

  if (status === 409) {
    return (
      error?.response?.data?.message
      || error?.response?.data?.error?.message
      || 'A section with this code already exists in the selected batch.'
    );
  }

  if (status === 422) {
    return (
      error?.response?.data?.message
      || error?.response?.data?.error?.message
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

  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [batchError, setBatchError] = useState('');
  const [notice, setNotice] = useState('');

  const loadBatches = useCallback(async (signal) => {
    setIsLoadingBatches(true);
    setBatchError('');

    try {
      const response = await api.get(
        '/v1/provisioning/batches',
        {
          params: {
            page: 1,
            limit: BATCH_PAGE_SIZE,
            status: 'ACTIVE',
          },
          signal,
        },
      );

      const data = getResponseData(response);

      if (!Array.isArray(data?.batches)) {
        throw new Error(
          'The server returned an unexpected batch list response.',
        );
      }

      if (signal?.aborted) {
        return;
      }

      const activeBatches = data.batches.filter(
        (batch) => batch.status === 'ACTIVE',
      );

      setBatches(activeBatches);

      setForm((current) => {
        const selectedBatchExists = activeBatches.some(
          (batch) => (
            (batch.id || batch._id) === current.batchId
          ),
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
    (batch) => (batch.id || batch._id) === form.batchId,
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
      const batchId = selectedBatch.id || selectedBatch._id;

      const response = await api.post(
        `/v1/provisioning/batches/${encodeURIComponent(batchId)}/sections`,
        {
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
        },
      );

      const data = getResponseData(response);
      const section = data?.section;

      if (!section || !(section.id || section._id)) {
        throw new Error(
          'The server did not return the created section record.',
        );
      }

      navigate('/hod/sections/details', {
        state: {
          section: {
            ...section,
            batchName: selectedBatch.name,
            academicYear: selectedBatch.academicYear,
          },
        },
        replace: true,
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
              helperText="Use letters, numbers, and hyphens. Maximum 20 characters."
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
                className="text-sm font-medium text-[#D0D0D8]"
              >
                Academic Batch
                <span className="ml-1 text-rose-400">*</span>
              </label>

              <select
                id="batchId"
                name="batchId"
                value={form.batchId}
                onChange={handleChange}
                disabled={isLoadingBatches || isSubmitting}
                required
                aria-invalid={Boolean(errors.batchId)}
                aria-describedby={
                  errors.batchId
                    ? 'batchId-error'
                    : 'batchId-help'
                }
                className={[
                  'min-h-11 w-full rounded-xl border',
                  'bg-[#191A21] px-3 py-2 text-sm',
                  'text-[#EAEAE6] outline-none transition-colors',
                  'focus:border-[#CDB5F7]',
                  'focus:ring-2 focus:ring-[#CDB5F7]/20',
                  errors.batchId
                    ? 'border-rose-500'
                    : 'border-[#383943]',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                ].join(' ')}
              >
                <option value="">
                  {isLoadingBatches
                    ? 'Loading active batches...'
                    : batches.length === 0
                      ? 'No active batches available'
                      : 'Select an academic batch'}
                </option>

                {batches.map((batch) => {
                  const batchId = batch.id || batch._id;

                  return (
                    <option
                      key={batchId}
                      value={batchId}
                    >
                      {batch.name} ({batch.code}) — {batch.academicYear}
                    </option>
                  );
                })}
              </select>

              {errors.batchId && (
                <p
                  id="batchId-error"
                  className="text-sm text-rose-300"
                >
                  {errors.batchId}
                </p>
              )}

              {!errors.batchId && (
                <p
                  id="batchId-help"
                  className="text-sm leading-5 text-[#858590]"
                >
                  Only active batches from your department are available.
                </p>
              )}

              {batchError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3"
                >
                  <p className="text-sm leading-6 text-rose-200">
                    {batchError}
                  </p>

                  <div className="mt-3">
                    <ActionButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => loadBatches()}
                      disabled={isLoadingBatches || isSubmitting}
                    >
                      Retry Loading Batches
                    </ActionButton>
                  </div>
                </div>
              )}
            </div>
          </div>

          {selectedBatch && (
            <div className="mt-5 rounded-xl border border-[#454650] bg-[#191A21] p-4">
              <p className="text-sm font-medium text-[#EAEAE6]">
                Selected Batch
              </p>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-[#858590]">
                    Batch Name
                  </p>

                  <p className="mt-1 break-words text-sm text-[#D0D0D8]">
                    {selectedBatch.name}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[#858590]">
                    Batch Code
                  </p>

                  <p className="mt-1 text-sm text-[#D0D0D8]">
                    {selectedBatch.code}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[#858590]">
                    Academic Year
                  </p>

                  <p className="mt-1 text-sm text-[#D0D0D8]">
                    {selectedBatch.academicYear}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[#858590]">
                    Department
                  </p>

                  <p className="mt-1 text-sm text-[#D0D0D8]">
                    Assigned by the authenticated backend
                  </p>
                </div>
              </div>
            </div>
          )}

          {notice && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm leading-6 text-rose-200"
            >
              {notice}
            </div>
          )}

          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/hod/sections"
              className={[
                'inline-flex min-h-11 items-center justify-center',
                'rounded-xl px-4 py-2.5 text-sm font-semibold',
                'text-[#A5A6B0] transition-colors',
                'hover:bg-[#26272B] hover:text-[#EAEAE6]',
              ].join(' ')}
              aria-disabled={isSubmitting}
              onClick={(event) => {
                if (isSubmitting) {
                  event.preventDefault();
                }
              }}
            >
              Cancel
            </Link>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <ActionButton
                type="button"
                variant="secondary"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                Reset Form
              </ActionButton>

              <ActionButton
                type="submit"
                disabled={
                  isSubmitting
                  || isLoadingBatches
                  || batches.length === 0
                  || Boolean(batchError)
                }
              >
                {isSubmitting ? 'Creating Section...' : 'Create Section'}
              </ActionButton>
            </div>
          </div>
        </form>
      </SectionCard>

      <div className="mt-5 rounded-xl border border-[#343640] bg-[#191A21] p-4">
        <p className="text-sm font-medium text-[#D0D0D8]">
          Department-level access
        </p>

        <p className="mt-2 text-sm leading-6 text-[#9697A2]">
          The backend verifies your HOD permissions, confirms that the
          selected batch belongs to your department, and prevents duplicate
          section codes within the same batch. Academic year and department
          details are derived from the selected batch and server records.
        </p>
      </div>
    </div>
  );
}