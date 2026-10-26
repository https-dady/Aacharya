import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import ActionButton from "../../components/ActionButton.jsx";
import FormField from "../../components/FormField.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";

const initialForm = {
  title: "",
  course: "",
  courseCode: "",
  faculty: "",
  batch: "",
  section: "",
  scheduledAt: "",
  duration: "",
  totalMarks: "",
  passingMarks: "",
  instructions: "",
};

export default function QuizEdit() {
  const location = useLocation();
  const quiz = location.state?.quiz;

  const [form, setForm] = useState(() => ({
    ...initialForm,
    ...(quiz || {}),
    title: quiz?.title || quiz?.name || "",
    course: quiz?.course || "",
    courseCode: quiz?.courseCode || "",
    faculty: quiz?.faculty || "",
    batch: quiz?.batch || "",
    section: quiz?.section || "",
    scheduledAt: quiz?.scheduledAt || "",
    duration: quiz?.duration ?? "",
    totalMarks: quiz?.totalMarks ?? "",
    passingMarks: quiz?.passingMarks ?? "",
    instructions: quiz?.instructions || quiz?.description || "",
  }));

  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: "",
    }));

    setNotice("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = "Quiz title is required.";
    }

    if (!form.course.trim()) {
      nextErrors.course = "Course name is required.";
    }

    const numericFields = [
      ["duration", "Duration"],
      ["totalMarks", "Total marks"],
      ["passingMarks", "Passing marks"],
    ];

    numericFields.forEach(([field, label]) => {
      if (form[field] === "") return;

      if (
        !Number.isFinite(Number(form[field])) ||
        Number(form[field]) <= 0
      ) {
        nextErrors[field] = `${label} must be a positive number.`;
      }
    });

    if (
      form.totalMarks !== "" &&
      form.passingMarks !== "" &&
      Number(form.passingMarks) > Number(form.totalMarks)
    ) {
      nextErrors.passingMarks =
        "Passing marks cannot exceed total marks.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setNotice("");
      return;
    }

    setNotice(
      "Form validated successfully. Changes have not been saved because backend integration is pending.",
    );
  }

  if (!quiz) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Academic Management"
          title="Edit Quiz"
          description="Update quiz information and assessment settings."
          breadcrumbs={[
            { label: "HOD Dashboard", to: "/hod/dashboard" },
            { label: "Quizzes", to: "/hod/quizzes" },
            { label: "Edit" },
          ]}
        />

        <SectionCard>
          <div className="px-5 py-10 text-center">
            <h2 className="text-lg font-semibold text-[#EAEAE6]">
              Quiz not selected
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#A7A7B0]">
              Open this page from a selected quiz record. No quiz information
              has been supplied.
            </p>

            <div className="mt-6">
              <Link to="/hod/quizzes">
                <ActionButton variant="secondary">
                  Back to Quizzes
                </ActionButton>
              </Link>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Academic Management"
        title="Edit Quiz"
        description="Review and update the selected quiz information."
        breadcrumbs={[
          { label: "HOD Dashboard", to: "/hod/dashboard" },
          { label: "Quizzes", to: "/hod/quizzes" },
          { label: "Edit" },
        ]}
        actions={
          <Link to="/hod/quizzes">
            <ActionButton variant="secondary">Cancel</ActionButton>
          </Link>
        }
      />

      <SectionCard
        title="Quiz Information"
        description="Fields are initialized from the selected quiz record."
      >
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Quiz Title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Enter quiz title"
              required
              error={errors.title}
            />

            <FormField
              label="Course"
              name="course"
              value={form.course}
              onChange={handleChange}
              placeholder="Enter course name"
              required
              error={errors.course}
            />

            <FormField
              label="Course Code"
              name="courseCode"
              value={form.courseCode}
              onChange={handleChange}
              placeholder="Enter course code"
            />

            <FormField
              label="Faculty"
              name="faculty"
              value={form.faculty}
              onChange={handleChange}
              placeholder="Enter faculty name"
            />

            <FormField
              label="Batch"
              name="batch"
              value={form.batch}
              onChange={handleChange}
              placeholder="Enter batch"
            />

            <FormField
              label="Section"
              name="section"
              value={form.section}
              onChange={handleChange}
              placeholder="Enter section"
            />

            <FormField
              label="Scheduled At"
              name="scheduledAt"
              value={form.scheduledAt}
              onChange={handleChange}
              placeholder="Enter schedule"
              helperText="Use the schedule format supplied by your quiz data."
            />

            <FormField
              label="Duration (minutes)"
              name="duration"
              type="number"
              value={form.duration}
              onChange={handleChange}
              placeholder="Enter duration"
              min="1"
              error={errors.duration}
            />

            <FormField
              label="Total Marks"
              name="totalMarks"
              type="number"
              value={form.totalMarks}
              onChange={handleChange}
              placeholder="Enter total marks"
              min="1"
              error={errors.totalMarks}
            />

            <FormField
              label="Passing Marks"
              name="passingMarks"
              type="number"
              value={form.passingMarks}
              onChange={handleChange}
              placeholder="Enter passing marks"
              min="1"
              error={errors.passingMarks}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="quiz-instructions"
              className="block text-sm font-semibold text-[#EAEAE6]"
            >
              Instructions
            </label>

            <textarea
              id="quiz-instructions"
              name="instructions"
              value={form.instructions}
              onChange={handleChange}
              rows={5}
              placeholder="Enter quiz instructions"
              className="w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-4 py-3 text-sm text-[#EAEAE6] outline-none transition placeholder:text-[#858590] focus-visible:ring-2 focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14161C]"
            />
          </div>

          {notice && (
            <div
              role="status"
              className="rounded-xl border border-[#E5DF98]/25 bg-[#E5DF98]/5 p-4 text-sm leading-6 text-[#E5DF98]"
            >
              {notice}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3 border-t border-[#343640] pt-5">
            <Link to="/hod/quizzes">
              <ActionButton type="button" variant="secondary">
                Cancel
              </ActionButton>
            </Link>

            <ActionButton type="submit">
              Validate Changes
            </ActionButton>
          </div>
        </form>
      </SectionCard>

      <div className="rounded-xl border border-[#E5DF98]/20 bg-[#E5DF98]/5 p-4">
        <p className="text-sm font-semibold text-[#E5DF98]">
          Saving is not connected yet
        </p>

        <p className="mt-1 text-sm leading-6 text-[#A7A7B0]">
          This form validates values locally. It does not update a quiz or
          persist changes to the backend.
        </p>
      </div>
    </div>
  );
}