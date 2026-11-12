import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import assignmentManagementService from '../../services/assignmentManagementService.js';
import courseManagementService from '../../services/courseManagementService.js';

const PAGE_SIZE = 20;
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const CONTENT_TYPES = {
  ASSIGNMENT: 'ASSIGNMENT',
  PRACTICAL: 'PRACTICAL',
};

const CONTENT_STATUSES = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
};

const ALLOWED_FILE_EXTENSION =
  /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt)$/i;

const INITIAL_FORM = {
  title: '',
  contentType: CONTENT_TYPES.ASSIGNMENT,
  description: '',
  courseId: '',
  batchIds: [],
  sectionIds: [],
  dueDate: '',
  totalMarks: '10',
  status: CONTENT_STATUSES.DRAFT,
  attachmentUrls: [],
};

const inputClassName = [
  'min-h-11 w-full rounded-xl border border-[#454650]',
  'bg-[#191A21] px-3 py-2.5 text-sm text-[#EAEAE6]',
  'placeholder:text-[#777986]',
  'outline-none transition-colors',
  'focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function getId(item) {
  if (!item) {
    return '';
  }

  if (typeof item === 'string') {
    return item;
  }

  return String(item.id ?? item._id ?? '');
}

function getReferenceLabel(item, fallback) {
  if (!item) {
    return fallback;
  }

  if (typeof item === 'string') {
    return `${fallback} ${item.slice(-6)}`;
  }

  return (
    item.name ||
    item.title ||
    item.code ||
    fallback
  );
}

