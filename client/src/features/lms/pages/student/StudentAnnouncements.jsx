import { useMemo, useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import EmptyState from "../../components/EmptyState.jsx";

export default function StudentAnnouncements() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  // Backend integration pending. Do not display fabricated announcements.
  const announcements = [];

  const filteredAnnouncements = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return announcements;

    return announcements.filter((announcement) =>
      [
        announcement.title,
        announcement.message,
        announcement.category,
      ].some((value) => value?.toLowerCase().includes(query))
    );
  }, [announcements, searchQuery]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student Workspace"
        title="Official Announcements"
        description="Read official academic and institutional announcements relevant to your account."
        breadcrumbs={[
          { label: "Student", to: "/student/dashboard" },
          { label: "Official Announcements" },
        ]}
      />

      <div className="rounded-2xl border border-[#343640] bg-[#202126] p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#CDB5F7]/10 text-xl text-[#CDB5F7]"
          >
            §
          </div>

          <div>
            <h2 className="font-semibold text-[#EAEAE6]">
              Institutional updates
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#A5A6B0]">
              Official announcements published for eligible recipients will
              appear here. Email delivery and in-app notifications are separate
              channels.
            </p>
          </div>
        </div>
      </div>

      <SectionCard
        title="Announcements"
        description="Search and open announcements published for your account."
      >
        <div>
          <label
            htmlFor="announcement-search"
            className="mb-2 block text-sm font-medium text-[#EAEAE6]"
          >
            Search announcements
          </label>

          <input
            id="announcement-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by title, content, or category..."
            className="w-full rounded-xl border border-[#3B3C43] bg-[#26272B] px-4 py-3 text-sm text-[#EAEAE6] placeholder:text-[#777985] focus:border-[#CDB5F7] focus:outline-none focus:ring-2 focus:ring-[#CDB5F7]/20"
          />
        </div>

        <p
          className="mt-4 text-sm text-[#A5A6B0]"
          aria-live="polite"
        >
          {filteredAnnouncements.length} announcements available
        </p>

        <div className="mt-5 border-t border-[#343640] pt-5">
          {filteredAnnouncements.length === 0 ? (
            <EmptyState
              title={
                searchQuery
                  ? "No matching announcements"
                  : "No official announcements yet"
              }
              description={
                searchQuery
                  ? "Try another search term."
                  : "Official announcements will appear here when they are published and made available to your account."
              }
              icon="§"
              action={
                searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="rounded-xl border border-[#3B3C43] px-4 py-2.5 text-sm font-medium text-[#EAEAE6] transition hover:bg-[#26272B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                  >
                    Clear search
                  </button>
                ) : null
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredAnnouncements.map((announcement) => (
                <article
                  key={announcement.id}
                  className="rounded-xl border border-[#343640] bg-[#26272B] p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {announcement.category && (
                      <span className="rounded-full bg-[#CDB5F7]/10 px-3 py-1 text-xs font-medium text-[#CDB5F7]">
                        {announcement.category}
                      </span>
                    )}

                    {announcement.publishedAt && (
                      <span className="text-xs text-[#777985]">
                        {announcement.publishedAt}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 font-semibold text-[#EAEAE6]">
                    {announcement.title}
                  </h3>

                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#A5A6B0]">
                    {announcement.message}
                  </p>

                  <button
                    type="button"
                    onClick={() => setSelectedAnnouncement(announcement)}
                    className="mt-4 rounded-lg border border-[#CDB5F7]/30 px-3 py-2 text-sm font-medium text-[#CDB5F7] transition hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                  >
                    Read announcement
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      {selectedAnnouncement && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedAnnouncement(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-detail-title"
            className="w-full max-w-2xl rounded-t-2xl border border-[#343640] bg-[#202126] p-6 shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#CDB5F7]">
                  Official announcement
                </p>

                <h2
                  id="announcement-detail-title"
                  className="mt-2 text-xl font-semibold text-[#EAEAE6]"
                >
                  {selectedAnnouncement.title}
                </h2>

                {selectedAnnouncement.publishedAt && (
                  <p className="mt-2 text-xs text-[#777985]">
                    Published {selectedAnnouncement.publishedAt}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                aria-label="Close announcement details"
                className="rounded-lg px-3 py-2 text-[#A5A6B0] transition hover:bg-[#343640] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                ✕
              </button>
            </div>

            {selectedAnnouncement.category && (
              <span className="mt-4 inline-flex rounded-full bg-[#CDB5F7]/10 px-3 py-1 text-xs font-medium text-[#CDB5F7]">
                {selectedAnnouncement.category}
              </span>
            )}

            <div className="mt-5 max-h-[55vh] overflow-y-auto">
              <p className="whitespace-pre-wrap text-sm leading-7 text-[#C4C5CD]">
                {selectedAnnouncement.message}
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="rounded-xl bg-[#CDB5F7] px-4 py-2.5 text-sm font-semibold text-[#211A2B] transition hover:bg-[#DDCCFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#202126]"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}