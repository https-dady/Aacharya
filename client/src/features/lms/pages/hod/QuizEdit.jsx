import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PageHeader from "../../../../components/common/PageHeader";
import SectionCard from "../../../../components/common/SectionCard";
import FormField from "../../../../components/common/FormField";
import ActionButton from "../../../../components/common/ActionButton";

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
            { label: "HOD Dashboard", to: "/hod" },
            { label: "Quizzes", to: "/hod/quizzes" },
            { label: "Edit" },
          ]}
        />

        <SectionCard>
          <div className="px-5 py-10 text-center">
            <h2 className="text-lg font-semibold text-white">
              Quiz not selected
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
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
          { label: "HOD Dashboard", to: "/hod" },
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
              value={form.course || ""}
              onChange={handleChange}
              placeholder="Enter course name"
              required
              error={errors.course}
            />

            <FormField
              label="Course Code"
              name="courseCode"
              value={form.courseCode || ""}
              onChange={handleChange}
              placeholder="Enter course code"
            />

            <FormField
              label="Faculty"
              name="faculty"
              value={form.faculty || ""}
              onChange={handleChange}
              placeholder="Enter faculty name"
            />

            <FormField
              label="Batch"
              name="batch"
              value={form.batch || ""}
              onChange={handleChange}
              placeholder="Enter batch"
            />

            <FormField
              label="Section"
              name="section"
              value={form.section || ""}
              onChange={handleChange}
              placeholder="Enter section"
            />

            <FormField
              label="Scheduled At"
              name="scheduledAt"
              value={form.scheduledAt || ""}
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
              error={errors.duration}
              inputProps={{ min: 1 }}
            />

            <FormField
              label="Total Marks"
              name="totalMarks"
              type="number"
              value={form.totalMarks}
              onChange={handleChange}
              placeholder="Enter total marks"
              error={errors.totalMarks}
              inputProps={{ min: 1 }}
            />

            <FormField
              label="Passing Marks"
              name="passingMarks"
              type="number"
              value={form.passingMarks}
              onChange={handleChange}
              placeholder="Enter passing marks"
              error={errors.passingMarks}
              inputProps={{ min: 1 }}
            />
          </div>

          <div>
            <label
              htmlFor="quiz-instructions"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Instructions
            </label>

            <textarea
              id="quiz-instructions"
              name="instructions"
              value={form.instructions || ""}
              onChange={handleChange}
              rows={5}
              placeholder="Enter quiz instructions"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/10"
            />
          </div>

          {notice && (
            <div
              role="status"
              className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-4 text-sm leading-6 text-amber-200"
            >
              {notice}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5">
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

      <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4">
        <p className="text-sm font-medium text-amber-200">
          Saving is not connected yet
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-400">
          This form validates values locally. It does not update a quiz or
          persist changes to the backend.
        </p>
      </div>
    </div>
  );
}