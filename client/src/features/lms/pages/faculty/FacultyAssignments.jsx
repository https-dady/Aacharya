import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const CONTENT_TYPES = Object.freeze({
  ASSIGNMENT: 'ASSIGNMENT',
  PRACTICAL: 'PRACTICAL',
});

const STATUS_FILTERS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'closed', label: 'Closed' },
];

const TYPE_FILTERS = [
  { value: 'all', label: 'Assignments & Practicals' },
  { value: CONTENT_TYPES.ASSIGNMENT, label: 'Assignments' },
  { value: CONTENT_TYPES.PRACTICAL, label: 'Practicals' },
];

function getResponseData(response) {
  return response?.data?.data ?? response?.data ?? {};
}

function getItemId(item) {
  const id = item?.id ?? item?._id;
  return id ? String(id) : '';
}

function getContentStatus(item) {
  return String(item?.status ?? '').toLowerCase();
}

function getContentType(item) {
  return String(
    item?.contentType || CONTENT_TYPES.ASSIGNMENT,
  ).toUpperCase();
}

function getCourseTitle(item) {
  return (
    item?.course?.title
    ?? item?.courseName
    ?? item?.course?.name
    ?? '—'
  );
}

function getCourseCode(item) {
  return item?.course?.code ?? item?.courseCode ?? '';
}

function getTargetLabel(item, prefix) {
  if (typeof item === 'string') {
    return `${prefix} ${item.slice(-6)}`;
  }

  return (
    item?.name
    ?? item?.title
    ?? item?.code
    ?? `${prefix} ${getItemId(item).slice(-6)}`
  );
}

function normalizeContent(item) {
  return {
    ...item,
    id: getItemId(item),
    contentType: getContentType(item),
    courseName: getCourseTitle(item),
    courseCode: getCourseCode(item),
    batches: Array.isArray(item?.batches) ? item.batches : [],
    sections: Array.isArray(item?.sections) ? item.sections : [],
  };
}

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getStatusStyles(status) {
  switch (status) {
    case 'published':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';

    case 'closed':
      return 'border-red-500/30 bg-red-500/10 text-red-300';

    case 'draft':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';

    default:
      return 'border-[#454650] bg-[#26272B] text-[#C8C8D0]';
  }
}

function getReadableType(type) {
  return type === CONTENT_TYPES.PRACTICAL
    ? 'Practical'
    : 'Assignment';
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message
    ?? error?.response?.data?.error?.message
    ?? error?.message
    ?? fallback
  );
}

