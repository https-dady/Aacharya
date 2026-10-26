// client/src/features/lms/pages/student/StudentCareerResources.jsx

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import EmptyState from "../../components/EmptyState.jsx";

const RESOURCE_CATEGORIES = [
  "All categories",
  "Programming",
  "Data Science",
  "Artificial Intelligence",
  "Web Development",
  "Career Preparation",
  "Other",
];

const RESOURCE_PROVIDERS = [
  "All providers",
  "SWAYAM",
  "NPTEL",
  "Other",
];

export default function StudentCareerResources() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("All categories");
  const [selectedProvider, setSelectedProvider] =
    useState("All providers");
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  // Backend integration pending. Do not invent learning resources.
  const resources = [];
  const bookmarkedResourceIds = [];

  const filteredResources = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return resources.filter((resource) => {
      const matchesSearch =
        !query ||
        resource.title?.toLowerCase().includes(query) ||
        resource.description?.toLowerCase().includes(query) ||
        resource.provider?.toLowerCase().includes(query);

      const matchesCategory =
        selectedCategory === "All categories" ||
        resource.category === selectedCategory;

      const matchesProvider =
        selectedProvider === "All providers" ||
        (selectedProvider === "Other"
          ? !["SWAYAM", "NPTEL"].includes(resource.provider)
          : resource.provider === selectedProvider);

      const matchesBookmark =
        !showBookmarkedOnly ||
        bookmarkedResourceIds.includes(resource.id);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesProvider &&
        matchesBookmark
      );
    });
  }, [
    resources,
    bookmarkedResourceIds,
    searchQuery,
    selectedCategory,
    selectedProvider,
    showBookmarkedOnly,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategory !== "All categories" ||
    selectedProvider !== "All providers" ||
    showBookmarkedOnly;

  function resetFilters() {
    setSearchQuery("");
    setSelectedCategory("All categories");
    setSelectedProvider("All providers");
    setShowBookmarkedOnly(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CampusX · Career Development"
        title="Learning Resources"
        description="Discover learning resources that can support your skills development and career preparation."
        breadcrumbs={[
          { label: "Student", to: "/student/dashboard" },
          { label: "CampusX Resources" },
        ]}
      />

      <div className="rounded-2xl border border-[#343640] bg-[#202126] p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#CDB5F7]/10 text-xl text-[#CDB5F7]"
          >
            ◈
          </div>

          <div>
            <h2 className="font-semibold text-[#EAEAE6]">
              Build skills with relevant learning material
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
              Explore resources from supported learning providers. Resources
              and personalized recommendations will appear when the catalogue
              is connected.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {["SWAYAM", "NPTEL"].map((provider) => (
                <span
                  key={provider}
                  className="rounded-full border border-[#3B3C43] px-3 py-1.5 text-xs font-medium text-[#CDB5F7]"
                >
                  {provider}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <SectionCard
        title="Explore Resources"
        description="Search and filter available learning resources."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="career-resource-search"
              className="mb-2 block text-sm font-medium text-[#EAEAE6]"
            >
              Search resources
            </label>

            <input
              id="career-resource-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by title, topic, or provider..."
              className="w-full rounded-xl border border-[#3B3C43] bg-[#26272B] px-4 py-3 text-sm text-[#EAEAE6] placeholder:text-[#777985] focus:border-[#CDB5F7] focus:outline-none focus:ring-2 focus:ring-[#CDB5F7]/20"
            />
          </div>

          <div>
            <label
              htmlFor="career-resource-category"
              className="mb-2 block text-sm font-medium text-[#EAEAE6]"
            >
              Category
            </label>

            <select
              id="career-resource-category"
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(event.target.value)
              }
              className="w-full rounded-xl border border-[#3B3C43] bg-[#26272B] px-4 py-3 text-sm text-[#EAEAE6] focus:border-[#CDB5F7] focus:outline-none focus:ring-2 focus:ring-[#CDB5F7]/20"
            >
              {RESOURCE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="career-resource-provider"
              className="mb-2 block text-sm font-medium text-[#EAEAE6]"
            >
              Learning provider
            </label>

            <select
              id="career-resource-provider"
              value={selectedProvider}
              onChange={(event) =>
                setSelectedProvider(event.target.value)
              }
              className="w-full rounded-xl border border-[#3B3C43] bg-[#26272B] px-4 py-3 text-sm text-[#EAEAE6] focus:border-[#CDB5F7] focus:outline-none focus:ring-2 focus:ring-[#CDB5F7]/20"
            >
              {RESOURCE_PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4">
          <p className="text-sm text-[#A5A6B0]" aria-live="polite">
            {filteredResources.length} resources found
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#C4C5CD]">
              <input
                type="checkbox"
                checked={showBookmarkedOnly}
                onChange={(event) =>
                  setShowBookmarkedOnly(event.target.checked)
                }
                className="h-4 w-4 rounded border-[#3B3C43] accent-[#CDB5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              />
              Bookmarked only
            </label>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[#CDB5F7] transition hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Available Learning Resources"
        description="Open a resource to continue learning on its supported platform."
      >
        {filteredResources.length === 0 ? (
          <EmptyState
            title={
              hasActiveFilters
                ? "No matching resources"
                : "Resource catalogue is not available yet"
            }
            description={
              hasActiveFilters
                ? "Try changing your search, category, provider, or bookmark filter."
                : "Learning resources will appear here when the CampusX resource catalogue is connected."
            }
            icon="◈"
            action={
              hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl border border-[#3B3C43] px-4 py-2.5 text-sm font-medium text-[#EAEAE6] transition hover:bg-[#26272B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                >
                  Reset filters
                </button>
              ) : null
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredResources.map((resource) => {
              const isBookmarked = bookmarkedResourceIds.includes(
                resource.id
              );

              return (
                <article
                  key={resource.id}
                  className="rounded-xl border border-[#343640] bg-[#26272B] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#CDB5F7]">
                        {resource.provider || "Learning resource"}
                      </p>

                      <h3 className="mt-2 break-words font-semibold text-[#EAEAE6]">
                        {resource.title}
                      </h3>
                    </div>

                    {isBookmarked && (
                      <span className="rounded-full bg-[#CDB5F7]/10 px-2.5 py-1 text-xs text-[#CDB5F7]">
                        Bookmarked
                      </span>
                    )}
                  </div>

                  {resource.description && (
                    <p className="mt-3 text-sm leading-6 text-[#A5A6B0]">
                      {resource.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {resource.category && (
                      <span className="rounded-full border border-[#3B3C43] px-3 py-1 text-xs text-[#A5A6B0]">
                        {resource.category}
                      </span>
                    )}

                    {resource.resourceType && (
                      <span className="rounded-full border border-[#3B3C43] px-3 py-1 text-xs text-[#A5A6B0]">
                        {resource.resourceType}
                      </span>
                    )}
                  </div>

                  <div className="mt-5 border-t border-[#343640] pt-4">
                    {resource.sourceUrl ? (
                      <a
                        href={resource.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-[#CDB5F7] px-4 py-2.5 text-sm font-semibold text-[#211A2B] transition hover:bg-[#DDCCFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                      >
                        Open external resource
                        <span aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <span className="text-sm text-[#777985]">
                        External link unavailable
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#343640] bg-[#202126] p-5">
        <div>
          <h2 className="font-semibold text-[#EAEAE6]">
            Continue your career journey
          </h2>
          <p className="mt-1 text-sm text-[#A5A6B0]">
            Explore available career opportunities when the next module is ready.
          </p>
        </div>

        <Link
          to="/student/career/opportunities"
          className="rounded-xl border border-[#CDB5F7]/30 px-4 py-2.5 text-sm font-medium text-[#CDB5F7] transition hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          Career Opportunities
          <span className="ml-2" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}