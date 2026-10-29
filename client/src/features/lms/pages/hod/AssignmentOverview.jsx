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

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_EXTENSION = /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt)$/i;

const INITIAL_FORM = {
  title: '',
  contentType: CONTENT_TYPES.ASSIGNMENT,
  description: '',
  courseId: '',
  batchIds: [],
  sectionIds: [],
  dueDate: '',
  totalMarks: '10',
  attachmentUrls: [{ name: '', url: '' }],
};

const inputClassName = [
  'min-h-11 w-full rounded-xl border border-[#454650]',
  'bg-[#191A21] px-3 py-2.5 text-sm text-[#EAEAE6]',
  'placeholder:text-[#777986]',
  'outline-none transition-colors',
  'focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

function getResponseData(response) {
  return response?.data?.data ?? response?.data ?? {};
}

function getItemId(item) {
  const id = item?.id ?? item?._id;
  return id ? String(id) : '';
}

function getCourseTitle(course) {
  return course?.title ?? course?.name ?? course?.courseName ?? 'Untitled course';
}

function getCourseCode(course) {
  return course?.code ?? course?.courseCode ?? '';
}

function getTargetLabel(item, prefix) {
  if (typeof item === 'string') {
    return `${prefix} ${item.slice(-6)}`;
  }

  return item?.name
    ?? item?.title
    ?? item?.code
    ?? `${prefix} ${getItemId(item).slice(-6)}`;
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function toDateTimeLocal(value) {
  if (!value) return getDefaultDueDate();

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return getDefaultDueDate();

  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());

  return date.toISOString().slice(0, 16);
}

function getDefaultDueDate() {
  const date = new Date();

  date.setDate(date.getDate() + 7);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());

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
    creatorName: item?.createdBy?.fullName ?? item?.facultyName ?? '—',
    batches: Array.isArray(item?.batches) ? item.batches : [],
    sections: Array.isArray(item?.sections) ? item.sections : [],
    attachments: Array.isArray(item?.attachments) ? item.attachments : [],
  };
}

