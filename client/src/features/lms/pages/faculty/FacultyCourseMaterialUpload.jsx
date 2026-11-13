import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import facultyCourseMaterialService from '../../services/facultyCourseMaterialService.js';

const MATERIAL_TYPES = [
  {
    value: 'document',
    label: 'Document',
    description: 'PDFs, notes and study material',
  },
  {
    value: 'video',
    label: 'Video',
    description: 'Video lectures and recorded sessions',
  },
  {
    value: 'external',
    label: 'External resource',
    description: 'Links to learning resources',
  },
];

const MAX_FILE_SIZE = 25 * 1024 * 1024;

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

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

function resolveCourseContext(state) {
  const course = state?.course ?? null;
  const material = state?.material ?? null;

  const courseId =
    state?.courseId
    ?? course?._id
    ?? course?.id
    ?? course?.courseId
    ?? material?.courseId
    ?? '';

  return {
    course,
    courseId: String(courseId || ''),
  };
}

function getFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return 'Unknown size';
  }

  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileExtension(filename) {
  const index = filename.lastIndexOf('.');

  return index >= 0
    ? filename.slice(index).toLowerCase()
    : '';
}

function validateFile(file) {
  if (!file) {
    return 'Choose a document to continue.';
  }

  if (!ALLOWED_EXTENSIONS.includes(getFileExtension(file.name))) {
    return 'Unsupported file type. Choose a supported document format.';
  }

  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'The selected file content type is not supported.';
  }

  if (file.size === 0) {
    return 'The selected file is empty.';
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'The file must be 25 MB or smaller.';
  }

  return '';
}

function validateResourceUrl(value) {
  const trimmed = value.trim();

  if (!trimmed) {
    return 'Enter the resource URL.';
  }

  try {
    const parsed = new URL(trimmed);

    if (
      !['http:', 'https:'].includes(parsed.protocol)
      || !parsed.hostname
      || !parsed.hostname.includes('.')
      || parsed.username
      || parsed.password
    ) {
      return 'Enter a valid HTTP or HTTPS resource URL.';
    }

    return '';
  } catch {
    return 'Enter a valid URL, including https://.';
  }
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message
    || error?.response?.data?.error?.message
    || error?.message
    || 'The material could not be uploaded. Please try again.'
  );
}

