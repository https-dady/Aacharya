import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';
import assignmentManagementService from '../../services/assignmentManagementService.js';

import ActionButton from '../../components/ActionButton.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const CONTENT_TYPES = ['ASSIGNMENT', 'PRACTICAL'];
const CONTENT_STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED'];

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_EXTENSION = /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt)$/i;

const INPUT_CLASS = [
  'min-h-11 w-full rounded-xl border border-[#454650]',
  'bg-[#191A21] px-3 py-2.5 text-sm text-[#EAEAE6]',
  'placeholder:text-[#777986]',
  'outline-none transition-colors',
  'focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

const INITIAL_FORM = {
  title: '',
  contentType: 'ASSIGNMENT',
  description: '',
  courseId: '',
  batchIds: [],
  sectionIds: [],
  dueDate: '',
  totalMarks: '10',
  status: 'DRAFT',
  attachmentUrls: [{ name: '', url: '' }],
};

function getResponseData(response) {
  return response?.data?.data ?? response?.data ?? {};
}

function getId(item) {
  if (!item) return '';

  if (typeof item === 'string') return item;

  const id = item.id ?? item._id;

  return id ? String(id) : '';
}

function normalizeIds(values) {
  if (!Array.isArray(values)) return [];

  return values.map(getId).filter(Boolean);
}

function getDefaultDate(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());

  return date.toISOString().slice(0, 16);
}

function getCourseTitle(course) {
  return course?.title
    ?? course?.name
    ?? course?.courseName
    ?? 'Untitled course';
}

