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
  dueDate: "",
  totalMarks: "",
  description: "",
};

export default function EditAssignment() {
  const location = useLocation();
  const assignment = location.state?.assignment;

  const [form, setForm] = useState(() => ({
    ...initialForm,
    ...(assignment || {}),
    title: assignment?.title || assignment?.name || "",
    description:
      assignment?.description || assignment?.instructions || "",
    dueDate: assignment?.dueDate || "",
    totalMarks:
      assignment?.totalMarks === undefined ||
      assignment?.totalMarks === null
        ? ""
        : String(assignment.totalMarks),
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
      nextErrors.title = "Assignment title is required.";
    }

    if (!form.course.trim()) {
      nextErrors.course = "Course name is required.";
    }

    if (
      form.totalMarks !== "" &&
      (!Number.isFinite(Number(form.totalMarks)) ||
        Number(form.totalMarks) <= 0)
    ) {
      nextErrors.totalMarks = "Enter a valid positive marks value.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setNotice("");
      return;
    }

    setNotice(
      "Form validated successfully. Changes have not been saved because backend integration is pending.",
    );
  }

  if (!assignment) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Academic Management"
          title="Edit Assignment"
          description="Update assignment information and academic allocation."
          breadcrumbs={[
            { label: "HOD Dashboard", to: "/hod" },
            { label: "Assignments", to: "/hod/assignments" },
            { label: "Edit" },
          ]}
        />

        <SectionCard>
          <div className="px-5 py-10 text-center">
            <h2 className="text-lg font-semibold text-white">
              Assignment not selected
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              Open the edit page from a selected assignment record. No
              assignment has been supplied to this page.
            </p>

            <div className="mt-6">
              <Link to="/hod/assignments">
                <ActionButton variant="secondary">
                  Back to Assignments
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
        title="Edit Assignment"
        description="Review and update the selected assignment's information."
        breadcrumbs={[
          { label: "HOD Dashboard", to: "/hod" },
          { label: "Assignments", to: "/hod/assignments" },
          { label: "Edit" },
        ]}
        actions={
          <Link to="/hod/assignments">
            <ActionButton variant="secondary">
              Cancel
            </ActionButton>
          </Link>
        }
      />

      <SectionCard
        title="Assignment Information"
        description="Fields are initialized from the selected assignment record."
      >
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Assignment Title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Enter assignment title"
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
              label="Due Date"
              name="dueDate"
              type="date"
              value={form.dueDate}
              onChange={handleChange}
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
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Instructions / Description
            </label>

            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={5}
              placeholder="Enter assignment instructions"
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
            <Link to="/hod/assignments">
              <ActionButton variant="secondary" type="button">
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
          This form validates input locally. It does not send an API request
          or persist changes to an assignment record.
        </p>
      </div>
    </div>
  );
}