export default function FacultyAssignments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/v1/assignments/manage', {
        params: {
          page: 1,
          limit: 100,
        },
      });

      const data = getResponseData(response);
      const records = Array.isArray(data.items) ? data.items : [];

      setItems(records.map(normalizeContent));
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          'Assignments and practicals could not be loaded.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !query
        || [
          item.title,
          item.description,
          item.courseName,
          item.courseCode,
          item.contentType,
          ...item.batches.map((batch) => getTargetLabel(batch, 'Batch')),
          ...item.sections.map((section) => getTargetLabel(section, 'Section')),
        ].some((value) =>
          String(value ?? '').toLowerCase().includes(query),
        );

      const matchesStatus =
        selectedStatus === 'all'
        || getContentStatus(item) === selectedStatus;

      const matchesType =
        selectedType === 'all'
        || getContentType(item) === selectedType;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [items, searchTerm, selectedStatus, selectedType]);

  const statistics = useMemo(() => ({
    total: items.length,

    published: items.filter(
      (item) => getContentStatus(item) === 'published',
    ).length,

    drafts: items.filter(
      (item) => getContentStatus(item) === 'draft',
    ).length,

    practicals: items.filter(
      (item) => getContentType(item) === CONTENT_TYPES.PRACTICAL,
    ).length,
  }), [items]);

  function clearFilters() {
    setSearchTerm('');
    setSelectedStatus('all');
    setSelectedType('all');
  }

  const hasActiveFilters =
    Boolean(searchTerm.trim())
    || selectedStatus !== 'all'
    || selectedType !== 'all';

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title="Assignments & Practicals"
        description="Manage coursework and practical activities for subjects assigned to you."
        breadcrumbs={[
          {
            label: 'Faculty Dashboard',
            to: '/faculty/dashboard',
          },
          {
            label: 'Assignments & Practicals',
          },
        ]}
        actions={
          <div className="flex flex-wrap gap-3">
            <ActionButton
              variant="secondary"
              onClick={loadContent}
              loading={loading}
            >
              Refresh
            </ActionButton>

            <Link
              to="/faculty/assignments/new"
              className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
            >
              <ActionButton>
                Create New
              </ActionButton>
            </Link>
          </div>
        }
      />

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4"
        >
          <p className="text-sm leading-6 text-rose-200">
            {error}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#C8A8A8]">
            If the request returns an authorization or server error, the
            backend route, authenticated role, and course assignment should
            be checked before changing the UI.
          </p>

          <div className="mt-3">
            <ActionButton
              variant="secondary"
              onClick={loadContent}
              loading={loading}
            >
              Try Again
            </ActionButton>
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-2xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Total Content
          </p>

          <p className="mt-3 text-3xl font-semibold text-[#EAEAE6]">
            {loading ? '—' : statistics.total}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#777986]">
            Assignments and practicals
          </p>
        </section>

        <section className="rounded-2xl border border-emerald-500/20 bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Published
          </p>

          <p className="mt-3 text-3xl font-semibold text-emerald-300">
            {loading ? '—' : statistics.published}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#777986]">
            Published content
          </p>
        </section>

        <section className="rounded-2xl border border-amber-500/20 bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Drafts
          </p>

          <p className="mt-3 text-3xl font-semibold text-amber-200">
            {loading ? '—' : statistics.drafts}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#777986]">
            Saved but not published
          </p>
        </section>

        <section className="rounded-2xl border border-[#CDB5F7]/20 bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Practicals
          </p>

          <p className="mt-3 text-3xl font-semibold text-[#CDB5F7]">
            {loading ? '—' : statistics.practicals}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#777986]">
            Practical coursework
          </p>
        </section>
      </div>

      <SectionCard
        eyebrow="CONTENT DIRECTORY"
        title="Your Assignments & Practicals"
        description="Search and filter content associated with your account."
      >
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SearchInput
              name="facultyContentSearch"
              label="Search content"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search title, course, batch, or section..."
            />

            <div>
              <label
                htmlFor="faculty-content-type"
                className="mb-2 block text-sm font-medium text-[#D0D0D8]"
              >
                Content Type
              </label>

              <select
                id="faculty-content-type"
                value={selectedType}
                onChange={(event) => setSelectedType(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none transition-colors focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
              >
                {TYPE_FILTERS.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="faculty-content-status"
                className="mb-2 block text-sm font-medium text-[#D0D0D8]"
              >
                Status
              </label>

              <select
                id="faculty-content-status"
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none transition-colors focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
              >
                {STATUS_FILTERS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4">
            <p
              className="text-sm text-[#9697A2]"
              aria-live="polite"
            >
              Showing {filteredItems.length} of {items.length} records
            </p>

            {hasActiveFilters && (
              <ActionButton
                variant="secondary"
                size="sm"
                onClick={clearFilters}
              >
                Clear Filters
              </ActionButton>
            )}
          </div>

          {loading ? (
            <div
              role="status"
              className="rounded-xl border border-[#343640] bg-[#191A21] p-8 text-center text-sm text-[#9697A2]"
            >
              Loading assignments and practicals...
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              title={
                hasActiveFilters
                  ? 'No matching content'
                  : 'No assignments or practicals available'
              }
              description={
                hasActiveFilters
                  ? 'Try another search term or change the selected filters.'
                  : 'Create content for a course assigned to you. Your saved records will appear here.'
              }
              action={
                hasActiveFilters ? (
                  <ActionButton
                    variant="secondary"
                    onClick={clearFilters}
                  >
                    Reset Filters
                  </ActionButton>
                ) : (
                  <Link
                    to="/faculty/assignments/new"
                    className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                  >
                    <ActionButton>
                      Create New
                    </ActionButton>
                  </Link>
                )
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <caption className="sr-only">
                  Faculty assignment and practical directory
                </caption>

                <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Title
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Type
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Course
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Batch / Section
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Due Date
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Marks
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {filteredItems.map((item, index) => {
                    const status = getContentStatus(item);
                    const type = getContentType(item);

                    const targetNames = [
                      ...item.batches.map((batch) =>
                        getTargetLabel(batch, 'Batch'),
                      ),
                      ...item.sections.map((section) =>
                        getTargetLabel(section, 'Section'),
                      ),
                    ];

                    return (
                      <tr
                        key={item.id || index}
                        className="bg-[#191A21] transition-colors hover:bg-[#202129]"
                      >
                        <td className="px-4 py-4">
                          <p className="font-medium text-[#EAEAE6]">
                            {item.title || 'Untitled'}
                          </p>

                          {item.description && (
                            <p className="mt-1 max-w-xs truncate text-xs text-[#9697A2]">
                              {item.description}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full border border-[#454650] bg-[#26272B] px-2.5 py-1 text-xs text-[#D0D0D8]">
                            {getReadableType(type)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          <p>{item.courseName}</p>

                          {item.courseCode && (
                            <p className="mt-1 text-xs text-[#9697A2]">
                              {item.courseCode}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {targetNames.length > 0
                            ? targetNames.join(', ')
                            : 'Course targets'}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-[#D0D0D8]">
                          {formatDate(item.dueDate)}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {item.totalMarks ?? '—'}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={[
                              'inline-flex rounded-full border px-2.5 py-1',
                              'text-xs font-medium',
                              getStatusStyles(status),
                            ].join(' ')}
                          >
                            {status
                              ? status.charAt(0).toUpperCase() + status.slice(1)
                              : 'Unknown'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SectionCard>

      <section className="mt-5 rounded-2xl border border-[#343640] bg-[#191A21] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-[#CDB5F7]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-5 w-5"
            >
              <path
                d="M8 4h8M8 8h8M8 12h5"
                strokeLinecap="round"
              />
              <path
                d="M6 2.75h9.5L20 7.25v13A1.75 1.75 0 0 1 18.25 22h-12A1.75 1.75 0 0 1 4.5 20.25V4.5A1.75 1.75 0 0 1 6.25 2.75Z"
                strokeLinejoin="round"
              />
              <path
                d="M14.5 3v4.5H19"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#EAEAE6]">
              Common content workflow
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#9697A2]">
              Assignments and practicals use the same backend record structure.
              The selected content type distinguishes the workflow. Editing,
              publishing, direct file uploads, and student submission review
              will be connected in their respective steps.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}