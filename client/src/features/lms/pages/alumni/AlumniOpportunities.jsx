import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import EmptyState from "../../components/EmptyState.jsx";

const opportunities = [];

const EMPLOYMENT_TYPES = [
  "All Types",
  "Full-time",
  "Part-time",
  "Internship",
  "Contract",
  "Remote",
];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function matchesEmploymentType(opportunity, selectedType) {
  if (selectedType === "All Types") {
    return true;
  }

  if (selectedType === "Remote") {
    return (
      normalize(opportunity.workMode) === "remote" ||
      normalize(opportunity.location) === "remote"
    );
  }

  return normalize(opportunity.employmentType) === normalize(selectedType);
}

function OpportunityCard({ opportunity }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-semibold text-slate-900 dark:text-white">
            {opportunity.title}
          </h3>

          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
            {opportunity.company}
          </p>
        </div>

        {opportunity.employmentType && (
          <span className="w-fit shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
            {opportunity.employmentType}
          </span>
        )}
      </div>

      {opportunity.description && (
        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-400">
          {opportunity.description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {opportunity.location && (
          <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            📍 {opportunity.location}
          </span>
        )}

        {opportunity.workMode && (
          <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {opportunity.workMode}
          </span>
        )}

        {opportunity.experience && (
          <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {opportunity.experience}
          </span>
        )}

        {opportunity.salary && (
          <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {opportunity.salary}
          </span>
        )}
      </div>

      {opportunity.applicationUrl && (
        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
          <a
            href={opportunity.applicationUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            View Application
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      )}
    </article>
  );
}

export default function AlumniOpportunities() {
  const [search, setSearch] = useState("");
  const [employmentType, setEmploymentType] = useState("All Types");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState("All Modes");

  const filteredOpportunities = useMemo(() => {
    const query = normalize(search);
    const locationQuery = normalize(location);

    return opportunities.filter((opportunity) => {
      const searchableText = [
        opportunity.title,
        opportunity.company,
        opportunity.description,
        opportunity.location,
        opportunity.employmentType,
        opportunity.workMode,
        opportunity.experience,
      ]
        .map(normalize)
        .join(" ");

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesLocation =
        !locationQuery ||
        normalize(opportunity.location).includes(locationQuery);

      const matchesType = matchesEmploymentType(
        opportunity,
        employmentType,
      );

      const matchesWorkMode =
        workMode === "All Modes" ||
        normalize(opportunity.workMode) === normalize(workMode);

      return (
        matchesSearch &&
        matchesLocation &&
        matchesType &&
        matchesWorkMode
      );
    });
  }, [search, location, employmentType, workMode]);

  function resetFilters() {
    setSearch("");
    setEmploymentType("All Types");
    setLocation("");
    setWorkMode("All Modes");
  }

  const hasActiveFilters = Boolean(
    search ||
      location ||
      employmentType !== "All Types" ||
      workMode !== "All Modes",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Career Opportunities"
        description="Discover career opportunities and professional openings available to the alumni community."
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Find Your Next Opportunity
            </h2>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Search and filter opportunities based on your preferences.
            </p>
          </div>

          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {filteredOpportunities.length}{" "}
            {filteredOpportunities.length === 1
              ? "opportunity"
              : "opportunities"}
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="sm:col-span-2 xl:col-span-4">
            <label
              htmlFor="opportunity-search"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Search opportunities
            </label>

            <input
              id="opportunity-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search job title, company, skills..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label
              htmlFor="opportunity-type"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Employment Type
            </label>

            <select
              id="opportunity-type"
              value={employmentType}
              onChange={(event) =>
                setEmploymentType(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {EMPLOYMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="opportunity-location"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Location
            </label>

            <input
              id="opportunity-location"
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Enter a city or region"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="opportunity-work-mode"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Work Mode
            </label>

            <select
              id="opportunity-work-mode"
              value={workMode}
              onChange={(event) => setWorkMode(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {["All Modes", "Remote", "Hybrid", "On-site"].map(
                (mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </section>

      <SectionCard
        title="Available Opportunities"
        description="Opportunities will be displayed here when the listing data is connected."
      >
        {filteredOpportunities.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredOpportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={
              opportunities.length === 0
                ? "No opportunities available yet"
                : "No matching opportunities found"
            }
            description={
              opportunities.length === 0
                ? "Career listings will appear here when opportunity data becomes available through the platform."
                : "Try changing your search terms or filters to find matching opportunities."
            }
          />
        )}
      </SectionCard>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Looking for your alumni account details?
        </p>

        <Link
          to="/alumni/profile"
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Manage Alumni Profile →
        </Link>
      </div>
    </div>
  );
}