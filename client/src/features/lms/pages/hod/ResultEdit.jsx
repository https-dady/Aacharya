import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import ActionButton from "../../components/ActionButton.jsx";
import FormField from "../../components/FormField.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";

export default function ResultEdit() {
  const location = useLocation();
  const result = location.state?.result;

  const [form, setForm] = useState(() => ({
    title: result?.title || result?.name || "",
    course: result?.course || "",
    courseCode: result?.courseCode || "",
    batch: result?.batch || "",
    section: result?.section || "",
    faculty: result?.faculty || "",
    totalMarks: result?.totalMarks ?? "",
    passingMarks: result?.passingMarks ?? "",
    marksObtained: result?.marksObtained ?? "",
    grade: result?.grade || "",
    status: result?.status || "",
    remarks: result?.remarks || "",
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
      nextErrors.title = "Assessment title is required.";
    }

    if (!form.course.trim()) {
      nextErrors.course = "Course name is required.";
    }

    const numericFields = [
      ["totalMarks", "Total marks"],
      ["passingMarks", "Passing marks"],
      ["marksObtained", "Marks obtained"],
    ];

    numericFields.forEach(([field, label]) => {
      if (form[field] === "") return;

      if (
        !Number.isFinite(Number(form[field])) ||
        Number(form[field]) < 0
      ) {
        nextErrors[field] = `${label} must be zero or a positive number.`;
      }
    });

    if (
      form.totalMarks !== "" &&
      Number(form.totalMarks) <= 0
    ) {
      nextErrors.totalMarks = "Total marks must be greater than zero.";
    }

    if (
      form.totalMarks !== "" &&
      form.passingMarks !== "" &&
      Number(form.passingMarks) > Number(form.totalMarks)
    ) {
      nextErrors.passingMarks =
        "Passing marks cannot exceed total marks.";
    }

    if (
      form.totalMarks !== "" &&
      form.marksObtained !== "" &&
      Number(form.marksObtained) > Number(form.totalMarks)
    ) {
      nextErrors.marksObtained =
        "Marks obtained cannot exceed total marks.";
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

  if (!result) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Academic Oversight"
          title="Edit Result"
          description="Update assessment result information."
          breadcrumbs={[
            { label: "HOD Dashboard", to: "/hod/dashboard" },
            { label: "Results", to: "/hod/results" },
            { label: "Edit" },
          ]}
        />

        <SectionCard>
          <div className="px-5 py-8 text-center">
            <h2 className="text-lg font-semibold text-[#EAEAE6]">
              No result selected
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#A7A7B0]">
              Open this page from a selected result record. No result
              information was supplied.
            </p>

            <div className="mt-6">
              <Link to="/hod/results">
                <ActionButton variant="secondary">
                  Back to Results
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
        eyebrow="Academic Oversight"
        title="Edit Result"
        description="Review and update the selected assessment result information."
        breadcrumbs={[
          { label: "HOD Dashboard", to: "/hod/dashboard" },
          { label: "Results", to: "/hod/results" },
          { label: "Edit" },
        ]}
        actions={
          <Link to="/hod/results">
            <ActionButton variant="secondary">Cancel</ActionButton>
          </Link>
        }
      />

      <SectionCard
        title="Assessment Information"
        description="Edit the assessment and result fields supplied by the selected record."
      >
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Assessment Title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Enter assessment title"
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
              inputProps={{ min: 0 }}
            />

            <FormField
              label="Marks Obtained"
              name="marksObtained"
              type="number"
              value={form.marksObtained}
              onChange={handleChange}
              placeholder="Enter marks obtained"
              error={errors.marksObtained}
              inputProps={{ min: 0 }}
            />

            <FormField
              label="Grade"
              name="grade"
              value={form.grade}
              onChange={handleChange}
              placeholder="Enter grade"
            />

            <FormField
              label="Result Status"
              name="status"
              value={form.status}
              onChange={handleChange}
              placeholder="Enter result status"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="result-remarks"
              className="block text-sm font-semibold text-[#EAEAE6]"
            >
              Remarks
            </label>

            <textarea
              id="result-remarks"
              name="remarks"
              value={form.remarks}
              onChange={handleChange}
              rows={4}
              placeholder="Enter remarks"
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
            <Link to="/hod/results">
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
          This form validates values locally. It does not update or persist
          assessment results.
        </p>
      </div>
    </div>
  );
}