function getItemLabel(item, prefix) {
  if (typeof item === 'string') {
    return `${prefix} ${item.slice(-6)}`;
  }

  return item?.name
    ?? item?.title
    ?? item?.code
    ?? `${prefix} ${getId(item).slice(-6)}`;
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

function normalizeAssignment(assignment) {
  const course = assignment?.course;

  const batches = assignment?.batches
    ?? assignment?.batchIds
    ?? [];

  const sections = assignment?.sections
    ?? assignment?.sectionIds
    ?? [];

  return {
    title: assignment?.title ?? '',
    contentType: assignment?.contentType ?? 'ASSIGNMENT',
    description: assignment?.description ?? '',
    courseId: getId(course) || getId(assignment?.courseId),
    batchIds: normalizeIds(batches),
    sectionIds: normalizeIds(sections),
    dueDate: getDefaultDate(assignment?.dueDate),
    totalMarks: String(assignment?.totalMarks ?? 10),
    status: assignment?.status ?? 'DRAFT',
    attachmentUrls: [{ name: '', url: '' }],
  };
}

export default function EditAssignment() {
  const location = useLocation();
  const navigate = useNavigate();

  const assignment = location.state?.assignment;

  const assignmentId = getId(assignment);

  const [form, setForm] = useState(() => (
    assignment
      ? normalizeAssignment(assignment)
      : INITIAL_FORM
  ));

  const [courses, setCourses] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState(
    Array.isArray(assignment?.attachments)
      ? assignment.attachments
      : [],
  );
  const [selectedFiles, setSelectedFiles] = useState([]);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;

    async function loadCourses() {
      setLoadingCourses(true);

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

        if (active) {
          setCourses(records);
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError?.message
            || 'Department courses could not be loaded.',
          );
        }
      } finally {
        if (active) {
          setLoadingCourses(false);
        }
      }
    }

    Promise.resolve().then(loadCourses);

    return () => {
      active = false;
    };
  }, []);

  const selectedCourse = useMemo(
    () => courses.find(
      (course) => getId(course) === form.courseId,
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

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError('');
    setNotice('');
  }

  function updateCourse(event) {
    setForm((current) => ({
      ...current,
      courseId: event.target.value,
      batchIds: [],
      sectionIds: [],
    }));

    setError('');
  }

  function updateMultiSelection(event, fieldName) {
    const values = Array.from(
      event.target.selectedOptions,
      (option) => option.value,
    );

    setForm((current) => ({
      ...current,
      [fieldName]: values,
    }));

    setError('');
  }

  function updateAttachmentUrl(index, field, value) {
    setForm((current) => ({
      ...current,
      attachmentUrls: current.attachmentUrls.map(
        (attachment, attachmentIndex) => (
          attachmentIndex === index
            ? { ...attachment, [field]: value }
            : attachment
        ),
      ),
    }));

    setError('');
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
  }

  function removeExistingAttachment(index) {
    setExistingAttachments((current) => (
      current.filter((_, attachmentIndex) => attachmentIndex !== index)
    ));
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
      setError(`You can attach a maximum of ${MAX_FILES} new files.`);
      event.target.value = '';
      return;
    }

    const invalidFile = uniqueFiles.find((file) => (
      file.size > MAX_FILE_SIZE
      || !ALLOWED_FILE_EXTENSION.test(file.name)
    ));

    if (invalidFile) {
      setError(
        invalidFile.size > MAX_FILE_SIZE
          ? `${invalidFile.name} exceeds the 10 MB per-file limit.`
          : `${invalidFile.name} is not a supported file type.`,
      );

      event.target.value = '';
      return;
    }

    setSelectedFiles(uniqueFiles);
    setError('');
    event.target.value = '';
  }

  function removeSelectedFile(index) {
    setSelectedFiles((current) => (
      current.filter((_, fileIndex) => fileIndex !== index)
    ));
  }

  function validateForm() {
    if (!form.title.trim()) {
      return 'Enter an assignment or practical title.';
    }

    if (!CONTENT_TYPES.includes(form.contentType)) {
      return 'Select a valid content type.';
    }

    if (!form.courseId) {
      return 'Select a course.';
    }

    if (!form.description.trim()) {
      return 'Enter the assignment instructions or description.';
    }

    const dueDate = new Date(form.dueDate);

    if (
      !form.dueDate
      || Number.isNaN(dueDate.getTime())
      || dueDate.getTime() <= Date.now()
    ) {
      return 'Choose a future submission deadline.';
    }

    const totalMarks = Number(form.totalMarks);

    if (
      !Number.isFinite(totalMarks)
      || totalMarks < 1
      || totalMarks > 10000
    ) {
      return 'Total marks must be between 1 and 10000.';
    }

    if (!CONTENT_STATUSES.includes(form.status)) {
      return 'Select a valid publication status.';
    }

    const invalidUrl = form.attachmentUrls.some((attachment) => {
      const name = attachment.name.trim();
      const url = attachment.url.trim();

      if (!name && !url) return false;

      if (!name || !url) return true;

      try {
        const parsedUrl = new URL(url);

        return !['http:', 'https:'].includes(parsedUrl.protocol);
      } catch {
        return true;
      }
    });

    if (invalidUrl) {
      return 'Provide a valid attachment name and HTTP/HTTPS URL.';
    }

    if (existingAttachments.length + selectedFiles.length > MAX_FILES) {
      return `A maximum of ${MAX_FILES} attachments is allowed.`;
    }

    return '';
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setNotice('');

    if (!assignmentId) {
      setError('The selected assignment ID is unavailable.');
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const urlAttachments = form.attachmentUrls
      .filter((attachment) => (
        attachment.name.trim() && attachment.url.trim()
      ))
      .map((attachment) => ({
        name: attachment.name.trim(),
        url: attachment.url.trim(),
      }));

    const payload = {
      title: form.title.trim(),
      contentType: form.contentType,
      description: form.description.trim(),
      courseId: form.courseId,
      batchIds: form.batchIds,
      sectionIds: form.sectionIds,
      dueDate: new Date(form.dueDate).toISOString(),
      totalMarks: Number(form.totalMarks),
      status: form.status,
      attachments: [
        ...existingAttachments,
        ...urlAttachments,
      ],
    };

    setSubmitting(true);

    try {
      await assignmentManagementService.updateAssignment(
        assignmentId,
        payload,
        selectedFiles,
      );

      setNotice('Assignment information updated successfully.');

      navigate('/hod/assignments', {
        replace: true,
        state: {
          notice: 'Assignment information updated successfully.',
        },
      });
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message
        || requestError?.message
        || 'Assignment could not be updated. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!assignment) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          eyebrow="ACADEMIC OVERSIGHT"
          title="Edit Assignment"
          description="Update assignment and practical information."
          breadcrumbs={[
            { label: 'HOD Dashboard', to: '/hod/dashboard' },
            { label: 'Assignments', to: '/hod/assignments' },
            { label: 'Edit' },
          ]}
        />

        <SectionCard>
          <div className="px-5 py-10 text-center">
            <h2 className="text-lg font-semibold text-[#EAEAE6]">
              Assignment not selected
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#A5A6B0]">
              Open the edit page from an assignment record. This page
              uses the selected record passed through navigation state.
            </p>

            <Link
              to="/hod/assignments"
              className="mt-6 inline-flex"
            >
              <ActionButton variant="secondary">
                Back to Assignments
              </ActionButton>
            </Link>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="ACADEMIC OVERSIGHT"
        title="Edit Assignment"
        description="Update assignment or practical details, academic allocation and attachments."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Assignments', to: '/hod/assignments' },
          { label: 'Edit' },
        ]}
        actions={(
          <Link to="/hod/assignments">
            <ActionButton variant="secondary">
              Cancel
            </ActionButton>
          </Link>
        )}
      />

      <SectionCard
        eyebrow="CONTENT INFORMATION"
        title="Assignment Details"
        description="Update the academic content and its submission requirements."
      >
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="assignment-title" required>
                Title
              </FieldLabel>

              <input
                id="assignment-title"
                name="title"
                value={form.title}
                onChange={updateField}
                className={INPUT_CLASS}
                placeholder="Enter assignment title"
                required
              />
            </div>

            <div>
              <FieldLabel htmlFor="content-type" required>
                Content Type
              </FieldLabel>

              <select
                id="content-type"
                name="contentType"
                value={form.contentType}
                onChange={updateField}
                className={INPUT_CLASS}
              >
                <option value="ASSIGNMENT">Assignment</option>
                <option value="PRACTICAL">Practical</option>
              </select>
            </div>

            <div>
              <FieldLabel htmlFor="course-id" required>
                Course
              </FieldLabel>

              <select
                id="course-id"
                name="courseId"
                value={form.courseId}
                onChange={updateCourse}
                className={INPUT_CLASS}
                disabled={loadingCourses}
              >
                <option value="">
                  {loadingCourses ? 'Loading courses...' : 'Select course'}
                </option>

                {courses.map((course) => (
                  <option key={getId(course)} value={getId(course)}>
                    {getCourseTitle(course)}
                    {course.code ? ` (${course.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel htmlFor="due-date" required>
                Submission Deadline
              </FieldLabel>

              <input
                id="due-date"
                name="dueDate"
                type="datetime-local"
                value={form.dueDate}
                onChange={updateField}
                className={INPUT_CLASS}
                required
              />
            </div>

            <div>
              <FieldLabel htmlFor="total-marks" required>
                Total Marks
              </FieldLabel>

              <input
                id="total-marks"
                name="totalMarks"
                type="number"
                min="1"
                max="10000"
                value={form.totalMarks}
                onChange={updateField}
                className={INPUT_CLASS}
                required
              />
            </div>

            <div>
              <FieldLabel htmlFor="content-status" required>
                Publication Status
              </FieldLabel>

              <select
                id="content-status"
                name="status"
                value={form.status}
                onChange={updateField}
                className={INPUT_CLASS}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="assignment-description" required>
              Instructions / Description
            </FieldLabel>

            <textarea
              id="assignment-description"
              name="description"
              value={form.description}
              onChange={updateField}
              rows={5}
              className={INPUT_CLASS}
              placeholder="Enter assignment instructions..."
              required
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="batch-selection">
                Target Batches
              </FieldLabel>

              <select
                id="batch-selection"
                multiple
                value={form.batchIds}
                onChange={(event) => updateMultiSelection(event, 'batchIds')}
                className={`${INPUT_CLASS} min-h-32`}
                disabled={!form.courseId}
              >
                {availableBatches.map((batch) => (
                  <option key={getId(batch)} value={getId(batch)}>
                    {getItemLabel(batch, 'Batch')}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-[#858590]">
                Hold Ctrl or Cmd to select multiple batches.
              </p>
            </div>

            <div>
              <FieldLabel htmlFor="section-selection">
                Target Sections
              </FieldLabel>

              <select
                id="section-selection"
                multiple
                value={form.sectionIds}
                onChange={(event) => updateMultiSelection(event, 'sectionIds')}
                className={`${INPUT_CLASS} min-h-32`}
                disabled={!form.courseId}
              >
                {availableSections.map((section) => (
                  <option key={getId(section)} value={getId(section)}>
                    {getItemLabel(section, 'Section')}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-[#858590]">
                Hold Ctrl or Cmd to select multiple sections.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#EAEAE6]">
                Existing Attachments
              </h3>

              <p className="mt-1 text-xs text-[#858590]">
                Existing attachments are retained unless you remove them.
              </p>
            </div>

            {existingAttachments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#454650] p-4 text-sm text-[#858590]">
                No existing attachments.
              </p>
            ) : (
              <div className="space-y-2">
                {existingAttachments.map((attachment, index) => (
                  <div
                    key={`${attachment.url}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#454650] bg-[#191A21] p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#EAEAE6]">
                        {attachment.name || 'Attachment'}
                      </p>

                      {attachment.url && (
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block truncate text-xs text-[#CDB5F7] hover:underline"
                        >
                          Open attachment
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeExistingAttachment(index)}
                      className="text-xs font-semibold text-rose-300 hover:text-rose-200"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <FieldLabel htmlFor="new-attachments">
                Upload New Files
              </FieldLabel>

              <input
                id="new-attachments"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                onChange={handleFileSelection}
                className="block w-full text-sm text-[#A5A6B0] file:mr-4 file:rounded-lg file:border-0 file:bg-[#CDB5F7]/15 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#CDB5F7] hover:file:bg-[#CDB5F7]/25"
              />

              <p className="mt-2 text-xs text-[#858590]">
                Maximum 5 new files, 10 MB each. Supported: PDF, DOC,
                DOCX, PPT, PPTX, XLS, XLSX and TXT.
              </p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${file.lastModified}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-[#191A21] px-3 py-2"
                  >
                    <span className="truncate text-sm text-[#D0D0D8]">
                      {file.name}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeSelectedFile(index)}
                      className="shrink-0 text-xs text-rose-300 hover:text-rose-200"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-[#EAEAE6]">
                External Attachment URLs
              </h3>

              <p className="mt-1 text-xs text-[#858590]">
                Add externally hosted learning material or reference links.
              </p>
            </div>

            {form.attachmentUrls.map((attachment, index) => (
              <div
                key={`attachment-url-${index}`}
                className="grid gap-3 rounded-xl border border-[#454650] bg-[#191A21] p-3 md:grid-cols-[1fr_2fr_auto]"
              >
                <input
                  value={attachment.name}
                  onChange={(event) => updateAttachmentUrl(
                    index,
                    'name',
                    event.target.value,
                  )}
                  className={INPUT_CLASS}
                  placeholder="Attachment name"
                  aria-label="Attachment name"
                />

                <input
                  value={attachment.url}
                  onChange={(event) => updateAttachmentUrl(
                    index,
                    'url',
                    event.target.value,
                  )}
                  className={INPUT_CLASS}
                  placeholder="https://example.com/resource"
                  aria-label="Attachment URL"
                />

                <button
                  type="button"
                  onClick={() => removeAttachmentUrl(index)}
                  disabled={form.attachmentUrls.length === 1}
                  className="rounded-lg px-3 py-2 text-sm text-rose-300 hover:bg-rose-400/10 disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addAttachmentUrl}
              className="text-sm font-semibold text-[#CDB5F7] hover:text-[#E0D2FF]"
            >
              + Add another URL
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
            >
              {error}
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"
            >
              {notice}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3 border-t border-[#454650] pt-5">
            <Link to="/hod/assignments">
              <ActionButton variant="secondary">
                Cancel
              </ActionButton>
            </Link>

            <ActionButton
              type="submit"
              loading={submitting}
              disabled={submitting || loadingCourses}
            >
              {submitting ? 'Saving Changes...' : 'Save Changes'}
            </ActionButton>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}