function normalizeIds(values) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => (
      typeof value === 'string' ? value : getItemId(value)
    ))
    .filter(Boolean);
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
        styles[normalizedStatus] || 'border-[#454650] text-[#C8C8D0]',
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

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [editingItemId, setEditingItemId] = useState('');
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
        params: { page: 1, limit: 100 },
      });

      const data = getResponseData(response);
      const records = Array.isArray(data.items) ? data.items : [];

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
        params: { page: 1, limit: 100 },
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
    () => Array.isArray(selectedCourse?.batches)
      ? selectedCourse.batches
      : [],
    [selectedCourse],
  );

  const availableSections = useMemo(
    () => Array.isArray(selectedCourse?.sections)
      ? selectedCourse.sections
      : [],
    [selectedCourse],
  );

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      const matchesType = contentTypeFilter === 'ALL'
        || item.contentType === contentTypeFilter;

      const matchesStatus = statusFilter === 'ALL'
        || String(item.status).toUpperCase() === statusFilter;

      const searchableValues = [
        item.title,
        item.description,
        item.courseTitle,
        item.courseCode,
        item.creatorName,
        item.contentType,
        ...item.batches.map((batch) => getTargetLabel(batch, 'Batch')),
        ...item.sections.map((section) => getTargetLabel(section, 'Section')),
      ];

      const matchesSearch = !query
        || searchableValues.some((value) => (
          String(value || '').toLowerCase().includes(query)
        ));

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

    setForm((current) => ({ ...current, [name]: value }));
    setFormError('');
    setNotice('');
  }

  function updateTargetSelection(event, fieldName) {
    const selectedIds = Array.from(
      event.target.selectedOptions,
      (option) => option.value,
    );

    setForm((current) => ({ ...current, [fieldName]: selectedIds }));
    setFormError('');
  }

  function handleCourseChange(event) {
    setForm((current) => ({
      ...current,
      courseId: event.target.value,
      batchIds: [],
      sectionIds: [],
    }));

    setFormError('');
  }

  function resetForm() {
    setForm({
      ...INITIAL_FORM,
      dueDate: getDefaultDueDate(),
      attachmentUrls: [{ name: '', url: '' }],
    });

    setSelectedFiles([]);
    setExistingAttachments([]);
    setEditingItemId('');
    setFormError('');
  }

  function startEditing(item) {
    const courseId = getItemId(item.course) || String(item.courseId || '');

    const batches = Array.isArray(item.batchIds)
      ? item.batchIds
      : item.batches;

    const sections = Array.isArray(item.sectionIds)
      ? item.sectionIds
      : item.sections;

    setForm({
      title: item.title || '',
      contentType: item.contentType || CONTENT_TYPES.ASSIGNMENT,
      description: item.description || '',
      courseId,
      batchIds: normalizeIds(batches),
      sectionIds: normalizeIds(sections),
      dueDate: toDateTimeLocal(item.dueDate),
      totalMarks: String(item.totalMarks ?? 10),
      attachmentUrls: [{ name: '', url: '' }],
    });

    setExistingAttachments(
      Array.isArray(item.attachments) ? item.attachments : [],
    );

    setSelectedFiles([]);
    setEditingItemId(item.id);
    setShowCreateForm(true);
    setFormError('');
    setNotice('');
  }

  function removeExistingAttachment(index) {
    setExistingAttachments((current) => (
      current.filter((_, attachmentIndex) => attachmentIndex !== index)
    ));

    setFormError('');
  }

  function updateAttachmentUrl(index, field, value) {
    setForm((current) => ({
      ...current,
      attachmentUrls: current.attachmentUrls.map((attachment, attachmentIndex) => (
        attachmentIndex === index
          ? { ...attachment, [field]: value }
          : attachment
      )),
    }));

    setFormError('');
  }

  function addAttachmentUrl() {
    setForm((current) => ({
      ...current,
      attachmentUrls: [
        ...current.attachmentUrls,
        { name: '', url: '' },
      ],
    }));
  }

  function removeAttachmentUrl(index) {
    setForm((current) => ({
      ...current,
      attachmentUrls: current.attachmentUrls.filter(
        (_, attachmentIndex) => attachmentIndex !== index,
      ),
    }));

    setFormError('');
  }

  function handleFileSelection(event) {
    const files = Array.from(event.target.files || []);
    const combinedFiles = [...selectedFiles, ...files];

    const uniqueFiles = combinedFiles.filter((file, index, allFiles) => (
      allFiles.findIndex((candidate) => (
        candidate.name === file.name
        && candidate.size === file.size
        && candidate.lastModified === file.lastModified
      )) === index
    ));

    if (uniqueFiles.length > MAX_FILES) {
      setFormError(`You can attach a maximum of ${MAX_FILES} new files.`);
      event.target.value = '';
      return;
    }

    const invalidFile = uniqueFiles.find((file) => (
      file.size > MAX_FILE_SIZE
      || !ALLOWED_FILE_EXTENSION.test(file.name)
    ));

    if (invalidFile) {
      setFormError(
        invalidFile.size > MAX_FILE_SIZE
          ? `${invalidFile.name} exceeds the 10 MB per-file limit.`
          : `${invalidFile.name} is not a supported file type.`,
      );

      event.target.value = '';
      return;
    }

    setSelectedFiles(uniqueFiles);
    setFormError('');
    event.target.value = '';
  }

  function removeSelectedFile(index) {
    setSelectedFiles((current) => (
      current.filter((_, fileIndex) => fileIndex !== index)
    ));
  }

  async function handleSaveContent(event) {
    event.preventDefault();

    setFormError('');
    setNotice('');

    if (!form.title.trim()) {
      setFormError('Enter an assignment or practical title.');
      return;
    }

    if (!form.courseId) {
      setFormError('Select a course before saving this content.');
      return;
    }

    if (!form.description.trim()) {
      setFormError('Enter the instructions or description.');
      return;
    }

    const dueDate = new Date(form.dueDate);

    if (
      !form.dueDate
      || Number.isNaN(dueDate.getTime())
      || dueDate.getTime() <= Date.now()
    ) {
      setFormError('Choose a future submission deadline.');
      return;
    }

    const totalMarks = Number(form.totalMarks);

    if (
      !Number.isFinite(totalMarks)
      || totalMarks < 1
      || totalMarks > 10000
    ) {
      setFormError('Maximum marks must be between 1 and 10000.');
      return;
    }

    const urlAttachments = [];

    for (const attachment of form.attachmentUrls) {
      const name = attachment.name.trim();
      const rawUrl = attachment.url.trim();

      if (!name && !rawUrl) continue;

      if (!name || !rawUrl) {
        setFormError(
          'Provide both a name and URL for each material link, or leave the row empty.',
        );
        return;
      }

      try {
        const parsedUrl = new URL(rawUrl);

        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          setFormError('Attachment URLs must use HTTP or HTTPS.');
          return;
        }

        urlAttachments.push({
          name,
          url: parsedUrl.toString(),
          mimeType: '',
          size: 0,
        });
      } catch {
        setFormError(`Enter a valid URL for "${name}".`);
        return;
      }
    }

    if (selectedFiles.length > MAX_FILES) {
      setFormError(`You can attach a maximum of ${MAX_FILES} new files.`);
      return;
    }

    const payload = new FormData();

    payload.append('title', form.title.trim());
    payload.append('contentType', form.contentType);
    payload.append('description', form.description.trim());
    payload.append('courseId', form.courseId);
    payload.append('batchIds', JSON.stringify(form.batchIds));
    payload.append('sectionIds', JSON.stringify(form.sectionIds));
    payload.append('dueDate', dueDate.toISOString());
    payload.append('totalMarks', String(totalMarks));

    /*
     * The backend receives the remaining existing attachments and new URL
     * attachments as JSON. Newly selected files are appended separately
     * under the same multipart field name.
     */
    payload.append(
      'attachments',
      JSON.stringify([...existingAttachments, ...urlAttachments]),
    );

    if (!editingItemId) {
      payload.append('status', CONTENT_STATUSES.DRAFT);
    }

    selectedFiles.forEach((file) => {
      payload.append('attachments', file, file.name);
    });

    setSubmitting(true);

    try {
      const response = editingItemId
        ? await api.patch(
          `/v1/assignments/manage/${encodeURIComponent(editingItemId)}`,
          payload,
        )
        : await api.post('/v1/assignments/manage', payload);

      const data = getResponseData(response);
      const savedItem = data.item ?? data.assignment ?? data.record;

      if (savedItem) {
        const normalizedItem = normalizeContent(savedItem);

        setItems((current) => (
          editingItemId
            ? current.map((item) => (
              item.id === editingItemId ? normalizedItem : item
            ))
            : [normalizedItem, ...current]
        ));
      } else {
        await loadItems();
      }

      const label = form.contentType === CONTENT_TYPES.PRACTICAL
        ? 'Practical'
        : 'Assignment';

      setNotice(
        editingItemId
          ? `${label} updated successfully.`
          : `${label} saved as draft successfully.`,
      );

      resetForm();
      setShowCreateForm(false);
    } catch (requestError) {
      setFormError(
        requestError?.message || 'The content could not be saved.',
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
                if (showCreateForm) resetForm();

                setShowCreateForm((current) => !current);
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
            helper: 'Published content',
          },
        ].map((statistic) => (
          <div
            key={statistic.label}
            className="rounded-xl border border-[#343640] bg-[#191A21] p-5"
          >
            <p className="text-sm text-[#9697A2]">{statistic.label}</p>

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
            eyebrow={editingItemId ? 'CONTENT EDITING' : 'CONTENT CREATION'}
            title={editingItemId
              ? 'Edit Assignment or Practical'
              : 'Create Assignment or Practical'}
            description={editingItemId
              ? 'Update content and remove attachments that are no longer required.'
              : 'Enter the instructions, target groups, deadline, and supporting materials.'}
          >
            <form onSubmit={handleSaveContent} className="space-y-6">
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
                    <option value={CONTENT_TYPES.ASSIGNMENT}>Assignment</option>
                    <option value={CONTENT_TYPES.PRACTICAL}>Practical</option>
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
                      {coursesLoading ? 'Loading courses...' : 'Select a course'}
                    </option>

                    {courses.map((course) => (
                      <option key={getItemId(course)} value={getItemId(course)}>
                        {getCourseTitle(course)}
                        {getCourseCode(course) ? ` (${getCourseCode(course)})` : ''}
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
                  <FieldLabel htmlFor="batchIds">
                    Target Batches
                  </FieldLabel>

                  <select
                    id="batchIds"
                    multiple
                    value={form.batchIds}
                    onChange={(event) => updateTargetSelection(event, 'batchIds')}
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
                </div>

                <div>
                  <FieldLabel htmlFor="sectionIds">
                    Target Sections
                  </FieldLabel>

                  <select
                    id="sectionIds"
                    multiple
                    value={form.sectionIds}
                    onChange={(event) => updateTargetSelection(event, 'sectionIds')}
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
                    Use Ctrl or Cmd to select multiple sections.
                  </p>
                </div>

                {editingItemId && (
                  <div className="md:col-span-2 space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#EAEAE6]">
                        Existing Attachments
                      </h3>

                      <p className="mt-1 text-xs text-[#9697A2]">
                        Remove an attachment here, then save the changes.
                      </p>
                    </div>

                    {existingAttachments.length === 0 ? (
                      <p className="rounded-xl border border-[#343640] bg-[#191A21] p-4 text-sm text-[#9697A2]">
                        No existing attachments.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {existingAttachments.map((attachment, index) => (
                          <li
                            key={`${attachment.publicId || attachment.url || attachment.name}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#343640] bg-[#191A21] p-3"
                          >
                            <div className="min-w-0">
                              <p className="break-all text-sm text-[#EAEAE6]">
                                {attachment.name || 'Attachment'}
                              </p>

                              {attachment.url && (
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 block break-all text-xs text-[#CDB5F7] underline"
                                >
                                  Open attachment
                                </a>
                              )}
                            </div>

                            <ActionButton
                              type="button"
                              variant="secondary"
                              onClick={() => removeExistingAttachment(index)}
                              disabled={submitting}
                            >
                              Remove
                            </ActionButton>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="md:col-span-2 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#EAEAE6]">
                        Material Links
                      </h3>

                      <p className="mt-1 text-xs text-[#9697A2]">
                        Add HTTP or HTTPS links to study materials.
                      </p>
                    </div>

                    <ActionButton
                      type="button"
                      variant="secondary"
                      onClick={addAttachmentUrl}
                      disabled={submitting || form.attachmentUrls.length >= 10}
                    >
                      Add URL
                    </ActionButton>
                  </div>

                  {form.attachmentUrls.map((attachment, index) => (
                    <div
                      key={`attachment-url-${index}`}
                      className="grid grid-cols-1 gap-3 rounded-xl border border-[#343640] bg-[#191A21] p-4 md:grid-cols-[1fr_2fr_auto]"
                    >
                      <div>
                        <FieldLabel htmlFor={`attachmentName-${index}`}>
                          Material Name
                        </FieldLabel>

                        <input
                          id={`attachmentName-${index}`}
                          value={attachment.name}
                          onChange={(event) => updateAttachmentUrl(
                            index,
                            'name',
                            event.target.value,
                          )}
                          className={inputClassName}
                          placeholder="e.g. Practical Manual"
                          maxLength={255}
                        />
                      </div>

                      <div>
                        <FieldLabel htmlFor={`attachmentUrl-${index}`}>
                          Material URL
                        </FieldLabel>

                        <input
                          id={`attachmentUrl-${index}`}
                          type="url"
                          value={attachment.url}
                          onChange={(event) => updateAttachmentUrl(
                            index,
                            'url',
                            event.target.value,
                          )}
                          className={inputClassName}
                          placeholder="https://..."
                          maxLength={2048}
                        />
                      </div>

                      <div className="flex items-end">
                        <ActionButton
                          type="button"
                          variant="secondary"
                          onClick={() => removeAttachmentUrl(index)}
                          disabled={submitting || form.attachmentUrls.length <= 1}
                        >
                          Remove
                        </ActionButton>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="md:col-span-2 space-y-3">
                  <div>
                    <FieldLabel htmlFor="assignmentFiles">
                      Upload Files
                    </FieldLabel>

                    <input
                      id="assignmentFiles"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                      onChange={handleFileSelection}
                      disabled={submitting || selectedFiles.length >= MAX_FILES}
                      className={`${inputClassName} file:mr-3 file:rounded-lg file:border-0 file:bg-[#CDB5F7] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#14161C]`}
                    />

                    <p className="mt-2 text-xs leading-5 text-[#9697A2]">
                      PDF, Word, PowerPoint, Excel, or TXT. Maximum 5 new files,
                      10 MB per file.
                    </p>
                  </div>

                  {selectedFiles.length > 0 && (
                    <ul className="space-y-2" aria-label="Selected files">
                      {selectedFiles.map((file, index) => (
                        <li
                          key={`${file.name}-${file.lastModified}-${index}`}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#343640] bg-[#191A21] px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="break-all text-sm text-[#EAEAE6]">
                              {file.name}
                            </p>

                            <p className="text-xs text-[#9697A2]">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>

                          <ActionButton
                            type="button"
                            variant="secondary"
                            onClick={() => removeSelectedFile(index)}
                            disabled={submitting}
                          >
                            Remove
                          </ActionButton>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
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
                  {editingItemId ? 'Save Changes' : 'Save as Draft'}
                </ActionButton>
              </div>
            </form>
          </SectionCard>
        </div>
      )}

      <SectionCard
        eyebrow="CONTENT DIRECTORY"
        title="Assignments & Practicals"
        description="Search and filter records returned by the management API."
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
          <div>
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
                <ActionButton onClick={() => setShowCreateForm(true)}>
                  Create New
                </ActionButton>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#343640]">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Targets</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                  <th className="px-4 py-3 font-medium">Marks</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
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

                    <td className="px-4 py-4">
                      <ActionButton
                        variant="secondary"
                        onClick={() => startEditing(item)}
                      >
                        Edit
                      </ActionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}