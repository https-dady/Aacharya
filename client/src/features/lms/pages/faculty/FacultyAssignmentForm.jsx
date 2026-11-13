import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import assignmentManagementService from '../../services/assignmentManagementService.js';

const INITIAL_FORM = {
  contentType: 'ASSIGNMENT',
  title: '',
  courseId: '',
  batchIds: [],
  sectionIds: [],
  description: '',
  instructions: '',
  dueDate: '',
  totalMarks: '100',
};

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENTS = 10;

const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.txt',
];

const INPUT_CLASS = [
  'w-full rounded-xl border border-[#454650] bg-[#1D1F27]',
  'px-3.5 py-3 text-sm text-[#EAEAE6]',
  'placeholder:text-[#858590]',
  'outline-none transition-colors',
  'hover:border-[#62636E]',
  'focus-visible:ring-2 focus-visible:ring-[#CDB5F7]',
].join(' ');

const LABEL_CLASS =
  'mb-2 block text-sm font-semibold text-[#EAEAE6]';

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error?.message ||
    error?.message ||
    fallback
  );
}

function getId(value) {
  if (!value) return '';

  if (typeof value === 'object') {
    return String(value.id || value._id || '');
  }

  return String(value);
}

function getDateTimeLocal(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

function getFileExtension(fileName) {
  const lastDot = fileName.lastIndexOf('.');

  return lastDot >= 0
    ? fileName.slice(lastDot).toLowerCase()
    : '';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function extractInstructions(description = '') {
  const marker = 'Student Instructions:';
  const markerIndex = description.indexOf(marker);

  if (markerIndex === -1) {
    return {
      description,
      instructions: '',
    };
  }

  return {
    description: description.slice(0, markerIndex).trim(),
    instructions: description
      .slice(markerIndex + marker.length)
      .trim(),
  };
}

function normalizeExistingAttachment(attachment) {
  return {
    name: attachment.name || '',
    url: attachment.url || '',
    mimeType: attachment.mimeType || '',
    size: Number(attachment.size || 0),
    publicId: attachment.publicId || '',
    resourceType: attachment.resourceType || '',
  };
}

function getAssignmentId(assignment) {
  return getId(assignment?.id || assignment?._id);
}

function validateFiles(files) {
  const errors = [];

  if (files.length > MAX_FILES) {
    errors.push(`You can upload a maximum of ${MAX_FILES} new files per update.`);
  }

  files.forEach((file) => {
    if (!file.size) {
      errors.push(`${file.name} is empty.`);
    } else if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name} exceeds the 10 MB limit.`);
    }

    if (!ALLOWED_EXTENSIONS.includes(getFileExtension(file.name))) {
      errors.push(`${file.name} has an unsupported file format.`);
    }
  });

  return errors;
}

function DetailNotice({ children, type = 'error' }) {
  return (
    <div
      role="status"
      className={[
        'rounded-xl border p-4 text-sm leading-6',
        type === 'success'
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
          : 'border-rose-500/30 bg-rose-500/10 text-rose-200',
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export default function FacultyAssignmentForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const fileInputRef = useRef(null);

  const assignmentFromNavigation =
    location.state?.assignment || null;

  const assignmentId =
    searchParams.get('assignmentId') ||
    getAssignmentId(assignmentFromNavigation);

  const isEditMode = Boolean(assignmentId);

  const [form, setForm] = useState(INITIAL_FORM);

  const [courses, setCourses] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [newFiles, setNewFiles] = useState([]);

  const [assignmentStatus, setAssignmentStatus] = useState('DRAFT');

  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState('error');

  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [assignmentLoadError, setAssignmentLoadError] = useState('');

  const selectedCourse = useMemo(
    () => courses.find(
      (course) => getId(course) === form.courseId,
    ) || null,
    [courses, form.courseId],
  );

  const availableBatches = selectedCourse?.batches || [];
  const availableSections = selectedCourse?.sections || [];

  const selectedBatches = useMemo(
    () => availableBatches.filter(
      (batch) => form.batchIds.includes(getId(batch)),
    ),
    [availableBatches, form.batchIds],
  );

  const selectedSections = useMemo(
    () => availableSections.filter(
      (section) => form.sectionIds.includes(getId(section)),
    ),
    [availableSections, form.sectionIds],
  );

  const totalAttachmentCount =
    existingAttachments.length + newFiles.length;

  const loadCourses = useCallback(async (signal) => {
    const response = await api.get(
      '/v1/courses/assigned-to-me',
      { signal },
    );

    const assignedCourses = response?.data?.data?.courses;

    if (!Array.isArray(assignedCourses)) {
      throw new Error(
        'The server returned an invalid assigned-courses response.',
      );
    }

    setCourses(assignedCourses);
  }, []);

  const loadAssignment = useCallback(async (signal) => {
    if (!assignmentId) {
      return;
    }

    setIsLoadingAssignment(true);
    setAssignmentLoadError('');

    try {
      let matchedAssignment = assignmentFromNavigation;

      if (getAssignmentId(matchedAssignment) !== assignmentId) {
        matchedAssignment = null;
      }

      if (!matchedAssignment) {
        const firstPage =
          await assignmentManagementService.listAssignments(
            {
              page: 1,
              limit: 100,
            },
            { signal },
          );

        matchedAssignment = firstPage.items.find(
          (item) => item.id === assignmentId,
        );

        for (
          let page = 2;
          page <= firstPage.pagination.totalPages &&
          !matchedAssignment;
          page += 1
        ) {
          const result =
            await assignmentManagementService.listAssignments(
              {
                page,
                limit: 100,
              },
              { signal },
            );

          matchedAssignment = result.items.find(
            (item) => item.id === assignmentId,
          );
        }
      }

      if (signal.aborted) return;

      if (!matchedAssignment) {
        throw new Error(
          'The assignment could not be found in your accessible records.',
        );
      }

      const parsed = extractInstructions(
        matchedAssignment.description || '',
      );

      setForm({
        contentType: matchedAssignment.contentType || 'ASSIGNMENT',
        title: matchedAssignment.title || '',
        courseId: getId(matchedAssignment.course),
        batchIds: (matchedAssignment.batches || [])
          .map(getId)
          .filter(Boolean),
        sectionIds: (matchedAssignment.sections || [])
          .map(getId)
          .filter(Boolean),
        description: parsed.description,
        instructions:
          matchedAssignment.instructions || parsed.instructions,
        dueDate: getDateTimeLocal(matchedAssignment.dueDate),
        totalMarks: String(matchedAssignment.totalMarks ?? 100),
      });

      setExistingAttachments(
        (matchedAssignment.attachments || [])
          .map(normalizeExistingAttachment),
      );

      setAssignmentStatus(
        String(matchedAssignment.status || 'DRAFT').toUpperCase(),
      );
    } catch (error) {
      if (!signal.aborted) {
        setAssignmentLoadError(
          getErrorMessage(
            error,
            'Unable to load the assignment.',
          ),
        );
      }
    } finally {
      if (!signal.aborted) {
        setIsLoadingAssignment(false);
      }
    }
  }, [assignmentId, assignmentFromNavigation]);

  useEffect(() => {
    const controller = new AbortController();

    async function initialize() {
      setIsLoadingCourses(true);

      try {
        await loadCourses(controller.signal);
      } catch (error) {
        if (!controller.signal.aborted) {
          setNotice(
            getErrorMessage(
              error,
              'Unable to load your assigned courses.',
            ),
          );

          setNoticeType('error');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingCourses(false);
        }
      }
    }

    initialize();

    return () => controller.abort();
  }, [loadCourses]);

  useEffect(() => {
    if (!isEditMode) {
      setIsLoadingAssignment(false);
      return undefined;
    }

    const controller = new AbortController();

    loadAssignment(controller.signal);

    return () => controller.abort();
  }, [isEditMode, loadAssignment]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => {
      const next = {
        ...current,
        [name]: value,
      };

      if (name === 'courseId') {
        next.batchIds = [];
        next.sectionIds = [];
      }

      return next;
    });

    setErrors((current) => ({
      ...current,
      [name]: '',
      ...(name === 'courseId'
        ? {
            batchIds: '',
            sectionIds: '',
          }
        : {}),
    }));

    setNotice('');
  }

  function toggleSelection(fieldName, id) {
    setForm((current) => {
      const currentValues = current[fieldName];

      const nextValues = currentValues.includes(id)
        ? currentValues.filter((value) => value !== id)
        : [...currentValues, id];

      return {
        ...current,
        [fieldName]: nextValues,
      };
    });

    setErrors((current) => ({
      ...current,
      [fieldName]: '',
    }));

    setNotice('');
  }

  function handleFileSelection(event) {
    const selectedFiles = Array.from(event.target.files || []);

    const combinedFiles = [
      ...newFiles,
      ...selectedFiles,
    ];

    const uniqueFiles = combinedFiles.filter(
      (file, index, collection) => (
        collection.findIndex(
          (item) => (
            item.name === file.name &&
            item.size === file.size &&
            item.lastModified === file.lastModified
          ),
        ) === index
      ),
    );

    const fileErrors = validateFiles(uniqueFiles);

    if (existingAttachments.length + uniqueFiles.length > MAX_TOTAL_ATTACHMENTS) {
      fileErrors.push(
        `An assignment can contain at most ${MAX_TOTAL_ATTACHMENTS} attachments in total.`,
      );
    }

    if (fileErrors.length) {
      setErrors((current) => ({
        ...current,
        attachments: fileErrors.join(' '),
      }));
    } else {
      setNewFiles(uniqueFiles);

      setErrors((current) => ({
        ...current,
        attachments: '',
      }));
    }

    event.target.value = '';
  }

  function removeExistingAttachment(index) {
    setExistingAttachments((current) => (
      current.filter((_, itemIndex) => itemIndex !== index)
    ));

    setErrors((current) => ({
      ...current,
      attachments: '',
    }));
  }

  function removeNewFile(index) {
    setNewFiles((current) => (
      current.filter((_, itemIndex) => itemIndex !== index)
    ));

    setErrors((current) => ({
      ...current,
      attachments: '',
    }));
  }

  function validateForm() {
    const nextErrors = {};

    if (!['ASSIGNMENT', 'PRACTICAL'].includes(form.contentType)) {
      nextErrors.contentType = 'Select a valid content type.';
    }

    if (!form.title.trim()) {
      nextErrors.title = 'Title is required.';
    } else if (
      form.title.trim().length < 2 ||
      form.title.trim().length > 200
    ) {
      nextErrors.title = 'Title must contain 2–200 characters.';
    }

    if (!form.courseId || !selectedCourse) {
      nextErrors.courseId = 'Select one of your assigned courses.';
    }

    if (
      form.batchIds.length === 0 &&
      form.sectionIds.length === 0
    ) {
      nextErrors.batchIds =
        'Select at least one batch or section.';
    }

    if (!form.description.trim()) {
      nextErrors.description = 'Description is required.';
    } else if (form.description.trim().length > 5000) {
      nextErrors.description =
        'Description cannot exceed 5,000 characters.';
    }

    if (!form.instructions.trim()) {
      nextErrors.instructions =
        'Student instructions are required.';
    } else if (form.instructions.trim().length > 5000) {
      nextErrors.instructions =
        'Instructions cannot exceed 5,000 characters.';
    }

    if (!form.dueDate) {
      nextErrors.dueDate = 'Submission deadline is required.';
    } else {
      const deadline = new Date(form.dueDate);

      if (
        Number.isNaN(deadline.getTime()) ||
        deadline.getTime() <= Date.now()
      ) {
        nextErrors.dueDate =
          'Choose a valid future submission deadline.';
      }
    }

    const marks = Number(form.totalMarks);

    if (
      !Number.isFinite(marks) ||
      marks < 1 ||
      marks > 10000
    ) {
      nextErrors.totalMarks =
        'Enter marks between 1 and 10,000.';
    }

    const fileErrors = validateFiles(newFiles);

    if (existingAttachments.length + newFiles.length > MAX_TOTAL_ATTACHMENTS) {
      fileErrors.push(
        `An assignment can contain at most ${MAX_TOTAL_ATTACHMENTS} attachments.`,
      );
    }

    if (fileErrors.length) {
      nextErrors.attachments = fileErrors.join(' ');
    }

    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;

    const nextErrors = validateForm();

    setErrors(nextErrors);
    setNotice('');

    if (Object.keys(nextErrors).length > 0) return;

    const combinedDescription = [
      form.description.trim(),
      '',
      'Student Instructions:',
      form.instructions.trim(),
    ].join('\n');

    const payload = {
      contentType: form.contentType,
      title: form.title.trim(),
      description: combinedDescription,
      courseId: form.courseId,
      batchIds: form.batchIds,
      sectionIds: form.sectionIds,
      dueDate: new Date(form.dueDate).toISOString(),
      totalMarks: Number(form.totalMarks),
      status: isEditMode ? assignmentStatus : 'DRAFT',
      attachments: existingAttachments,
    };

    setIsSubmitting(true);

    try {
      if (isEditMode) {
        await assignmentManagementService.updateAssignment(
          assignmentId,
          payload,
          newFiles,
        );

        setNotice('Assignment updated successfully.');
      } else {
        await assignmentManagementService.createAssignment(
          payload,
          newFiles,
        );

        setNotice('Assignment saved successfully as a draft.');
      }

      setNoticeType('success');

      window.setTimeout(() => {
        navigate('/faculty/assignments', {
          state: {
            updatedAssignmentId: assignmentId || undefined,
          },
        });
      }, 700);
    } catch (error) {
      setNotice(
        getErrorMessage(
          error,
          isEditMode
            ? 'Unable to update the assignment.'
            : 'Unable to create the assignment.',
        ),
      );

      setNoticeType('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    if (isEditMode) {
      const controller = new AbortController();
      loadAssignment(controller.signal);
      return;
    }

    setForm(INITIAL_FORM);
    setExistingAttachments([]);
    setNewFiles([]);
    setErrors({});
    setNotice('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  if (isLoadingAssignment) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          eyebrow="FACULTY WORKSPACE"
          title="Edit Assignment"
          description="Loading the selected assignment."
        />

        <SectionCard>
          <div className="flex min-h-48 items-center justify-center text-sm text-[#A5A6B0]">
            Loading assignment information...
          </div>
        </SectionCard>
      </div>
    );
  }

  if (isEditMode && assignmentLoadError) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          eyebrow="FACULTY WORKSPACE"
          title="Edit Assignment"
          description="The selected assignment could not be loaded."
        />

        <SectionCard>
          <EmptyState
            title="Assignment unavailable"
            description={assignmentLoadError}
            action={
              <Link
                to="/faculty/assignments"
                className="rounded-xl border border-[#454650] px-4 py-2 text-sm text-[#EAEAE6]"
              >
                Back to Assignments
              </Link>
            }
          />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title={
          isEditMode
            ? 'Edit Assignment'
            : form.contentType === 'PRACTICAL'
              ? 'Create Practical'
              : 'Create Assignment'
        }
        description={
          isEditMode
            ? 'Update assignment information, targeting, deadline, marks, and attachments.'
            : 'Create coursework or practical work for students in your assigned courses.'
        }
        breadcrumbs={[
          {
            label: 'Faculty Dashboard',
            to: '/faculty/dashboard',
          },
          {
            label: 'Assignments',
            to: '/faculty/assignments',
          },
          {
            label: isEditMode ? 'Edit' : 'Create',
          },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#343640] bg-[#191A21] p-4">
        <div>
          <p className="text-sm font-semibold text-[#EAEAE6]">
            {isEditMode ? 'Assignment Update' : 'Assignment Creation'}
          </p>

          <p className="mt-1 text-sm leading-5 text-[#9697A2]">
            {isEditMode
              ? `Current status: ${assignmentStatus}`
              : 'New assignments are saved as drafts.'}
          </p>
        </div>

        <Link
          to="/faculty/assignments"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-4 py-2 text-sm font-medium text-[#D0D0D8] transition-colors hover:border-[#CDB5F7]/50 hover:text-[#EAEAE6]"
        >
          Back to Assignments
        </Link>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-6">
          <SectionCard
            eyebrow="STEP 01"
            title="Content Information"
            description="Choose the content type and maintain its title."
          >
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <label htmlFor="contentType" className={LABEL_CLASS}>
                  Content Type *
                </label>

                <select
                  id="contentType"
                  name="contentType"
                  value={form.contentType}
                  onChange={handleChange}
                  className={INPUT_CLASS}
                >
                  <option value="ASSIGNMENT">Assignment</option>
                  <option value="PRACTICAL">Practical</option>
                </select>
              </div>

              <div>
                <label htmlFor="title" className={LABEL_CLASS}>
                  Title *
                </label>

                <input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  maxLength={200}
                  required
                  placeholder="Enter assignment title"
                  className={INPUT_CLASS}
                />

                {errors.title && (
                  <p className="mt-2 text-sm text-[#D58B95]">
                    {errors.title}
                  </p>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="STEP 02"
            title="Course and Target Groups"
            description="Choose an assigned course and its eligible batches or sections."
          >
            <div className="space-y-6 p-5 sm:p-6">
              <div>
                <label htmlFor="courseId" className={LABEL_CLASS}>
                  Assigned Course *
                </label>

                <select
                  id="courseId"
                  name="courseId"
                  value={form.courseId}
                  onChange={handleChange}
                  disabled={isLoadingCourses || courses.length === 0}
                  className={INPUT_CLASS}
                >
                  <option value="">
                    {isLoadingCourses
                      ? 'Loading assigned courses...'
                      : 'Select an assigned course'}
                  </option>

                  {courses.map((course) => (
                    <option key={getId(course)} value={getId(course)}>
                      {course.code ? `${course.code} — ` : ''}
                      {course.title}
                    </option>
                  ))}
                </select>

                {errors.courseId && (
                  <p className="mt-2 text-sm text-[#D58B95]">
                    {errors.courseId}
                  </p>
                )}
              </div>

              {selectedCourse && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-[#EAEAE6]">
                      Target Batches
                    </h3>

                    {availableBatches.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-[#454650] p-4 text-sm text-[#9697A2]">
                        No batches assigned to this course.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {availableBatches.map((batch) => {
                          const id = getId(batch);

                          return (
                            <label
                              key={id}
                              className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#454650] bg-[#1D1F27] p-3 hover:border-[#CDB5F7]/50"
                            >
                              <input
                                type="checkbox"
                                checked={form.batchIds.includes(id)}
                                onChange={() => toggleSelection('batchIds', id)}
                                className="accent-[#CDB5F7]"
                              />

                              <span className="text-sm text-[#EAEAE6]">
                                {batch.name || batch.code || id}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-[#EAEAE6]">
                      Target Sections
                    </h3>

                    {availableSections.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-[#454650] p-4 text-sm text-[#9697A2]">
                        No sections assigned to this course.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {availableSections.map((section) => {
                          const id = getId(section);

                          return (
                            <label
                              key={id}
                              className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#454650] bg-[#1D1F27] p-3 hover:border-[#CDB5F7]/50"
                            >
                              <input
                                type="checkbox"
                                checked={form.sectionIds.includes(id)}
                                onChange={() => toggleSelection('sectionIds', id)}
                                className="accent-[#CDB5F7]"
                              />

                              <span className="text-sm text-[#EAEAE6]">
                                {section.name || section.code || id}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {errors.batchIds && (
                <p className="text-sm text-[#D58B95]">
                  {errors.batchIds}
                </p>
              )}

              {selectedCourse && (
                <p className="text-xs text-[#9697A2]">
                  Selected: {selectedBatches.length} batch(es),{' '}
                  {selectedSections.length} section(s).
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="STEP 03"
            title="Description and Instructions"
            description="Maintain the assignment brief and student guidance."
          >
            <div className="space-y-5 p-5 sm:p-6">
              <div>
                <label htmlFor="description" className={LABEL_CLASS}>
                  Description *
                </label>

                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  maxLength={5000}
                  className={INPUT_CLASS}
                />

                {errors.description && (
                  <p className="mt-2 text-sm text-[#D58B95]">
                    {errors.description}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="instructions" className={LABEL_CLASS}>
                  Student Instructions *
                </label>

                <textarea
                  id="instructions"
                  name="instructions"
                  value={form.instructions}
                  onChange={handleChange}
                  rows={5}
                  maxLength={5000}
                  className={INPUT_CLASS}
                />

                {errors.instructions && (
                  <p className="mt-2 text-sm text-[#D58B95]">
                    {errors.instructions}
                  </p>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="STEP 04"
            title="Supporting Attachments"
            description="Keep existing attachments, remove unwanted files, or add new documents."
          >
            <div className="space-y-4 p-5 sm:p-6">
              {existingAttachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#9697A2]">
                    Existing Attachments
                  </p>

                  {existingAttachments.map((attachment, index) => (
                    <div
                      key={`${attachment.publicId || attachment.url}-${index}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#454650] bg-[#191A21] p-3"
                    >
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium text-[#EAEAE6]">
                          {attachment.name}
                        </p>

                        <p className="mt-1 text-xs text-[#9697A2]">
                          {attachment.mimeType || 'Document'}
                          {attachment.size
                            ? ` · ${formatFileSize(attachment.size)}`
                            : ''}
                        </p>

                        {attachment.url && (
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-xs text-[#CDB5F7] hover:underline"
                          >
                            Open existing file
                          </a>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeExistingAttachment(index)}
                        disabled={isSubmitting}
                        className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label
                  htmlFor="assignment-attachments"
                  className={LABEL_CLASS}
                >
                  Add New Files
                </label>

                <input
                  ref={fileInputRef}
                  id="assignment-attachments"
                  type="file"
                  multiple
                  accept={ALLOWED_EXTENSIONS.join(',')}
                  onChange={handleFileSelection}
                  disabled={isSubmitting}
                  className="block w-full cursor-pointer rounded-xl border border-dashed border-[#62636E] bg-[#1D1F27] p-4 text-sm text-[#D0D0D8] file:mr-4 file:rounded-lg file:border-0 file:bg-[#CDB5F7] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#17151D]"
                />

                <p className="mt-2 text-xs text-[#9697A2]">
                  Maximum {MAX_FILES} new files per request, 10 MB each.
                  Total existing and new attachments cannot exceed {MAX_TOTAL_ATTACHMENTS}.
                </p>

                {errors.attachments && (
                  <p className="mt-2 text-sm text-[#D58B95]">
                    {errors.attachments}
                  </p>
                )}
              </div>

              {newFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#9697A2]">
                    New Files
                  </p>

                  {newFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${file.lastModified}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#454650] bg-[#191A21] p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-[#EAEAE6]">
                          {file.name}
                        </p>

                        <p className="mt-1 text-xs text-[#9697A2]">
                          {formatFileSize(file.size)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeNewFile(index)}
                        disabled={isSubmitting}
                        className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/10"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-[#9697A2]">
                Total attachments after saving: {totalAttachmentCount}
              </p>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="STEP 05"
            title="Deadline and Evaluation"
            description="Configure the submission deadline and maximum marks."
          >
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <label htmlFor="dueDate" className={LABEL_CLASS}>
                  Submission Deadline *
                </label>

                <input
                  id="dueDate"
                  name="dueDate"
                  type="datetime-local"
                  value={form.dueDate}
                  onChange={handleChange}
                  required
                  className={INPUT_CLASS}
                />

                {errors.dueDate && (
                  <p className="mt-2 text-sm text-[#D58B95]">
                    {errors.dueDate}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="totalMarks" className={LABEL_CLASS}>
                  Maximum Marks *
                </label>

                <input
                  id="totalMarks"
                  name="totalMarks"
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  value={form.totalMarks}
                  onChange={handleChange}
                  required
                  className={INPUT_CLASS}
                />

                {errors.totalMarks && (
                  <p className="mt-2 text-sm text-[#D58B95]">
                    {errors.totalMarks}
                  </p>
                )}
              </div>
            </div>
          </SectionCard>

          <div className="rounded-xl border border-[#454650] bg-[#191A21] p-4">
            <p className="text-sm font-medium text-[#EAEAE6]">
              Assignment status
            </p>

            <p className="mt-2 text-sm leading-6 text-[#9697A2]">
              {isEditMode
                ? `The current ${assignmentStatus} status will be preserved during this update.`
                : 'New assignments are saved as drafts and are not published automatically.'}
            </p>
          </div>

          {notice && (
            <DetailNotice type={noticeType}>
              {notice}
            </DetailNotice>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <ActionButton
              type="button"
              variant="secondary"
              onClick={handleReset}
              disabled={isSubmitting}
            >
              {isEditMode ? 'Reload Original Data' : 'Reset Form'}
            </ActionButton>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Link
                to="/faculty/assignments"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#454650] px-4 py-2.5 text-sm font-semibold text-[#EAEAE6] hover:bg-[#26272B]"
              >
                Cancel
              </Link>

              <ActionButton
                type="submit"
                disabled={
                  isSubmitting ||
                  isLoadingCourses ||
                  courses.length === 0
                }
              >
                {isSubmitting
                  ? 'Saving...'
                  : isEditMode
                    ? 'Save Assignment Changes'
                    : 'Save Assignment Draft'}
              </ActionButton>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}