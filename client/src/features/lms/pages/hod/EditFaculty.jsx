import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const INITIAL_FORM = {
  institutionalId: '',
  fullName: '',
  email: '',
};

function getInitialForm(faculty) {
  return {
    institutionalId: faculty?.institutionalId ?? '',
    fullName: faculty?.fullName ?? '',
    email: faculty?.email ?? '',
  };
}

function getResponseData(response) {
  const body = response?.data;

  return body?.data ?? body ?? {};
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || fallback
  );
}

function validateForm(form) {
  const errors = {};

  const institutionalId = form.institutionalId.trim();
  const fullName = form.fullName.trim();
  const email = form.email.trim();

  if (institutionalId.length < 2 || institutionalId.length > 50) {
    errors.institutionalId =
      'Institutional ID must contain between 2 and 50 characters.';
  }

  if (fullName.length < 2 || fullName.length > 100) {
    errors.fullName =
      'Full name must contain between 2 and 100 characters.';
  }

  if (!email) {
    errors.email = 'Email address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.';
  } else if (email.length > 254) {
    errors.email = 'Email address cannot exceed 254 characters.';
  }

  return errors;
}

function normalizeFaculty(data) {
  return data?.faculty ?? data?.user ?? data ?? null;
}

export default function EditFaculty() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const initialFaculty = location.state?.faculty ?? null;

  const facultyId = (
    params.facultyId
    || params.id
    || initialFaculty?.id
    || initialFaculty?._id
    || ''
  );

  const [faculty, setFaculty] = useState(initialFaculty);
  const [form, setForm] = useState(
    () => getInitialForm(initialFaculty),
  );

  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadFaculty = useCallback(async (signal) => {
    if (!facultyId) {
      setLoadError(
        'Faculty account ID is missing. Open the faculty record from the directory and try again.',
      );

      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError('');

    try {
      const response = await api.get(
        `/v1/provisioning/faculty/${encodeURIComponent(facultyId)}`,
        { signal },
      );

      const data = getResponseData(response);
      const fetchedFaculty = normalizeFaculty(data);

      if (!fetchedFaculty?.id && !fetchedFaculty?._id) {
        throw new Error(
          'The server did not return the requested faculty account.',
        );
      }

      setFaculty(fetchedFaculty);
      setForm(getInitialForm(fetchedFaculty));
    } catch (error) {
      if (error.name === 'CanceledError' || error.name === 'AbortError') {
        return;
      }

      setLoadError(
        getErrorMessage(
          error,
          'Unable to load faculty details. Please try again.',
        ),
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [facultyId]);

  useEffect(() => {
    const controller = new AbortController();

    loadFaculty(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadFaculty]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: '',
      form: '',
    }));

    setNotice('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSaving || isLoading || !facultyId) {
      return;
    }

    setErrors({});
    setNotice('');

    const validationErrors = validateForm(form);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload = {
      institutionalId: form.institutionalId.trim().toUpperCase(),
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
    };

    const original = {
      institutionalId: faculty?.institutionalId ?? '',
      fullName: faculty?.fullName ?? '',
      email: (faculty?.email ?? '').toLowerCase(),
    };

    const changedFields = {};

    if (payload.institutionalId !== original.institutionalId) {
      changedFields.institutionalId = payload.institutionalId;
    }

    if (payload.fullName !== original.fullName) {
      changedFields.fullName = payload.fullName;
    }

    if (payload.email !== original.email) {
      changedFields.email = payload.email;
    }

    if (Object.keys(changedFields).length === 0) {
      setNotice('No changes to save.');
      return;
    }

    setIsSaving(true);

    try {
      const response = await api.patch(
        `/v1/provisioning/faculty/${encodeURIComponent(facultyId)}`,
        changedFields,
      );

      const data = getResponseData(response);
      const updatedFaculty = normalizeFaculty(data);

      if (!updatedFaculty?.id && !updatedFaculty?._id) {
        throw new Error(
          'The server did not return the updated faculty account.',
        );
      }

      setFaculty(updatedFaculty);
      setForm(getInitialForm(updatedFaculty));

      setNotice(
        data.message || 'Faculty details updated successfully.',
      );
    } catch (error) {
      setErrors({
        form: getErrorMessage(
          error,
          'Unable to save faculty details. Please try again.',
        ),
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    navigate('/hod/faculty');
  }

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Edit Faculty Details"
        description="Update the institutional identity and contact information of a faculty member in your department."
        breadcrumbs={[
          {
            label: 'HOD Dashboard',
            to: '/hod/dashboard',
          },
          {
            label: 'Faculty Management',
            to: '/hod/faculty',
          },
          {
            label: 'Edit Faculty',
          },
        ]}
      />

      {isLoading && (
        <div
          role="status"
          aria-live="polite"
          className="mb-5 rounded-xl border border-[#343640] bg-[#1D1F27] p-4 text-sm text-[#A5A6B0]"
        >
          Loading faculty details...
        </div>
      )}

      {!isLoading && loadError && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-5"
        >
          <p className="text-sm font-semibold text-rose-200">
            Faculty details unavailable
          </p>

          <p className="mt-2 text-sm leading-6 text-rose-100/90">
            {loadError}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {facultyId && (
              <ActionButton
                type="button"
                variant="secondary"
                onClick={() => loadFaculty()}
              >
                Retry
              </ActionButton>
            )}

            <Link to="/hod/faculty">
              <ActionButton variant="secondary">
                Return to Directory
              </ActionButton>
            </Link>
          </div>
        </div>
      )}

      {!loadError && faculty && (
        <>
          {notice && (
            <div
              role="status"
              aria-live="polite"
              className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200"
            >
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <SectionCard
              eyebrow="ACCOUNT INFORMATION"
              title={faculty.fullName || 'Faculty Member'}
              description="Update the faculty member's institutional ID, name, and email address."
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FormField
                  label="Institutional ID"
                  name="institutionalId"
                  value={form.institutionalId}
                  onChange={handleChange}
                  placeholder="Enter institutional ID"
                  helperText="Must be unique across the institution."
                  error={errors.institutionalId}
                  required
                  autoComplete="off"
                  maxLength={50}
                  disabled={isSaving}
                />

                <FormField
                  label="Full Name"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  error={errors.fullName}
                  required
                  autoComplete="name"
                  maxLength={100}
                  disabled={isSaving}
                />

                <div className="sm:col-span-2">
                  <FormField
                    label="Institutional Email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="faculty@institution.edu"
                    helperText="Changing the email address resets its verification status."
                    error={errors.email}
                    required
                    autoComplete="email"
                    maxLength={254}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </SectionCard>

            <div className="mt-5">
              <SectionCard
                eyebrow="ACCOUNT CONTROL"
                title="Protected fields"
                description="These fields cannot be changed through the faculty edit form."
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
                    <p className="text-xs font-medium text-[#858590]">
                      Account Role
                    </p>

                    <p className="mt-2 text-sm font-semibold text-[#EAEAE6]">
                      {faculty.role || 'FACULTY'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
                    <p className="text-xs font-medium text-[#858590]">
                      Account Status
                    </p>

                    <p className="mt-2 text-sm font-semibold text-[#EAEAE6]">
                      {faculty.status || 'Not available'}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-5 text-[#858590]">
                  Department, role, account status, password, and batch or
                  section assignments are managed separately and cannot
                  be changed from this form.
                </p>
              </SectionCard>
            </div>

            {errors.form && (
              <div
                role="alert"
                aria-live="assertive"
                className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm leading-6 text-rose-200"
              >
                {errors.form}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Link
                to="/hod/faculty"
                className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-[#A5A6B0] transition-colors hover:bg-[#26272B] hover:text-[#EAEAE6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                Back to Directory
              </Link>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <ActionButton
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </ActionButton>

                <ActionButton
                  type="submit"
                  loading={isSaving}
                  disabled={isLoading || Boolean(loadError)}
                >
                  Save Changes
                </ActionButton>
              </div>
            </div>
          </form>
        </>
      )}

      <p className="mt-5 text-xs leading-5 text-[#777986]">
        Changes are saved to the backend. Email verification must be
        completed separately if the email address changes.
      </p>
    </div>
  );
}