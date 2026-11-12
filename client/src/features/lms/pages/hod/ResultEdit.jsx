import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import api from "../../../auth/services/api/axios.js";

import ActionButton from "../../components/ActionButton.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";

const PAGE_SIZE = 100;

const RESULT_STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "ENTERED", label: "Marks Entered" },
  { value: "ABSENT", label: "Absent" },
  { value: "EXEMPT", label: "Exempt" },
];

function getAssessmentId(assessment) {
  return assessment?.id || assessment?._id || "";
}

function getResponseData(response) {
  return response?.data?.data || {};
}

function normalizeResult(record) {
  return {
    id: record.id,
    studentId: record.student?.id || "",
    studentName: record.student?.fullName || "Unknown Student",
    institutionalId: record.student?.institutionalId || "",
    status: record.status || "PENDING",
    marksObtained:
      record.marksObtained === null ||
      record.marksObtained === undefined
        ? ""
        : String(record.marksObtained),
    remarks: record.remarks || "",
    originalStatus: record.status || "PENDING",
    originalMarksObtained:
      record.marksObtained === null ||
      record.marksObtained === undefined
        ? ""
        : String(record.marksObtained),
    originalRemarks: record.remarks || "",
  };
}

function isResultChanged(record) {
  return (
    record.status !== record.originalStatus ||
    record.marksObtained !== record.originalMarksObtained ||
    record.remarks !== record.originalRemarks
  );
}

