// client/src/features/lms/pages/student/StudentDocumentVault.jsx

import { useMemo, useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import EmptyState from "../../components/EmptyState.jsx";

const DOCUMENT_CATEGORIES = [
  "All Documents",
  "Academic",
  "Administrative",
  "Personal",
  "Other",
];

export default function StudentDocumentVault() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("All Documents");

  // Backend integration pending.
  // Do not populate this list with fabricated document records.
  const documents = [];

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return documents.filter((document) => {
      const matchesSearch =
        !normalizedQuery ||
        document.name?.toLowerCase().includes(normalizedQuery) ||
        document.description?.toLowerCase().includes(normalizedQuery);

      const matchesCategory =
        selectedCategory === "All Documents" ||
        document.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [documents, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student Workspace"
        title="Document Vault"
        description="Access your available academic and personal documents from one place."
        breadcrumbs={[
          { label: "Student", to: "/student/dashboard" },
          { label: "Document Vault" },
        ]}
      />

      <SectionCard
        title="Your Documents"
        description="Search and filter documents available to your account."
        icon="▤"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="document-search"
              className="mb-2 block text-sm font-medium text-[#EAEAE6]"
            >
              Search documents
            </label>

            <input
              id="document-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by document name..."
              className="w-full rounded-xl border border-[#3B3C43] bg-[#26272B] px-4 py-3 text-sm text-[#EAEAE6] placeholder:text-[#777985] focus:border-[#CDB5F7] focus:outline-none focus:ring-2 focus:ring-[#CDB5F7]/20"
            />
          </div>

          <div>
            <label
              htmlFor="document-category"
              className="mb-2 block text-sm font-medium text-[#EAEAE6]"
            >
              Document category
            </label>

            <select
              id="document-category"
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(event.target.value)
              }
              className="w-full rounded-xl border border-[#3B3C43] bg-[#26272B] px-4 py-3 text-sm text-[#EAEAE6] focus:border-[#CDB5F7] focus:outline-none focus:ring-2 focus:ring-[#CDB5F7]/20"
            >
              {DOCUMENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4"
          aria-live="polite"
        >
          <p className="text-sm text-[#A5A6B0]">
            {filteredDocuments.length} documents available
          </p>

          {(searchQuery || selectedCategory !== "All Documents") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All Documents");
              }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-[#CDB5F7] transition hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
            >
              Clear filters
            </button>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Available Documents"
        description="Only documents made available to your account will appear here."
        icon="▧"
      >
        {filteredDocuments.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredDocuments.map((document) => (
              <article
                key={document.id}
                className="rounded-xl border border-[#343640] bg-[#26272B] p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#CDB5F7]/10 text-lg text-[#CDB5F7]"
                    aria-hidden="true"
                  >
                    ▤
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-semibold text-[#EAEAE6]">
                      {document.name}
                    </h3>

                    <p className="mt-1 text-xs text-[#A5A6B0]">
                      {document.category}
                    </p>
                  </div>
                </div>

                {document.description && (
                  <p className="mt-3 break-words text-sm leading-6 text-[#A5A6B0]">
                    {document.description}
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#343640] pt-3">
                  <span className="text-xs text-[#A5A6B0]">
                    {document.fileType || "Document"}
                  </span>

                  {document.accessUrl ? (
                    <a
                      href={document.accessUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-[#CDB5F7]/30 px-3 py-2 text-sm font-medium text-[#CDB5F7] transition hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                    >
                      Open document
                    </a>
                  ) : (
                    <span className="text-xs text-[#A5A6B0]">
                      Access unavailable
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title={
              searchQuery || selectedCategory !== "All Documents"
                ? "No matching documents"
                : "No documents available yet"
            }
            description={
              searchQuery || selectedCategory !== "All Documents"
                ? "Try changing your search term or selecting another category."
                : "Documents shared with your account will appear here when they become available."
            }
            icon="▤"
            action={
              (searchQuery ||
                selectedCategory !== "All Documents") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All Documents");
                  }}
                  className="rounded-xl border border-[#3B3C43] px-4 py-2.5 text-sm font-medium text-[#EAEAE6] transition hover:bg-[#26272B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                >
                  Reset filters
                </button>
              )
            }
          />
        )}
      </SectionCard>
    </div>
  );
}