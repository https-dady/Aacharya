import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import ActionButton from "../../components/ActionButton.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";

const MATERIAL_TYPES = [
  {
    value: "document",
    label: "Document",
    description: "PDFs, notes, and study material",
  },
  {
    value: "video",
    label: "Video",
    description: "Video lectures and recorded sessions",
  },
  {
    value: "external",
    label: "External resource",
    description: "Links to external learning resources",
  },
];

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".txt",
];

function getFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "Unknown size";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileExtension(filename) {
  const extension = filename.split(".").pop();

  return extension ? extension.toUpperCase() : "FILE";
}

function isAllowedFile(file) {
  const filename = file.name.toLowerCase();

  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((extension) =>
    filename.endsWith(extension),
  );

  const hasAllowedMimeType =
    ALLOWED_FILE_TYPES.includes(file.type) ||
    file.type === "";

  return hasAllowedExtension && hasAllowedMimeType;
}

function getCourseContext(locationState) {
  const course = locationState?.course ?? {};
  const material = locationState?.material ?? {};

  return {
    course,
    material,
    courseId:
      locationState?.courseId ??
      course?._id ??
      course?.id ??
      material?.courseId ??
      "",
  };
}

function FieldLabel({ htmlFor, children, required = false }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
    >
      {children}

      {required && (
        <>
          <span className="ml-1 text-[#E5DF98]" aria-hidden="true">
            *
          </span>
          <span className="sr-only"> (required)</span>
        </>
      )}
    </label>
  );
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  required = false,
  maxLength,
  type = "text",
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
        required={required}
        maxLength={maxLength}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={[
          "min-h-11 w-full rounded-xl border bg-[#1D1F27]",
          "px-3.5 py-2.5 text-sm text-[#EAEAE6]",
          "placeholder:text-[#858590]",
          "transition-colors",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2",
          "focus-visible:ring-offset-[#14161C]",
          error
            ? "border-[#D58B95]"
            : "border-[#454650] hover:border-[#62636E]",
        ].join(" ")}
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