function FieldLabel({ htmlFor, children, required = false }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
    >
      {children}

      {required && (
        <span className="ml-1 text-[#E5DF98]" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  maxLength,
  error,
  ...props
}) {
  return (
    <div>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={[
          'min-h-11 w-full rounded-xl border bg-[#1D1F27]',
          'px-3.5 py-2.5 text-sm text-[#EAEAE6]',
          'placeholder:text-[#858590] transition-colors',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2',
          'focus-visible:ring-offset-[#14161C]',
          error
            ? 'border-[#D58B95]'
            : 'border-[#454650] hover:border-[#62636E]',
        ].join(' ')}
        {...props}
      />

      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-2 text-sm text-[#D58B95]"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function FileIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6"
    >
      <path
        d="M13 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V9l-6-6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M13 3v6h6M8.5 14h7M8.5 17h7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function FacultyCourseMaterialUpload() {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const { course, courseId } = resolveCourseContext(location.state);

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'document',
    moduleName: '',
    resourceUrl: '',
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const courseName =
    course?.title
    ?? course?.name
    ?? course?.courseName
    ?? 'Selected course';

  const courseCode = course?.code ?? course?.courseCode ?? '';

  const courseDetailsPath = '/faculty/courses/details';

  const requiresFile = form.type === 'document';
  const requiresUrl = form.type === 'video' || form.type === 'external';

  function clearError(name) {
    setErrors((current) => {
      if (!current[name]) return current;

      const next = { ...current };
      delete next[name];

      return next;
    });
  }

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setNotice('');
    clearError(name);
  }

  function updateMaterialType(type) {
    setForm((current) => ({
      ...current,
      type,
    }));

    setSelectedFile(null);
    setNotice('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setErrors((current) => {
      const next = { ...current };
      delete next.file;
      delete next.resourceUrl;

      return next;
    });
  }

  function handleFileSelection(event) {
    const file = event.target.files?.[0];

    setNotice('');

    if (!file) return;

    const fileError = validateFile(file);

    if (fileError) {
      setSelectedFile(null);

      setErrors((current) => ({
        ...current,
        file: fileError,
      }));

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      return;
    }

    setSelectedFile(file);
    clearError('file');
  }

  function removeSelectedFile() {
    setSelectedFile(null);
    setNotice('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    clearError('file');
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    setNotice('');

    const file = event.dataTransfer.files?.[0];

    if (!file) return;

    const fileError = validateFile(file);

    if (fileError) {
      setErrors((current) => ({
        ...current,
        file: fileError,
      }));

      return;
    }

    setSelectedFile(file);
    clearError('file');
  }

  function validateForm() {
    const nextErrors = {};

    if (!course) {
      nextErrors.course =
        'No course was supplied. Open this form from the selected course page.';
    }

    if (!/^[a-f\d]{24}$/i.test(courseId)) {
      nextErrors.courseId =
        'A valid course ID is required. Return to Courses and open the upload form from a course.';
    }

    const title = form.title.trim();

    if (title.length < 2) {
      nextErrors.title = 'Title must contain at least 2 characters.';
    } else if (title.length > 120) {
      nextErrors.title = 'Title cannot exceed 120 characters.';
    }

    if (form.description.trim().length > 2000) {
      nextErrors.description =
        'Description cannot exceed 2000 characters.';
    }

    if (!form.moduleName.trim()) {
      nextErrors.moduleName = 'Enter the module or chapter name.';
    } else if (form.moduleName.trim().length > 120) {
      nextErrors.moduleName =
        'Module or chapter name cannot exceed 120 characters.';
    }

    if (requiresFile) {
      const fileError = validateFile(selectedFile);

      if (fileError) {
        nextErrors.file = fileError;
      }
    }

    if (requiresUrl) {
      const urlError = validateResourceUrl(form.resourceUrl);

      if (urlError) {
        nextErrors.resourceUrl = urlError;
      }
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice('');

    if (isUploading || !validateForm()) {
      return;
    }

    setIsUploading(true);

    try {
      const material = await facultyCourseMaterialService.createMaterial(
        courseId,
        {
          title: form.title.trim(),
          description: form.description.trim(),
          moduleName: form.moduleName.trim(),
          type: form.type,
          file: selectedFile,
          resourceUrl: form.resourceUrl.trim(),
        },
      );

      navigate('/faculty/courses/materials/details', {
        state: {
          course,
          courseId,
          material,
        },
      });
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  }

  function handleBack() {
    navigate(courseDetailsPath, {
      state: {
        course,
        courseId,
      },
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Faculty workspace"
        title="Upload course material"
        description="Add a document, video lecture or external learning resource for your students."
        breadcrumbs={[
          { label: 'Dashboard', to: '/faculty/dashboard' },
          { label: 'Courses', to: '/faculty/courses' },
          { label: 'Upload material' },
        ]}
        actions={
          <ActionButton
            variant="secondary"
            onClick={handleBack}
            disabled={isUploading}
            leadingIcon={<span aria-hidden="true">←</span>}
          >
            Back to course
          </ActionButton>
        }
      />

      {!courseId && (
        <div
          role="alert"
          className="rounded-xl border border-[#E5DF98]/30 bg-[#E5DF98]/10 p-4"
        >
          <p className="text-sm font-semibold text-[#E5DF98]">
            Course context is missing
          </p>

          <p className="mt-1 text-sm leading-6 text-[#D8D2A0]">
            Open this page using the Upload Material button on a specific
            course. A valid course ID is required.
          </p>

          <Link
            to="/faculty/courses"
            className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-[#CDB5F7] underline underline-offset-4"
          >
            Return to my courses
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <SectionCard
            eyebrow="Resource setup"
            title="Material information"
            description="Add the details students will see when they open this resource."
          >
            <form
              onSubmit={handleSubmit}
              noValidate
              className="space-y-6"
            >
              <div>
                <FieldLabel htmlFor="title" required>
                  Material title
                </FieldLabel>

                <TextInput
                  id="title"
                  value={form.title}
                  onChange={updateField}
                  placeholder="e.g. Introduction to Data Structures"
                  maxLength={120}
                  required
                  error={errors.title}
                  disabled={isUploading}
                />
              </div>

              <div>
                <FieldLabel htmlFor="description">
                  Description
                </FieldLabel>

                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  placeholder="Describe what students will learn from this material..."
                  rows={4}
                  maxLength={2000}
                  disabled={isUploading}
                  aria-invalid={errors.description ? 'true' : undefined}
                  className={[
                    'w-full resize-y rounded-xl border bg-[#1D1F27]',
                    'px-3.5 py-3 text-sm text-[#EAEAE6]',
                    'placeholder:text-[#858590]',
                    'focus-visible:outline-none focus-visible:ring-2',
                    'focus-visible:ring-[#CDB5F7]',
                    errors.description
                      ? 'border-[#D58B95]'
                      : 'border-[#454650]',
                  ].join(' ')}
                />

                <div className="mt-2 flex justify-between gap-3">
                  {errors.description ? (
                    <p role="alert" className="text-sm text-[#D58B95]">
                      {errors.description}
                    </p>
                  ) : <span />}

                  <p className="shrink-0 text-xs text-[#858590]">
                    {form.description.length}/2000
                  </p>
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="moduleName" required>
                  Module or chapter
                </FieldLabel>

                <TextInput
                  id="moduleName"
                  value={form.moduleName}
                  onChange={updateField}
                  placeholder="e.g. Module 1 — Fundamentals"
                  maxLength={120}
                  required
                  error={errors.moduleName}
                  disabled={isUploading}
                />
              </div>

              <div>
                <FieldLabel htmlFor="material-type" required>
                  Material type
                </FieldLabel>

                <div
                  id="material-type"
                  className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                >
                  {MATERIAL_TYPES.map((item) => {
                    const selected = form.type === item.value;

                    return (
                      <button
                        key={item.value}
                        type="button"
                        disabled={isUploading}
                        onClick={() => updateMaterialType(item.value)}
                        aria-pressed={selected}
                        className={[
                          'rounded-xl border p-4 text-left transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2',
                          'focus-visible:ring-[#CDB5F7]',
                          selected
                            ? 'border-[#CDB5F7] bg-[#CDB5F7]/10'
                            : 'border-[#454650] bg-[#1D1F27] hover:border-[#62636E]',
                        ].join(' ')}
                      >
                        <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#CDB5F7]/10 text-sm font-bold text-[#CDB5F7]">
                          {item.value === 'document'
                            ? 'PDF'
                            : item.value === 'video'
                              ? '▶'
                              : '↗'}
                        </span>

                        <span className="block text-sm font-semibold text-[#EAEAE6]">
                          {item.label}
                        </span>

                        <span className="mt-1 block text-xs leading-5 text-[#A7A7B0]">
                          {item.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {requiresFile && (
                <div>
                  <FieldLabel htmlFor="materialFile" required>
                    Select document
                  </FieldLabel>

                  <input
                    ref={fileInputRef}
                    id="materialFile"
                    name="file"
                    type="file"
                    accept={ALLOWED_EXTENSIONS.join(',')}
                    onChange={handleFileSelection}
                    disabled={isUploading}
                    className="sr-only"
                  />

                  {selectedFile ? (
                    <div className="flex flex-col gap-4 rounded-xl border border-[#454650] bg-[#1D1F27] p-4 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#CDB5F7]/10 text-[#CDB5F7]">
                          <FileIcon />
                        </div>

                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-[#EAEAE6]">
                            {selectedFile.name}
                          </p>

                          <p className="mt-1 text-xs text-[#A7A7B0]">
                            {getFileExtension(selectedFile.name).slice(1).toUpperCase()}
                            {' · '}
                            {getFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={isUploading}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Replace
                        </ActionButton>

                        <ActionButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isUploading}
                          onClick={() => {
                            setSelectedFile(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                            clearError('file');
                          }}
                        >
                          Remove
                        </ActionButton>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      className={[
                        'flex min-h-48 w-full flex-col items-center',
                        'justify-center rounded-xl border border-dashed',
                        'px-5 py-8 text-center transition-colors',
                        isDragging
                          ? 'border-[#CDB5F7] bg-[#CDB5F7]/10'
                          : errors.file
                            ? 'border-[#D58B95] bg-[#D58B95]/5'
                            : 'border-[#565762] bg-[#1D1F27] hover:border-[#CDB5F7]',
                      ].join(' ')}
                    >
                      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#CDB5F7]/10 text-[#CDB5F7]">
                        <FileIcon />
                      </span>

                      <span className="text-sm font-semibold text-[#EAEAE6]">
                        Drop your document here or browse
                      </span>

                      <span className="mt-2 text-xs leading-5 text-[#A7A7B0]">
                        PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX or TXT · Maximum 25 MB
                      </span>
                    </button>
                  )}

                  {errors.file && (
                    <p role="alert" className="mt-2 text-sm text-[#D58B95]">
                      {errors.file}
                    </p>
                  )}
                </div>
              )}

              {requiresUrl && (
                <div>
                  <FieldLabel htmlFor="resourceUrl" required>
                    {form.type === 'video'
                      ? 'Video lecture URL'
                      : 'External resource URL'}
                  </FieldLabel>

                  <TextInput
                    id="resourceUrl"
                    type="url"
                    value={form.resourceUrl}
                    onChange={updateField}
                    placeholder="https://example.com/resource"
                    required
                    error={errors.resourceUrl}
                    disabled={isUploading}
                  />

                  <p className="mt-2 text-xs leading-5 text-[#858590]">
                    Use an institution-approved HTTP or HTTPS link.
                  </p>
                </div>
              )}

              {(errors.course || errors.courseId) && (
                <div
                  role="alert"
                  className="rounded-xl border border-[#D58B95]/30 bg-[#D58B95]/10 p-4"
                >
                  <p className="text-sm font-semibold text-[#D58B95]">
                    Course context required
                  </p>

                  <p className="mt-1 text-sm leading-6 text-[#EAEAE6]">
                    {errors.course || errors.courseId}
                  </p>
                </div>
              )}

              {notice && (
                <div
                  role="alert"
                  className="rounded-xl border border-[#D58B95]/30 bg-[#D58B95]/10 p-4 text-sm leading-6 text-[#EAEAE6]"
                >
                  {notice}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:justify-end">
                <ActionButton
                  type="button"
                  variant="secondary"
                  onClick={handleBack}
                  disabled={isUploading}
                >
                  Cancel
                </ActionButton>

                <ActionButton
                  type="submit"
                  variant="primary"
                  disabled={isUploading || !courseId}
                  leadingIcon={<span aria-hidden="true">↑</span>}
                >
                  {isUploading ? 'Uploading...' : 'Upload Material'}
                </ActionButton>
              </div>
            </form>
          </SectionCard>
        </div>

        <aside className="min-w-0 space-y-6">
          <SectionCard
            eyebrow="Course context"
            title="Selected course"
            description="Verify the course before uploading its resource."
          >
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#CDB5F7]/10 text-lg font-bold text-[#CDB5F7]">
                {courseName.charAt(0).toUpperCase()}
              </div>

              <div>
                <h3 className="break-words text-base font-semibold text-[#EAEAE6]">
                  {courseName}
                </h3>

                {courseCode && (
                  <p className="mt-1 text-sm text-[#A7A7B0]">
                    {courseCode}
                  </p>
                )}
              </div>

              {courseId && (
                <p className="break-all text-xs leading-5 text-[#858590]">
                  Course ID: {courseId}
                </p>
              )}

              <Link
                to="/faculty/courses"
                className="inline-flex min-h-10 items-center text-sm font-semibold text-[#CDB5F7] hover:text-[#DCCBFA]"
              >
                View my courses →
              </Link>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Before uploading"
            title="Resource checklist"
          >
            <ul className="space-y-4">
              {[
                {
                  title: 'Clear title',
                  description: 'Make the topic easy for students to identify.',
                },
                {
                  title: 'Correct module',
                  description: 'Specify the module or chapter covered.',
                },
                {
                  title: 'Accessible resource',
                  description: 'Ensure students are permitted to access it.',
                },
              ].map((item, index) => (
                <li key={item.title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#CDB5F7]/10 text-xs font-bold text-[#CDB5F7]">
                    {index + 1}
                  </span>

                  <div>
                    <p className="text-sm font-medium text-[#EAEAE6]">
                      {item.title}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#A7A7B0]">
                      {item.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}