export default function ResultEdit() {
  const location = useLocation();

  const assessment = location.state?.result;
  const assessmentId = getAssessmentId(assessment);

  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(Boolean(assessmentId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const loadResults = useCallback(
    async (signal) => {
      if (!assessmentId) return;

      setLoading(true);
      setError("");
      setNotice("");

      try {
        const response = await api.get(
          `/v1/assessments/manage/${assessmentId}/results`,
          {
            params: {
              page,
              limit: PAGE_SIZE,
              search: search.trim() || undefined,
            },
            signal,
          },
        );

        if (signal?.aborted) return;

        const data = getResponseData(response);

        setResults(
          Array.isArray(data.results)
            ? data.results.map(normalizeResult)
            : [],
        );

        setPagination({
          page: Number(data.pagination?.page) || 1,
          limit: Number(data.pagination?.limit) || PAGE_SIZE,
          total: Number(data.pagination?.total) || 0,
          totalPages: Math.max(
            1,
            Number(data.pagination?.totalPages) || 1,
          ),
        });
      } catch (requestError) {
        if (signal?.aborted) return;

        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load student records.",
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [assessmentId, page, search],
  );

  useEffect(() => {
    const controller = new AbortController();

    Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        loadResults(controller.signal);
      }
    });

    return () => controller.abort();
  }, [loadResults]);

  const changedResults = useMemo(
    () => results.filter(isResultChanged),
    [results],
  );

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const handleResultChange = (studentId, field, value) => {
    setResults((current) =>
      current.map((record) => {
        if (record.studentId !== studentId) {
          return record;
        }

        const updated = {
          ...record,
          [field]: value,
        };

        if (field === "status" && value !== "ENTERED") {
          updated.marksObtained = "";
        }

        return updated;
      }),
    );

    setNotice("");
    setError("");
  };

  const validateResults = () => {
    const errors = [];
    const totalMarks = Number(assessment?.totalMarks);

    for (const record of changedResults) {
      if (!record.studentId) {
        errors.push(
          `${record.studentName}: Student identifier is missing.`,
        );
        continue;
      }

      if (record.status === "ENTERED") {
        if (record.marksObtained === "") {
          errors.push(
            `${record.studentName}: Enter marks before saving.`,
          );
          continue;
        }

        const marks = Number(record.marksObtained);

        if (!Number.isFinite(marks) || marks < 0) {
          errors.push(
            `${record.studentName}: Marks must be a valid non-negative number.`,
          );
          continue;
        }

        if (marks > totalMarks) {
          errors.push(
            `${record.studentName}: Marks cannot exceed ${totalMarks}.`,
          );
        }
      }
    }

    return errors;
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (changedResults.length === 0) {
      setNotice("There are no changes to save.");
      return;
    }

    const validationErrors = validateResults();

    if (validationErrors.length > 0) {
      setError(validationErrors.slice(0, 5).join(" "));
      setNotice("");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        results: changedResults.map((record) => ({
          studentId: record.studentId,
          status: record.status,
          marksObtained:
            record.status === "ENTERED"
              ? Number(record.marksObtained)
              : null,
          remarks: record.remarks,
        })),
      };

      await api.patch(
        `/v1/assessments/manage/${assessmentId}/results`,
        payload,
      );

      setNotice(
        `${changedResults.length} student result(s) saved successfully.`,
      );

      const controller = new AbortController();
      await loadResults(controller.signal);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to save student marks.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!assessmentId) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Academic Oversight"
          title="Marks Entry"
          description="Enter and manage student-wise assessment marks."
          breadcrumbs={[
            { label: "HOD Dashboard", to: "/hod/dashboard" },
            { label: "Results", to: "/hod/results" },
            { label: "Marks Entry" },
          ]}
        />

        <SectionCard>
          <div className="px-5 py-10 text-center">
            <h2 className="text-lg font-semibold text-[#EAEAE6]">
              No assessment selected
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-[#A7A7B0]">
              Open marks entry from the details page of a draft
              assessment.
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

  if (assessment.status !== "DRAFT") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Academic Oversight"
          title="Marks Entry"
          description="Manage student assessment marks."
          breadcrumbs={[
            { label: "HOD Dashboard", to: "/hod/dashboard" },
            { label: "Results", to: "/hod/results" },
            { label: "Marks Entry" },
          ]}
        />

        <SectionCard>
          <div className="rounded-xl border border-[#E5DF98]/20 bg-[#E5DF98]/5 p-5">
            <p className="font-semibold text-[#E5DF98]">
              Marks editing is unavailable
            </p>

            <p className="mt-2 text-sm leading-6 text-[#A7A7B0]">
              Marks can only be edited while the assessment is in
              draft status.
            </p>
          </div>

          <div className="mt-5">
            <Link to="/hod/results">
              <ActionButton variant="secondary">
                Back to Results
              </ActionButton>
            </Link>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Academic Oversight"
        title="Student Marks Entry"
        description="Enter marks, update result statuses and save student results in bulk."
        breadcrumbs={[
          { label: "HOD Dashboard", to: "/hod/dashboard" },
          { label: "Results", to: "/hod/results" },
          { label: "Marks Entry" },
        ]}
        actions={
          <Link
            to="/hod/results/details"
            state={{ result: assessment }}
          >
            <ActionButton variant="secondary">
              Assessment Details
            </ActionButton>
          </Link>
        }
      />

      <SectionCard
        title={assessment.title || "Assessment"}
        description="Assessment marks configuration"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#343640] bg-[#1D1F27] p-4">
            <p className="text-xs text-[#A7A7B0]">Assessment Type</p>
            <p className="mt-2 font-semibold text-[#EAEAE6]">
              {assessment.type}
            </p>
          </div>

          <div className="rounded-xl border border-[#343640] bg-[#1D1F27] p-4">
            <p className="text-xs text-[#A7A7B0]">Maximum Marks</p>
            <p className="mt-2 font-semibold text-[#EAEAE6]">
              {assessment.totalMarks}
            </p>
          </div>

          <div className="rounded-xl border border-[#343640] bg-[#1D1F27] p-4">
            <p className="text-xs text-[#A7A7B0]">Passing Marks</p>
            <p className="mt-2 font-semibold text-[#EAEAE6]">
              {assessment.passingMarks}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Student Records"
        description="Update marks and result status for students assigned to this assessment."
        action={
          <span className="rounded-full border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 px-3 py-1 text-xs font-semibold text-[#CDB5F7]">
            {changedResults.length} unsaved changes
          </span>
        }
      >
        <div className="mb-5">
          <label
            htmlFor="marks-student-search"
            className="mb-2 block text-sm font-medium text-[#EAEAE6]"
          >
            Search Students
          </label>

          <input
            id="marks-student-search"
            type="search"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by student name or institutional ID"
            className="w-full rounded-xl border border-[#343640] bg-[#1D1F27] px-4 py-3 text-sm text-[#EAEAE6] outline-none placeholder:text-[#858590] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
          />
        </div>

        {loading ? (
          <div className="flex min-h-40 items-center justify-center">
            <p className="text-sm text-[#A7A7B0]">
              Loading student records...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-5">
            <p className="text-sm font-semibold text-red-300">
              Something went wrong
            </p>

            <p className="mt-2 text-sm text-[#A7A7B0]">
              {error}
            </p>

            <div className="mt-4">
              <ActionButton
                variant="secondary"
                onClick={() => {
                  const controller = new AbortController();
                  loadResults(controller.signal);
                }}
              >
                Try Again
              </ActionButton>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-xl border border-[#343640] bg-[#1D1F27] px-5 py-10 text-center">
            <p className="font-semibold text-[#EAEAE6]">
              No student records found
            </p>

            <p className="mt-2 text-sm text-[#A7A7B0]">
              No students match the current search.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-[#26272B] text-xs uppercase tracking-wide text-[#A7A7B0]">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Institutional ID</th>
                    <th className="px-4 py-3">Marks Obtained</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Remarks</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {results.map((record) => (
                    <tr
                      key={record.id}
                      className="align-top text-[#EAEAE6] hover:bg-[#26272B]/50"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold">
                          {record.studentName}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-[#A7A7B0]">
                        {record.institutionalId || "—"}
                      </td>

                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          max={assessment.totalMarks}
                          step="any"
                          value={record.marksObtained}
                          disabled={record.status !== "ENTERED"}
                          onChange={(event) =>
                            handleResultChange(
                              record.studentId,
                              "marksObtained",
                              event.target.value,
                            )
                          }
                          aria-label={`Marks for ${record.studentName}`}
                          placeholder="Enter marks"
                          className="w-32 rounded-lg border border-[#454650] bg-[#1D1F27] px-3 py-2 text-sm text-[#EAEAE6] outline-none transition focus:border-[#CDB5F7] disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <select
                          value={record.status}
                          onChange={(event) =>
                            handleResultChange(
                              record.studentId,
                              "status",
                              event.target.value,
                            )
                          }
                          aria-label={`Status for ${record.studentName}`}
                          className="w-40 rounded-lg border border-[#454650] bg-[#1D1F27] px-3 py-2 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7]"
                        >
                          {RESULT_STATUSES.map((status) => (
                            <option
                              key={status.value}
                              value={status.value}
                            >
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-4">
                        <input
                          type="text"
                          maxLength={1000}
                          value={record.remarks}
                          onChange={(event) =>
                            handleResultChange(
                              record.studentId,
                              "remarks",
                              event.target.value,
                            )
                          }
                          aria-label={`Remarks for ${record.studentName}`}
                          placeholder="Optional remarks"
                          className="w-48 rounded-lg border border-[#454650] bg-[#1D1F27] px-3 py-2 text-sm text-[#EAEAE6] outline-none placeholder:text-[#858590] focus:border-[#CDB5F7]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-[#A7A7B0]">
                Page {pagination.page} of {pagination.totalPages}
                {" · "}
                {pagination.total} student records
              </p>

              <div className="flex items-center gap-2">
                <ActionButton
                  type="button"
                  variant="secondary"
                  disabled={page <= 1 || saving}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </ActionButton>

                <ActionButton
                  type="button"
                  variant="secondary"
                  disabled={
                    page >= pagination.totalPages || saving
                  }
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </ActionButton>
              </div>
            </div>

            {notice && (
              <div
                role="status"
                className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-300"
              >
                {notice}
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-[#343640] pt-5">
              <Link
                to="/hod/results/details"
                state={{ result: assessment }}
              >
                <ActionButton type="button" variant="secondary">
                  Cancel
                </ActionButton>
              </Link>

              <ActionButton
                type="submit"
                disabled={saving || loading || changedResults.length === 0}
              >
                {saving ? "Saving Marks..." : "Save Marks"}
              </ActionButton>
            </div>
          </form>
        )}
      </SectionCard>
    </div>
  );
}