function normalizeIds(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map(getId).filter(Boolean);
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

function toDateTimeLocal(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  date.setMinutes(
    date.getMinutes() - date.getTimezoneOffset(),
  );

  return date.toISOString().slice(0, 16);
}

function getDefaultDueDate() {
  const date = new Date();

  date.setDate(date.getDate() + 7);

  return toDateTimeLocal(date);
}

function FieldLabel({
  children,
  htmlFor,
  required = false,
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-sm font-medium text-[#D0D0D8]"
    >
      {children}

      {required && (
        <span className="ml-1 text-[#CDB5F7]" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

function StatusBadge({ status }) {
  const normalizedStatus = String(
    status || 'UNKNOWN',
  ).toUpperCase();

  const styles = {
    DRAFT:
      'border-[#777986]/40 bg-[#777986]/10 text-[#C8C8D0]',

    PUBLISHED:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',

    CLOSED:
      'border-amber-400/30 bg-amber-400/10 text-amber-200',
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        styles[normalizedStatus] ||
        'border-[#454650] text-[#C8C8D0]'
      }`}
    >
      {normalizedStatus}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  description,
}) {
  return (
    <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
      <p className="text-sm text-[#9697A2]">
        {label}
      </p>

      <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
        {value}
      </p>

      <p className="mt-2 text-xs text-[#777986]">
        {description}
      </p>
    </div>
  );
}

export default function AssignmentOverview() {
  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(true);

  const [error, setError] = useState('');
  const [coursesError, setCoursesError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);

  const [form, setForm] = useState(INITIAL_FORM);

  const [refreshVersion, setRefreshVersion] = useState(0);

  const selectedCourse = useMemo(
    () =>
      courses.find(
        (course) => course.id === form.courseId,
      ) || null,
    [courses, form.courseId],
  );

  const availableBatches = useMemo(
    () =>
      Array.isArray(selectedCourse?.batches)
        ? selectedCourse.batches
        : [],
    [selectedCourse],
  );

  const availableSections = useMemo(
    () =>
      Array.isArray(selectedCourse?.sections)
        ? selectedCourse.sections
        : [],
    [selectedCourse],
  );

  const statistics = useMemo(
    () => ({
      total: pagination.total,

      assignments: items.filter(
        (item) =>
          item.contentType === CONTENT_TYPES.ASSIGNMENT,
      ).length,

      practicals: items.filter(
        (item) =>
          item.contentType === CONTENT_TYPES.PRACTICAL,
      ).length,

      published: items.filter(
        (item) =>
          item.status === CONTENT_STATUSES.PUBLISHED,
      ).length,
    }),
    [items, pagination.total],
  );

  const loadAssignments = useCallback(async (signal) => {
    setLoading(true);
    setError('');

    try {
      const result =
        await assignmentManagementService.listAssignments(
          {
            page: pagination.page,
            limit: pagination.limit,
            search: searchTerm.trim() || undefined,
            contentType:
              contentTypeFilter !== 'ALL'
                ? contentTypeFilter
                : undefined,
            status:
              statusFilter !== 'ALL'
                ? statusFilter
                : undefined,
          },
          { signal },
        );

      if (signal.aborted) {
        return;
      }

      setItems(result.items);
      setPagination(result.pagination);
    } catch (requestError) {
      if (
        signal.aborted ||
        requestError?.code === 'ERR_CANCELED'
      ) {
        return;
      }

      setItems([]);

      setError(
        getErrorMessage(
          requestError,
          'Assignments and practicals could not be loaded.',
        ),
      );
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [
    pagination.page,
    pagination.limit,
    searchTerm,
    contentTypeFilter,
    statusFilter,
  ]);

  const loadCourses = useCallback(async (signal) => {
    setCoursesLoading(true);
    setCoursesError('');

    try {
      const result =
        await courseManagementService.listCourses(
          {
            page: 1,
            limit: 100,
            status: 'ACTIVE',
          },
          { signal },
        );

      if (signal.aborted) {
        return;
      }

      setCourses(result.courses);
    } catch (requestError) {
      if (
        signal.aborted ||
        requestError?.code === 'ERR_CANCELED'
      ) {
        return;
      }

      setCourses([]);

      setCoursesError(
        getErrorMessage(
          requestError,
          'Unable to load active department courses.',
        ),
      );
    } finally {
      if (!signal.aborted) {
        setCoursesLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        loadAssignments(controller.signal);
        loadCourses(controller.signal);
      }
    });

    return () => {
      controller.abort();
    };
  }, [
    loadAssignments,
    loadCourses,
    refreshVersion,
  ]);

  const filteredStatistics = useMemo(
    () => ({
      assignments: items.filter(
        (item) =>
          item.contentType === CONTENT_TYPES.ASSIGNMENT,
      ).length,

      practicals: items.filter(
        (item) =>
          item.contentType === CONTENT_TYPES.PRACTICAL,
      ).length,

      published: items.filter(
        (item) =>
          item.status === CONTENT_STATUSES.PUBLISHED,
      ).length,
    }),
    [items],
  );

  const resetForm = useCallback(() => {
    setForm({
      ...INITIAL_FORM,
      dueDate: getDefaultDueDate(),
    });

    setSelectedFiles([]);
    setExistingAttachments([]);
    setFormError('');
    setShowForm(false);
  }, []);

  const updateField = useCallback((event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setFormError('');
    setNotice('');
  }, []);

  const handleCourseChange = useCallback((event) => {
    setForm((current) => ({
      ...current,
      courseId: event.target.value,
      batchIds: [],
      sectionIds: [],
    }));

    setFormError('');
  }, []);

  const updateTargetSelection = useCallback(
    (event, fieldName) => {
      const selectedIds = Array.from(
        event.target.selectedOptions,
        (option) => option.value,
      );

      setForm((current) => ({
        ...current,
        [fieldName]: selectedIds,
      }));

      setFormError('');
    },
    [],
  );

  const updateAttachmentUrl = useCallback(
    (index, field, value) => {
      setForm((current) => ({
        ...current,
        attachmentUrls: current.attachmentUrls.map(
          (attachment, attachmentIndex) =>
            attachmentIndex === index
              ? {
                  ...attachment,
                  [field]: value,
                }
              : attachment,
        ),
      }));

      setFormError('');
    },
    [],
  );

  const addAttachmentUrl = useCallback(() => {
    setForm((current) => ({
      ...current,
      attachmentUrls: [
        ...current.attachmentUrls,
        {
          name: '',
          url: '',
        },
      ],
    }));
  }, []);

  const removeAttachmentUrl = useCallback((index) => {
    setForm((current) => ({
      ...current,
      attachmentUrls: current.attachmentUrls.filter(
        (_, attachmentIndex) =>
          attachmentIndex !== index,
      ),
    }));
  }, []);

  const handleFileSelection = useCallback((event) => {
    const incomingFiles = Array.from(
      event.target.files || [],
    );

    const combinedFiles = [
      ...selectedFiles,
      ...incomingFiles,
    ];

    const uniqueFiles = combinedFiles.filter(
      (file, index, allFiles) =>
        allFiles.findIndex(
          (candidate) =>
            candidate.name === file.name &&
            candidate.size === file.size &&
            candidate.lastModified === file.lastModified,
        ) === index,
    );

    if (uniqueFiles.length > MAX_FILES) {
      setFormError(
        `You can upload a maximum of ${MAX_FILES} files.`,
      );

      event.target.value = '';
      return;
    }

    const invalidFile = uniqueFiles.find(
      (file) =>
        file.size > MAX_FILE_SIZE ||
        !ALLOWED_FILE_EXTENSION.test(file.name),
    );

    if (invalidFile) {
      setFormError(
        invalidFile.size > MAX_FILE_SIZE
          ? `${invalidFile.name} exceeds the 10 MB per-file limit.`
          : `${invalidFile.name} has an unsupported file format.`,
      );

      event.target.value = '';
      return;
    }

    setSelectedFiles(uniqueFiles);
    setFormError('');

    event.target.value = '';
  }, [selectedFiles]);

  const removeSelectedFile = useCallback((index) => {
    setSelectedFiles((current) =>
      current.filter(
        (_, fileIndex) => fileIndex !== index,
      ),
    );
  }, []);

  const removeExistingAttachment = useCallback((index) => {
    setExistingAttachments((current) =>
      current.filter(
        (_, attachmentIndex) =>
          attachmentIndex !== index,
      ),
    );
  }, []);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();

    setFormError('');
    setNotice('');

    if (!form.title.trim()) {
      setFormError('Enter an assignment or practical title.');
      return;
    }

    if (!form.courseId) {
      setFormError('Select a course.');
      return;
    }

    if (!form.description.trim()) {
      setFormError('Enter the assignment description.');
      return;
    }

    const dueDate = new Date(form.dueDate);

    if (
      !form.dueDate ||
      Number.isNaN(dueDate.getTime()) ||
      dueDate.getTime() <= Date.now()
    ) {
      setFormError('Choose a future submission deadline.');
      return;
    }

    const totalMarks = Number(form.totalMarks);

    if (
      !Number.isFinite(totalMarks) ||
      totalMarks < 1 ||
      totalMarks > 10000
    ) {
      setFormError(
        'Total marks must be between 1 and 10000.',
      );
      return;
    }

    if (
      selectedFiles.length > MAX_FILES
    ) {
      setFormError(
        `You can upload a maximum of ${MAX_FILES} files.`,
      );
      return;
    }

    const urlAttachments = [];

    for (const attachment of form.attachmentUrls) {
      const name = attachment.name.trim();
      const rawUrl = attachment.url.trim();

      if (!name && !rawUrl) {
        continue;
      }

      if (!name || !rawUrl) {
        setFormError(
          'Provide both a name and URL for each material link.',
        );
        return;
      }

      try {
        const parsedUrl = new URL(rawUrl);

        if (
          !['http:', 'https:'].includes(parsedUrl.protocol)
        ) {
          throw new Error();
        }

        urlAttachments.push({
          name,
          url: parsedUrl.toString(),
          mimeType: '',
          size: 0,
        });
      } catch {
        setFormError(
          `Enter a valid HTTP or HTTPS URL for "${name}".`,
        );
        return;
      }
    }

    const payload = {
      title: form.title.trim(),
      contentType: form.contentType,
      description: form.description.trim(),
      courseId: form.courseId,
      batchIds: form.batchIds,
      sectionIds: form.sectionIds,
      dueDate: dueDate.toISOString(),
      totalMarks,
      status: form.status,
      attachments: [
        ...existingAttachments,
        ...urlAttachments,
      ],
    };

    setSubmitting(true);

    try {
      await assignmentManagementService.createAssignment(
        payload,
        selectedFiles,
      );

      setNotice(
        form.contentType === CONTENT_TYPES.PRACTICAL
          ? 'Practical created successfully.'
          : 'Assignment created successfully.',
      );

      resetForm();

      setPagination((current) => ({
        ...current,
        page: 1,
      }));

      setSearchTerm('');
      setContentTypeFilter('ALL');
      setStatusFilter('ALL');

      setRefreshVersion((current) => current + 1);
    } catch (requestError) {
      setFormError(
        getErrorMessage(
          requestError,
          'The assignment could not be saved.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    form,
    selectedFiles,
    existingAttachments,
    resetForm,
  ]);

  const handleRefresh = useCallback(() => {
    setRefreshVersion((current) => current + 1);
  }, []);

  const handlePageChange = useCallback((nextPage) => {
    setPagination((current) => ({
      ...current,
      page: nextPage,
    }));
  }, []);

  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }, []);

  const handleContentTypeChange = useCallback((event) => {
    setContentTypeFilter(event.target.value);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }, []);

  const handleStatusChange = useCallback((event) => {
    setStatusFilter(event.target.value);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }, []);

  const showingStart = pagination.total === 0
    ? 0
    : ((pagination.page - 1) * pagination.limit) + 1;

  const showingEnd = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  return (
    <div className="mx-auto w-full max-w-[1300px] space-y-6">
      <PageHeader
        eyebrow="ACADEMIC OVERSIGHT"
        title="Assignments & Practicals"
        description="Create and manage course assignments and practical work for your department."
        breadcrumbs={[
          {
            label: 'HOD Dashboard',
            to: '/hod/dashboard',
          },
          {
            label: 'Academic Oversight',
          },
          {
            label: 'Assignments & Practicals',
          },
        ]}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link to="/hod/courses">
              <ActionButton variant="secondary">
                View Courses
              </ActionButton>
            </Link>

            <ActionButton
              onClick={() => {
                if (showForm) {
                  resetForm();
                  return;
                }

                setForm({
                  ...INITIAL_FORM,
                  dueDate: getDefaultDueDate(),
                });

                setShowForm(true);
                setFormError('');
                setNotice('');
              }}
            >
              {showForm ? 'Close Form' : 'Create New'}
            </ActionButton>
          </div>
        }
      />

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
        >
          {notice}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Content"
          value={loading ? '—' : statistics.total}
          description="Department assignments and practicals"
        />

        <SummaryCard
          label="Assignments"
          value={loading ? '—' : filteredStatistics.assignments}
          description="Records on the current page"
        />

        <SummaryCard
          label="Practicals"
          value={loading ? '—' : filteredStatistics.practicals}
          description="Records on the current page"
        />

        <SummaryCard
          label="Published"
          value={loading ? '—' : filteredStatistics.published}
          description="Published records on the current page"
        />
      </div>

      {/* Create Form */}
      {showForm && (
        <SectionCard
          eyebrow="CONTENT CREATION"
          title="Create Assignment or Practical"
          description="Configure the academic content, target groups, deadline, marks, and supporting material."
        >
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"
              >
                {formError}
              </div>
            )}

            {coursesError && (
              <div
                role="alert"
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200"
              >
                {coursesError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="contentType" required>
                  Content Type
                </FieldLabel>

                <select
                  id="contentType"
                  name="contentType"
                  value={form.contentType}
                  onChange={updateField}
                  className={inputClassName}
                  required
                >
                  <option value="ASSIGNMENT">
                    Assignment
                  </option>

                  <option value="PRACTICAL">
                    Practical
                  </option>
                </select>
              </div>

              <div>
                <FieldLabel htmlFor="courseId" required>
                  Course / Subject
                </FieldLabel>

                <select
                  id="courseId"
                  name="courseId"
                  value={form.courseId}
                  onChange={handleCourseChange}
                  className={inputClassName}
                  disabled={coursesLoading}
                  required
                >
                  <option value="">
                    {coursesLoading
                      ? 'Loading courses...'
                      : 'Select a course'}
                  </option>

                  {courses.map((course) => (
                    <option
                      key={course.id}
                      value={course.id}
                    >
                      {course.title}
                      {course.code ? ` (${course.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <FieldLabel htmlFor="title" required>
                  Title
                </FieldLabel>

                <input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={updateField}
                  className={inputClassName}
                  placeholder="Enter assignment or practical title"
                  minLength={2}
                  maxLength={200}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel htmlFor="description" required>
                  Instructions / Description
                </FieldLabel>

                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  className={`${inputClassName} min-h-32 resize-y`}
                  placeholder="Enter questions, procedure, instructions, and submission requirements."
                  maxLength={10000}
                  required
                />
              </div>

              <div>
                <FieldLabel htmlFor="dueDate" required>
                  Submission Deadline
                </FieldLabel>

                <input
                  id="dueDate"
                  name="dueDate"
                  type="datetime-local"
                  value={form.dueDate}
                  onChange={updateField}
                  className={inputClassName}
                  required
                />
              </div>

              <div>
                <FieldLabel htmlFor="totalMarks" required>
                  Maximum Marks
                </FieldLabel>

                <input
                  id="totalMarks"
                  name="totalMarks"
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  value={form.totalMarks}
                  onChange={updateField}
                  className={inputClassName}
                  required
                />
              </div>

              <div>
                <FieldLabel htmlFor="status" required>
                  Publication Status
                </FieldLabel>

                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={updateField}
                  className={inputClassName}
                >
                  <option value="DRAFT">
                    Save as Draft
                  </option>

                  <option value="PUBLISHED">
                    Publish
                  </option>

                  <option value="CLOSED">
                    Closed
                  </option>
                </select>
              </div>

              <div>
                <FieldLabel htmlFor="batchIds">
                  Target Batches
                </FieldLabel>

                <select
                  id="batchIds"
                  name="batchIds"
                  multiple
                  value={form.batchIds}
                  onChange={(event) =>
                    updateTargetSelection(event, 'batchIds')
                  }
                  className={`${inputClassName} min-h-28`}
                  disabled={
                    !selectedCourse ||
                    availableBatches.length === 0
                  }
                >
                  {availableBatches.map((batch, index) => {
                    const id = getId(batch);

                    return (
                      <option
                        key={id || index}
                        value={id}
                        disabled={!id}
                      >
                        {getReferenceLabel(batch, 'Batch')}
                      </option>
                    );
                  })}
                </select>

                <p className="mt-2 text-xs text-[#9697A2]">
                  Hold Ctrl or Cmd to select multiple batches.
                  Leave empty for no additional batch restriction.
                </p>
              </div>

              <div>
                <FieldLabel htmlFor="sectionIds">
                  Target Sections
                </FieldLabel>

                <select
                  id="sectionIds"
                  name="sectionIds"
                  multiple
                  value={form.sectionIds}
                  onChange={(event) =>
                    updateTargetSelection(event, 'sectionIds')
                  }
                  className={`${inputClassName} min-h-28`}
                  disabled={
                    !selectedCourse ||
                    availableSections.length === 0
                  }
                >
                  {availableSections.map((section, index) => {
                    const id = getId(section);

                    return (
                      <option
                        key={id || index}
                        value={id}
                        disabled={!id}
                      >
                        {getReferenceLabel(section, 'Section')}
                      </option>
                    );
                  })}
                </select>

                <p className="mt-2 text-xs text-[#9697A2]">
                  Hold Ctrl or Cmd to select multiple sections.
                </p>
              </div>
            </div>

            {/* URL Attachments */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#EAEAE6]">
                    Material Links
                  </h3>

                  <p className="mt-1 text-xs text-[#9697A2]">
                    Add external learning resources or reference documents.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addAttachmentUrl}
                  className="rounded-lg border border-[#CDB5F7]/30 px-3 py-2 text-xs font-semibold text-[#CDB5F7] transition hover:bg-[#CDB5F7]/10"
                >
                  Add Link
                </button>
              </div>

              {form.attachmentUrls.map((attachment, index) => (
                <div
                  key={`attachment-url-${index}`}
                  className="grid grid-cols-1 gap-3 rounded-xl border border-[#343640] bg-[#191A21] p-3 md:grid-cols-[1fr_2fr_auto]"
                >
                  <input
                    type="text"
                    value={attachment.name}
                    onChange={(event) =>
                      updateAttachmentUrl(
                        index,
                        'name',
                        event.target.value,
                      )
                    }
                    placeholder="Material name"
                    maxLength={255}
                    className={inputClassName}
                  />

                  <input
                    type="url"
                    value={attachment.url}
                    onChange={(event) =>
                      updateAttachmentUrl(
                        index,
                        'url',
                        event.target.value,
                      )
                    }
                    placeholder="https://example.com/resource"
                    className={inputClassName}
                  />

                  <button
                    type="button"
                    onClick={() => removeAttachmentUrl(index)}
                    className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-500/10"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* File Uploads */}
            <div>
              <FieldLabel htmlFor="assignmentFiles">
                Upload Attachments
              </FieldLabel>

              <input
                id="assignmentFiles"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                onChange={handleFileSelection}
                className="block w-full rounded-xl border border-[#454650] bg-[#191A21] p-3 text-sm text-[#C7C7D0] file:mr-4 file:rounded-lg file:border-0 file:bg-[#CDB5F7] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#191A21]"
              />

              <p className="mt-2 text-xs text-[#9697A2]">
                Maximum 5 new files per request, 10 MB per file.
                Supported: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX and TXT.
              </p>

              {selectedFiles.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {selectedFiles.map((file, index) => (
                    <li
                      key={`${file.name}-${file.lastModified}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#343640] bg-[#191A21] p-3"
                    >
                      <div>
                        <p className="break-all text-sm text-[#EAEAE6]">
                          {file.name}
                        </p>

                        <p className="mt-1 text-xs text-[#9697A2]">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeSelectedFile(index)}
                        className="text-xs font-medium text-red-300 hover:text-red-200"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-[#343640] pt-5">
              <ActionButton
                type="button"
                variant="secondary"
                onClick={resetForm}
                disabled={submitting}
              >
                Cancel
              </ActionButton>

              <ActionButton
                type="submit"
                loading={submitting}
              >
                Create {form.contentType === 'PRACTICAL'
                  ? 'Practical'
                  : 'Assignment'}
              </ActionButton>
            </div>
          </form>
        </SectionCard>
      )}

      {/* Assignment Directory */}
      <SectionCard
        eyebrow="DEPARTMENT CONTENT"
        title="Assignments & Practicals"
        description="Browse and manage department academic content."
      >
        <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <SearchInput
              name="assignmentSearch"
              label="Search content"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search title, description or course..."
            />
          </div>

          <div>
            <FieldLabel htmlFor="contentTypeFilter">
              Content Type
            </FieldLabel>

            <select
              id="contentTypeFilter"
              value={contentTypeFilter}
              onChange={handleContentTypeChange}
              className={inputClassName}
            >
              <option value="ALL">All Types</option>
              <option value="ASSIGNMENT">Assignments</option>
              <option value="PRACTICAL">Practicals</option>
            </select>
          </div>

          <div>
            <FieldLabel htmlFor="statusFilter">
              Status
            </FieldLabel>

            <select
              id="statusFilter"
              value={statusFilter}
              onChange={handleStatusChange}
              className={inputClassName}
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        <div className="mb-5 flex justify-end">
          <ActionButton
            variant="secondary"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </ActionButton>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-5"
          >
            <p className="text-sm leading-6 text-red-200">
              {error}
            </p>

            <button
              type="button"
              onClick={handleRefresh}
              className="mt-3 text-sm font-semibold text-red-200 underline underline-offset-4"
            >
              Try Again
            </button>
          </div>
        ) : loading ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-[#343640] bg-[#191A21] px-5 py-12 text-center"
          >
            <p className="text-sm text-[#C7C7D0]">
              Loading assignments and practicals...
            </p>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No matching academic content"
            description="Create an assignment or practical, or change your search and filters."
            action={
              <ActionButton
                onClick={() => {
                  setForm({
                    ...INITIAL_FORM,
                    dueDate: getDefaultDueDate(),
                  });

                  setShowForm(true);
                }}
              >
                Create New
              </ActionButton>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[1000px] text-left text-sm">
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
                      Batches / Sections
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

                    <th scope="col" className="px-4 py-3 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="bg-[#191A21] transition hover:bg-[#202129]"
                    >
                      <td className="px-4 py-4">
                        <p className="font-medium text-[#EAEAE6]">
                          {item.title}
                        </p>

                        <p className="mt-1 line-clamp-2 max-w-xs text-xs text-[#9697A2]">
                          {item.description}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-md border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 px-2 py-1 text-xs font-medium text-[#CDB5F7]">
                          {item.contentType}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-[#EAEAE6]">
                          {item.course?.title || '—'}
                        </p>

                        <p className="mt-1 text-xs text-[#9697A2]">
                          {item.course?.code || ''}
                        </p>
                      </td>

                      <td className="max-w-52 px-4 py-4">
                        <p className="text-xs text-[#C7C7D0]">
                          {item.batches.length > 0
                            ? item.batches
                                .map((batch) =>
                                  getReferenceLabel(batch, 'Batch'),
                                )
                                .join(', ')
                            : 'All assigned batches'}
                        </p>

                        <p className="mt-1 text-xs text-[#9697A2]">
                          {item.sections.length > 0
                            ? item.sections
                                .map((section) =>
                                  getReferenceLabel(section, 'Section'),
                                )
                                .join(', ')
                            : 'All assigned sections'}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-[#C7C7D0]">
                        {formatDate(item.dueDate)}
                      </td>

                      <td className="px-4 py-4 text-[#C7C7D0]">
                        {item.totalMarks}
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            to="/hod/assignments/details"
                            state={{ assignment: item }}
                            className="rounded-lg border border-[#454650] px-3 py-2 text-xs font-medium text-[#EAEAE6] transition hover:bg-[#343640]"
                          >
                            View
                          </Link>

                          <Link
                            to="/hod/assignments/edit"
                            state={{ assignment: item }}
                            className="rounded-lg border border-[#CDB5F7]/30 px-3 py-2 text-xs font-medium text-[#CDB5F7] transition hover:bg-[#CDB5F7]/10"
                          >
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#9697A2]">
                Showing{' '}
                <span className="font-medium text-[#EAEAE6]">
                  {showingStart}–{showingEnd}
                </span>{' '}
                of{' '}
                <span className="font-medium text-[#EAEAE6]">
                  {pagination.total}
                </span>{' '}
                records
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handlePageChange(pagination.page - 1)
                  }
                  disabled={pagination.page <= 1 || loading}
                  className="rounded-lg border border-[#454650] px-3 py-2 text-sm text-[#EAEAE6] transition hover:bg-[#343640] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="px-2 text-sm text-[#C7C7D0]">
                  Page {pagination.page} of{' '}
                  {Math.max(pagination.totalPages, 1)}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    handlePageChange(pagination.page + 1)
                  }
                  disabled={
                    pagination.page >= pagination.totalPages ||
                    loading
                  }
                  className="rounded-lg border border-[#454650] px-3 py-2 text-sm text-[#EAEAE6] transition hover:bg-[#343640] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}