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

const CONTENT_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
});

const INITIAL_FORM = {
  title: '',
  contentType: CONTENT_TYPES.ASSIGNMENT,
  description: '',
  courseId: '',
  batchIds: [],
  sectionIds: [],
  dueDate: '',
  totalMarks: '10',
  attachmentName: '',
  attachmentUrl: '',
};

function getResponseData(response) {
  return response?.data?.data ?? response?.data ?? {};
}

function getItemId(item) {
  const id = item?.id ?? item?._id;
  return id ? String(id) : '';
}

function getCourseTitle(course) {
  return course?.title
    ?? course?.name
    ?? course?.courseName
    ?? 'Untitled course';
}

function getCourseCode(course) {
  return course?.code ?? course?.courseCode ?? '';
}

function getCourseBatches(course) {
  return Array.isArray(course?.batches) ? course.batches : [];
}

function getCourseSections(course) {
  return Array.isArray(course?.sections) ? course.sections : [];
}

function getTargetLabel(item, fallbackPrefix) {
  if (typeof item === 'string') {
    return `${fallbackPrefix} ${item.slice(-6)}`;
  }

  return (
    item?.name
    ?? item?.title
    ?? item?.code
    ?? `${fallbackPrefix} ${getItemId(item).slice(-6)}`
  );
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

function getDefaultDueDate() {
  const date = new Date();

  date.setDate(date.getDate() + 7);
  date.setMinutes(
    date.getMinutes() - date.getTimezoneOffset(),
  );

  return date.toISOString().slice(0, 16);
}

function normalizeContent(item) {
  const course = item?.course;

  return {
    ...item,
    id: getItemId(item),
    contentType: item?.contentType || CONTENT_TYPES.ASSIGNMENT,
    courseTitle: course?.title ?? item?.courseName ?? '—',
    courseCode: course?.code ?? item?.courseCode ?? '',
    creatorName:
      item?.createdBy?.fullName
      ?? item?.facultyName
      ?? '—',
    batches: Array.isArray(item?.batches) ? item.batches : [],
    sections: Array.isArray(item?.sections) ? item.sections : [],
  };
}

function FieldLabel({ children, htmlFor, required = false }) {
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

const inputClassName = [
  'min-h-11 w-full rounded-xl border border-[#454650]',
  'bg-[#191A21] px-3 py-2.5 text-sm text-[#EAEAE6]',
  'placeholder:text-[#777986]',
  'outline-none transition-colors',
  'focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

function StatusBadge({ status }) {
  const normalizedStatus = String(status || 'UNKNOWN').toUpperCase();

  const styles = {
    DRAFT: 'border-[#777986]/40 bg-[#777986]/10 text-[#C8C8D0]',
    PUBLISHED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    CLOSED: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  };

  return (
    <span
      className={[
        'inline-flex rounded-full border px-2.5 py-1',
        'text-xs font-medium',
        styles[normalizedStatus]
          || 'border-[#454650] text-[#C8C8D0]',
      ].join(' ')}
    >
      {normalizedStatus}
    </span>
  );
}

export default function AssignmentOverview() {
  const [searchTerm, setSearchTerm] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState(() => ({
    ...INITIAL_FORM,
    dueDate: getDefaultDueDate(),
  }));

  const loadItems = useCallback(async () => {
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
      const records = Array.isArray(data.items)
        ? data.items
        : [];

      setItems(records.map(normalizeContent));
    } catch (requestError) {
      setError(
        requestError?.message
        || 'Assignments and practicals could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCourses = useCallback(async () => {
    setCoursesLoading(true);

    try {
      const response = await api.get('/v1/courses/department', {
        params: {
          page: 1,
          limit: 100,
        },
      });

      const data = getResponseData(response);

      const records = Array.isArray(data.courses)
        ? data.courses
        : Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.records)
            ? data.records
            : [];

      setCourses(records);
    } catch {
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
    loadCourses();
  }, [loadItems, loadCourses]);

  const selectedCourse = useMemo(
    () => courses.find(
      (course) => getItemId(course) === form.courseId,
    ) || null,
    [courses, form.courseId],
  );

  const availableBatches = useMemo(
    () => getCourseBatches(selectedCourse),
    [selectedCourse],
  );

  const availableSections = useMemo(
    () => getCourseSections(selectedCourse),
    [selectedCourse],
  );

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      const matchesType =
        contentTypeFilter === 'ALL'
        || item.contentType === contentTypeFilter;

      const matchesStatus =
        statusFilter === 'ALL'
        || String(item.status).toUpperCase() === statusFilter;

      const matchesSearch =
        !query
        || [
          item.title,
          item.description,
          item.courseTitle,
          item.courseCode,
          item.creatorName,
          item.contentType,
          ...item.batches.map((batch) => getTargetLabel(batch, 'Batch')),
          ...item.sections.map((section) => getTargetLabel(section, 'Section')),
        ].some((value) =>
          String(value || '').toLowerCase().includes(query),
        );

      return matchesType && matchesStatus && matchesSearch;
    });
  }, [items, searchTerm, contentTypeFilter, statusFilter]);

  const statistics = useMemo(() => ({
    total: items.length,
    assignments: items.filter(
      (item) => item.contentType === CONTENT_TYPES.ASSIGNMENT,
    ).length,
    practicals: items.filter(
      (item) => item.contentType === CONTENT_TYPES.PRACTICAL,
    ).length,
    published: items.filter(
      (item) => item.status === CONTENT_STATUSES.PUBLISHED,
    ).length,
  }), [items]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setFormError('');
    setNotice('');
  }

  function updateTargetSelection(event, fieldName) {
    const selectedIds = Array.from(
      event.target.selectedOptions,
      (option) => option.value,
    );

    setForm((current) => ({
      ...current,
      [fieldName]: selectedIds,
    }));

    setFormError('');
  }

  function handleCourseChange(event) {
    const courseId = event.target.value;

    setForm((current) => ({
      ...current,
      courseId,
      batchIds: [],
      sectionIds: [],
    }));

    setFormError('');
  }

  function resetForm() {
    setForm({
      ...INITIAL_FORM,
      dueDate: getDefaultDueDate(),
    });

    setFormError('');
  }

  async function handleCreateContent(event) {
    event.preventDefault();

    setFormError('');
    setNotice('');

    if (!form.courseId) {
      setFormError('Select a course before creating content.');
      return;
    }

    if (new Date(form.dueDate).getTime() <= Date.now()) {
      setFormError('Choose a future submission deadline.');
      return;
    }

    const attachments = [];

    if (form.attachmentName.trim() || form.attachmentUrl.trim()) {
      if (!form.attachmentName.trim() || !form.attachmentUrl.trim()) {
        setFormError(
          'Provide both the attachment name and URL, or leave both empty.',
        );
        return;
      }

      try {
        const attachmentUrl = new URL(form.attachmentUrl.trim());

        if (!['http:', 'https:'].includes(attachmentUrl.protocol)) {
          setFormError('Attachment URLs must use HTTP or HTTPS.');
          return;
        }

        attachments.push({
          name: form.attachmentName.trim(),
          url: attachmentUrl.toString(),
          mimeType: '',
          size: 0,
        });
      } catch {
        setFormError('Enter a valid attachment URL.');
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
      dueDate: new Date(form.dueDate).toISOString(),
      totalMarks: Number(form.totalMarks),
      attachments,
      status: CONTENT_STATUSES.DRAFT,
    };

    setSubmitting(true);

    try {
      const response = await api.post(
        '/v1/assignments/manage',
        payload,
      );

      const data = getResponseData(response);
      const createdItem = data.item;

      if (createdItem) {
        setItems((current) => [
          normalizeContent(createdItem),
          ...current,
        ]);
      } else {
        await loadItems();
      }

      const contentLabel =
        form.contentType === CONTENT_TYPES.PRACTICAL
          ? 'Practical'
          : 'Assignment';

      setNotice(`${contentLabel} saved as draft successfully.`);
      resetForm();
      setShowCreateForm(false);
    } catch (requestError) {
      setFormError(
        requestError?.message
        || 'The content could not be created.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="ACADEMIC OVERSIGHT"
        title="Assignments & Practicals"
        description="Create and manage course assignments and practical work from one place."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Academic Oversight' },
          { label: 'Assignments & Practicals' },
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
                setShowCreateForm((current) => !current);
                setFormError('');
                setNotice('');
              }}
            >
              {showCreateForm ? 'Close Form' : 'Create New'}
            </ActionButton>
          </div>
        }
      />

      {notice && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
        >
          {notice}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Total Content',
            value: statistics.total,
            helper: 'Assignments and practicals',
          },
          {
            label: 'Assignments',
            value: statistics.assignments,
            helper: 'Regular coursework',
          },
          {
            label: 'Practicals',
            value: statistics.practicals,
            helper: 'Practical coursework',
          },
          {
            label: 'Published',
            value: statistics.published,
            helper: 'Visible according to student access rules',
          },
        ].map((statistic) => (
          <div
            key={statistic.label}
            className="rounded-xl border border-[#343640] bg-[#191A21] p-5"
          >
            <p className="text-sm text-[#9697A2]">
              {statistic.label}
            </p>

            <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
              {loading ? '—' : statistic.value}
            </p>

            <p className="mt-2 text-xs text-[#777986]">
              {statistic.helper}
            </p>
          </div>
        ))}
      </div>

      {showCreateForm && (
        <div className="mb-6">
          <SectionCard
            eyebrow="CONTENT CREATION"
            title="Create Assignment or Practical"
            description="Select the content type and course, then enter the instructions and submission details."
          >
            <form
              onSubmit={handleCreateContent}
              className="space-y-6"
            >
              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200"
                >
                  {formError}
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
                    <option value={CONTENT_TYPES.ASSIGNMENT}>
                      Assignment
                    </option>

                    <option value={CONTENT_TYPES.PRACTICAL}>
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
                        key={getItemId(course)}
                        value={getItemId(course)}
                      >
                        {getCourseTitle(course)}
                        {getCourseCode(course)
                          ? ` (${getCourseCode(course)})`
                          : ''}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs leading-5 text-[#9697A2]">
                    The backend will verify that the selected course is
                    assigned to you. An HOD can first assign a course to
                    themselves from Course Management.
                  </p>
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
                    placeholder={
                      form.contentType === CONTENT_TYPES.PRACTICAL
                        ? 'e.g. Practical 1 — Data Structures'
                        : 'e.g. Assignment 1 — Data Structures'
                    }
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
                    placeholder={
                      form.contentType === CONTENT_TYPES.PRACTICAL
                        ? 'Describe the experiment, procedure, expected output, and submission requirements.'
                        : 'Enter assignment questions, instructions, and submission requirements.'
                    }
                    minLength={1}
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
                    disabled={!selectedCourse || availableBatches.length === 0}
                  >
                    {availableBatches.map((batch, index) => {
                      const id = getItemId(batch)
                        || (typeof batch === 'string' ? batch : '');

                      return (
                        <option key={id || index} value={id} disabled={!id}>
                          {getTargetLabel(batch, 'Batch')}
                        </option>
                      );
                    })}
                  </select>

                  <p className="mt-2 text-xs text-[#9697A2]">
                    Use Ctrl or Cmd to select multiple batches.
                  </p>

                  {selectedCourse && availableBatches.length === 0 && (
                    <p className="mt-1 text-xs text-amber-200">
                      No course batches are available in the returned course data.
                    </p>
                  )}
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
                    disabled={!selectedCourse || availableSections.length === 0}
                  >
                    {availableSections.map((section, index) => {
                      const id = getItemId(section)
                        || (typeof section === 'string' ? section : '');

                      return (
                        <option key={id || index} value={id} disabled={!id}>
                          {getTargetLabel(section, 'Section')}
                        </option>
                      );
                    })}
                  </select>

                  <p className="mt-2 text-xs text-[#9697A2]">
                    Section targeting is available when sections are assigned
                    to the selected course.
                  </p>
                </div>

                <div>
                  <FieldLabel htmlFor="attachmentName">
                    Material Name
                  </FieldLabel>

                  <input
                    id="attachmentName"
                    name="attachmentName"
                    value={form.attachmentName}
                    onChange={updateField}
                    className={inputClassName}
                    placeholder="e.g. Practical Manual PDF"
                    maxLength={255}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="attachmentUrl">
                    Material URL
                  </FieldLabel>

                  <input
                    id="attachmentUrl"
                    name="attachmentUrl"
                    type="url"
                    value={form.attachmentUrl}
                    onChange={updateField}
                    className={inputClassName}
                    placeholder="https://..."
                    maxLength={2048}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[#454650] bg-[#191A21] p-4">
                <p className="text-sm font-medium text-[#EAEAE6]">
                  Attachment note
                </p>

                <p className="mt-1 text-sm leading-6 text-[#9697A2]">
                  This form currently accepts a material URL. Direct PDF or
                  document upload will be connected through the file-storage
                  integration separately.
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-[#343640] pt-5">
                <ActionButton
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    resetForm();
                    setShowCreateForm(false);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </ActionButton>

                <ActionButton
                  type="submit"
                  loading={submitting}
                  disabled={coursesLoading || courses.length === 0}
                >
                  Save as Draft
                </ActionButton>
              </div>
            </form>
          </SectionCard>
        </div>
      )}

      <SectionCard
        eyebrow="CONTENT DIRECTORY"
        title="Assignments & Practicals"
        description="Search and filter records returned by the common management API."
        action={
          <ActionButton
            variant="secondary"
            onClick={loadItems}
            loading={loading}
          >
            Refresh
          </ActionButton>
        }
      >
        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <SearchInput
              name="contentSearch"
              label="Search content"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search title, course, or batch..."
            />
          </div>

          <div>
            <label
              htmlFor="typeFilter"
              className="mb-2 block text-sm font-medium text-[#D0D0D8]"
            >
              Content Type
            </label>

            <select
              id="typeFilter"
              value={contentTypeFilter}
              onChange={(event) => setContentTypeFilter(event.target.value)}
              className={inputClassName}
            >
              <option value="ALL">All Types</option>
              <option value={CONTENT_TYPES.ASSIGNMENT}>Assignments</option>
              <option value={CONTENT_TYPES.PRACTICAL}>Practicals</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="statusFilter"
              className="mb-2 block text-sm font-medium text-[#D0D0D8]"
            >
              Status
            </label>

            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={inputClassName}
            >
              <option value="ALL">All Statuses</option>
              <option value={CONTENT_STATUSES.DRAFT}>Draft</option>
              <option value={CONTENT_STATUSES.PUBLISHED}>Published</option>
              <option value={CONTENT_STATUSES.CLOSED}>Closed</option>
            </select>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4"
          >
            <p className="text-sm text-rose-200">{error}</p>

            <div className="mt-3">
              <ActionButton
                variant="secondary"
                onClick={loadItems}
                loading={loading}
              >
                Try Again
              </ActionButton>
            </div>
          </div>
        )}

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
              searchTerm.trim()
              || contentTypeFilter !== 'ALL'
              || statusFilter !== 'ALL'
                ? 'No matching content'
                : 'No assignments or practicals yet'
            }
            description={
              searchTerm.trim()
              || contentTypeFilter !== 'ALL'
              || statusFilter !== 'ALL'
                ? 'Try changing your search or filters.'
                : 'Create the first assignment or practical for a course assigned to you.'
            }
            action={
              searchTerm.trim()
              || contentTypeFilter !== 'ALL'
              || statusFilter !== 'ALL' ? (
                <ActionButton
                  variant="secondary"
                  onClick={() => {
                    setSearchTerm('');
                    setContentTypeFilter('ALL');
                    setStatusFilter('ALL');
                  }}
                >
                  Clear Filters
                </ActionButton>
              ) : (
                <ActionButton
                  onClick={() => setShowCreateForm(true)}
                >
                  Create New
                </ActionButton>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#343640]">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Targets</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                  <th className="px-4 py-3 font-medium">Marks</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#343640]">
                {filteredItems.map((item, index) => (
                  <tr
                    key={item.id || index}
                    className="bg-[#191A21] hover:bg-[#202129]"
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium text-[#EAEAE6]">
                        {item.title || 'Untitled'}
                      </p>

                      <p className="mt-1 max-w-xs truncate text-xs text-[#9697A2]">
                        {item.description || ''}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-full border border-[#454650] px-2.5 py-1 text-xs text-[#D0D0D8]">
                        {item.contentType === CONTENT_TYPES.PRACTICAL
                          ? 'Practical'
                          : 'Assignment'}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-[#D0D0D8]">
                      <p>{item.courseTitle}</p>

                      {item.courseCode && (
                        <p className="mt-1 text-xs text-[#9697A2]">
                          {item.courseCode}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4 text-[#D0D0D8]">
                      <p>
                        {item.batches.length
                          ? `${item.batches.length} batch(es)`
                          : 'All course batches'}
                      </p>

                      <p className="mt-1 text-xs text-[#9697A2]">
                        {item.sections.length
                          ? `${item.sections.length} section(s)`
                          : 'No specific sections'}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-[#D0D0D8]">
                      {formatDate(item.dueDate)}
                    </td>

                    <td className="px-4 py-4 text-[#D0D0D8]">
                      {item.totalMarks ?? '—'}
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="mt-5 rounded-xl border border-[#343640] bg-[#191A21] p-4">
        <p className="text-sm font-medium text-[#D0D0D8]">
          Current integration scope
        </p>

        <p className="mt-2 text-sm leading-6 text-[#9697A2]">
          Records are loaded from the common backend API. Creation currently
          saves a draft. Dedicated publish, edit, close, direct file upload,
          and student submission/review flows still need their respective
          backend and UI integrations.
        </p>
      </div>
    </div>
  );
}