function TextArea({
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength,
  ...props
}) {
  return (
    <textarea
      id={id}
      name={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      className={[
        "w-full resize-y rounded-xl border border-[#454650]",
        "bg-[#1D1F27] px-3.5 py-3 text-sm text-[#EAEAE6]",
        "placeholder:text-[#858590] hover:border-[#62636E]",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2",
        "focus-visible:ring-offset-[#14161C]",
      ].join(" ")}
      {...props}
    />
  );
}

function SelectInput({ id, value, onChange, children, ...props }) {
  return (
    <select
      id={id}
      name={id}
      value={value}
      onChange={onChange}
      className={[
        "min-h-11 w-full rounded-xl border border-[#454650]",
        "bg-[#1D1F27] px-3.5 py-2.5 text-sm text-[#EAEAE6]",
        "hover:border-[#62636E]",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2",
        "focus-visible:ring-offset-[#14161C]",
      ].join(" ")}
      {...props}
    >
      {children}
    </select>
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
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FacultyCourseMaterialUpload() {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const { course, courseId } = getCourseContext(location.state);

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "document",
    moduleName: "",
    resourceUrl: "",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const courseName =
    course?.title ??
    course?.name ??
    course?.courseName ??
    "Selected course";

  const courseCode =
    course?.code ??
    course?.courseCode ??
    "";

  const courseDetailsPath = "/faculty/courses/details";

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setNotice("");

    setErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const next = { ...current };
      delete next[name];

      return next;
    });
  }

  function validateFile(file) {
    if (!file) {
      return "Choose a file to continue.";
    }

    if (!isAllowedFile(file)) {
      return "Choose a supported PDF, Office document, spreadsheet, or TXT file.";
    }

    if (file.size === 0) {
      return "The selected file is empty.";
    }

    if (file.size > MAX_FILE_SIZE) {
      return "The file must be 25 MB or smaller.";
    }

    return "";
  }

  function handleFileSelection(event) {
    const file = event.target.files?.[0];

    setNotice("");

    if (!file) {
      return;
    }

    const fileError = validateFile(file);

    if (fileError) {
      setSelectedFile(null);
      setErrors((current) => ({
        ...current,
        file: fileError,
      }));

      event.target.value = "";
      return;
    }

    setSelectedFile(file);

    setErrors((current) => {
      const next = { ...current };
      delete next.file;

      return next;
    });
  }

  function removeSelectedFile() {
    setSelectedFile(null);
    setNotice("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setErrors((current) => {
      const next = { ...current };
      delete next.file;

      return next;
    });
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    const fileError = validateFile(file);

    if (fileError) {
      setErrors((current) => ({
        ...current,
        file: fileError,
      }));

      return;
    }

    setSelectedFile(file);
    setNotice("");

    setErrors((current) => {
      const next = { ...current };
      delete next.file;

      return next;
    });
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = "Enter a title for this material.";
    }

    if (form.title.trim().length > 120) {
      nextErrors.title = "The title cannot exceed 120 characters.";
    }

    if (form.description.length > 2000) {
      nextErrors.description =
        "The description cannot exceed 2000 characters.";
    }

    if (!form.moduleName.trim()) {
      nextErrors.moduleName = "Enter the module or chapter name.";
    }

    if (
      form.type === "document" &&
      !selectedFile
    ) {
      nextErrors.file = "Choose a document to upload.";
    }

    if (
      form.type === "video" ||
      form.type === "external"
    ) {
      const url = form.resourceUrl.trim();

      if (!url) {
        nextErrors.resourceUrl = "Enter the resource URL.";
      } else {
        try {
          const parsedUrl = new URL(url);

          if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            nextErrors.resourceUrl =
              "Use a valid HTTP or HTTPS URL.";
          }
        } catch {
          nextErrors.resourceUrl =
            "Enter a valid URL, including https://.";
        }
      }
    }

    if (form.type === "document" && selectedFile) {
      const fileError = validateFile(selectedFile);

      if (fileError) {
        nextErrors.file = fileError;
      }
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    setNotice("");

    if (!validateForm()) {
      return;
    }

    setNotice(
      "Your form is valid, but the material upload API is not connected yet. Nothing has been uploaded or saved.",
    );
  }

  function handleBack() {
    if (window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }

    navigate(courseDetailsPath, {
      state: {
        course,
        courseId,
      },
    });
  }

  const requiresFile = form.type === "document";
  const requiresUrl = form.type === "video" || form.type === "external";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Faculty workspace"
        title="Upload course material"
        description="Prepare learning resources for your students by adding a document, video lecture, or external learning link."
        breadcrumbs={[
          {
            label: "Dashboard",
            to: "/faculty/dashboard",
          },
          {
            label: "Courses",
            to: "/faculty/courses",
          },
          {
            label: "Course details",
            to: courseDetailsPath,
          },
          {
            label: "Upload material",
          },
        ]}
        actions={
          <ActionButton
            variant="secondary"
            onClick={handleBack}
            leadingIcon={
              <span aria-hidden="true">←</span>
            }
          >
            Back to course
          </ActionButton>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <SectionCard
            eyebrow="Resource setup"
            title="Material information"
            description="Add the details students will see when they open this resource."
            variant="default"
          >
            <form
              id="faculty-material-upload-form"
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
                  required
                  maxLength={120}
                  error={errors.title}
                />

                <p className="mt-2 text-xs text-[#858590]">
                  {form.title.length}/120 characters
                </p>
              </div>

              <div>
                <FieldLabel htmlFor="description">
                  Description
                </FieldLabel>

                <TextArea
                  id="description"
                  value={form.description}
                  onChange={updateField}
                  placeholder="Describe what students will learn from this material..."
                  rows={4}
                  maxLength={2000}
                />

                <p className="mt-2 text-xs text-[#858590]">
                  {form.description.length}/2000 characters
                </p>

                {errors.description && (
                  <p
                    role="alert"
                    className="mt-2 text-sm text-[#D58B95]"
                  >
                    {errors.description}
                  </p>
                )}
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
                  required
                  maxLength={120}
                  error={errors.moduleName}
                />

                <p className="mt-2 text-xs leading-5 text-[#858590]">
                  Enter the module or chapter name. A module catalogue
                  will need to be connected before this can become a
                  course-linked selection.
                </p>
              </div>

              <div>
                <FieldLabel htmlFor="type" required>
                  Material type
                </FieldLabel>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {MATERIAL_TYPES.map((item) => {
                    const selected = form.type === item.value;

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          setForm((current) => ({
                            ...current,
                            type: item.value,
                          }));

                          setErrors((current) => {
                            const next = { ...current };
                            delete next.file;
                            delete next.resourceUrl;

                            return next;
                          });

                          setNotice("");
                        }}
                        aria-pressed={selected}
                        className={[
                          "rounded-xl border p-4 text-left transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2",
                          "focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2",
                          "focus-visible:ring-offset-[#14161C]",
                          selected
                            ? "border-[#CDB5F7] bg-[#CDB5F7]/10"
                            : "border-[#454650] bg-[#1D1F27] hover:border-[#62636E]",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "mb-3 flex h-9 w-9 items-center justify-center",
                            "rounded-lg text-sm font-bold",
                            selected
                              ? "bg-[#CDB5F7] text-[#14161C]"
                              : "bg-[#303139] text-[#CDB5F7]",
                          ].join(" ")}
                        >
                          {item.value === "document"
                            ? "PDF"
                            : item.value === "video"
                              ? "▶"
                              : "↗"}
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
                    name="materialFile"
                    type="file"
                    accept={ALLOWED_EXTENSIONS.join(",")}
                    onChange={handleFileSelection}
                    className="sr-only"
                    aria-describedby="file-help"
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
                            {getFileExtension(selectedFile.name)} ·{" "}
                            {getFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          variant="secondary"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Replace
                        </ActionButton>

                        <ActionButton
                          variant="ghost"
                          size="sm"
                          onClick={removeSelectedFile}
                        >
                          Remove
                        </ActionButton>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      className={[
                        "flex min-h-48 w-full flex-col items-center",
                        "justify-center rounded-xl border border-dashed",
                        "px-5 py-8 text-center transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2",
                        "focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2",
                        "focus-visible:ring-offset-[#14161C]",
                        isDragging
                          ? "border-[#CDB5F7] bg-[#CDB5F7]/10"
                          : errors.file
                            ? "border-[#D58B95] bg-[#D58B95]/5"
                            : "border-[#565762] bg-[#1D1F27] hover:border-[#CDB5F7]",
                      ].join(" ")}
                    >
                      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#CDB5F7]/10 text-[#CDB5F7]">
                        <FileIcon />
                      </span>

                      <span className="text-sm font-semibold text-[#EAEAE6]">
                        Drop your document here or browse
                      </span>

                      <span
                        id="file-help"
                        className="mt-2 text-xs leading-5 text-[#A7A7B0]"
                      >
                        PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX or TXT ·
                        Maximum 25 MB
                      </span>
                    </button>
                  )}

                  {errors.file && (
                    <p
                      role="alert"
                      className="mt-2 text-sm text-[#D58B95]"
                    >
                      {errors.file}
                    </p>
                  )}
                </div>
              )}

              {requiresUrl && (
                <div>
                  <FieldLabel htmlFor="resourceUrl" required>
                    {form.type === "video"
                      ? "Video lecture URL"
                      : "External resource URL"}
                  </FieldLabel>

                  <TextInput
                    id="resourceUrl"
                    type="url"
                    value={form.resourceUrl}
                    onChange={updateField}
                    placeholder="https://example.com/resource"
                    required
                    error={errors.resourceUrl}
                  />

                  <p className="mt-2 text-xs leading-5 text-[#858590]">
                    Use a publicly accessible or institution-approved
                    HTTPS link. Link access and permissions must be
                    verified when backend integration is added.
                  </p>
                </div>
              )}

              {notice && (
                <div
                  role="status"
                  className="rounded-xl border border-[#E5DF98]/30 bg-[#E5DF98]/10 p-4 text-sm leading-6 text-[#E5DF98]"
                >
                  {notice}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:justify-end">
                <ActionButton
                  variant="secondary"
                  onClick={handleBack}
                >
                  Cancel
                </ActionButton>

                <ActionButton
                  type="submit"
                  variant="primary"
                  leadingIcon={<span aria-hidden="true">↑</span>}
                >
                  Validate material
                </ActionButton>
              </div>
            </form>
          </SectionCard>
        </div>

        <aside className="min-w-0 space-y-6">
          <SectionCard
            eyebrow="Course context"
            title="Selected course"
            description="Review the course context before preparing the resource."
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

              {!courseId && (
                <div className="rounded-xl border border-[#E5DF98]/20 bg-[#E5DF98]/5 p-3">
                  <p className="text-xs leading-5 text-[#E5DF98]">
                    Course context was not provided by navigation.
                    Return to the course page and open the upload form
                    from there.
                  </p>
                </div>
              )}

              <Link
                to={courseDetailsPath}
                state={{
                  course,
                  courseId,
                }}
                className="inline-flex min-h-10 items-center text-sm font-semibold text-[#CDB5F7] hover:text-[#DCCBFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                View course details
                <span className="ml-2" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Before uploading"
            title="Resource checklist"
          >
            <ul className="space-y-4">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#CDB5F7]/10 text-xs font-bold text-[#CDB5F7]">
                  1
                </span>

                <div>
                  <p className="text-sm font-medium text-[#EAEAE6]">
                    Clear title
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#A7A7B0]">
                    Make the topic easy for students to identify.
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#CDB5F7]/10 text-xs font-bold text-[#CDB5F7]">
                  2
                </span>

                <div>
                  <p className="text-sm font-medium text-[#EAEAE6]">
                    Correct module
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#A7A7B0]">
                    Include the module or chapter this resource covers.
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#CDB5F7]/10 text-xs font-bold text-[#CDB5F7]">
                  3
                </span>

                <div>
                  <p className="text-sm font-medium text-[#EAEAE6]">
                    Verify resource access
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#A7A7B0]">
                    Ensure the document or external link is appropriate
                    for your students.
                  </p>
                </div>
              </li>
            </ul>
          </SectionCard>

          <div className="rounded-2xl border border-[#454650] bg-[#1D1F27] p-4">
            <p className="text-sm font-semibold text-[#EAEAE6]">
              Upload status
            </p>

            <p className="mt-2 text-sm leading-6 text-[#A7A7B0]">
              The form currently validates resource details locally.
              Saving files and publishing materials require backend
              integration.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}