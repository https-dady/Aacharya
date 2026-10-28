import { useCallback, useEffect, useMemo, useState } from 'react';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import LoadingState from '../../components/LoadingState.jsx';

import notificationService from '../../services/notificationService.js';

function formatDate(value) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getErrorMessage(error) {
  if (error?.response?.status === 401) {
    return 'Your session may have expired. Please sign in again.';
  }

  if (error?.response?.status === 403) {
    return 'Your account does not currently have access to announcements.';
  }

  return (
    error?.message ||
    'Unable to load official announcements. Please try again.'
  );
}

export default function StudentAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await notificationService.getNotifications({
        page: 1,
        limit: 100,
        type: 'announcement',
      });

      setAnnouncements(result.items);
    } catch (error) {
      setAnnouncements([]);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const filteredAnnouncements = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return announcements;

    return announcements.filter((announcement) =>
      [
        announcement.title,
        announcement.message,
        announcement.type,
      ].some(
        (value) =>
          typeof value === 'string' &&
          value.toLowerCase().includes(query),
      ),
    );
  }, [announcements, searchQuery]);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="STUDENT WORKSPACE"
        title="Official Announcements"
        description="Read official announcements and institutional updates available to your account."
        breadcrumbs={[
          { label: 'Student', to: '/student/dashboard' },
          { label: 'Official Announcements' },
        ]}
      />

      <section className="rounded-2xl border border-[#343640] bg-[#202126] p-5 sm:p-6">
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
              Announcements returned by the server for your authenticated
              account will appear here.
            </p>
          </div>
        </div>
      </section>

      {errorMessage && (
        <section
          role="alert"
          className="rounded-xl border border-rose-400/20 bg-[#202126] p-5"
        >
          <h2 className="font-semibold text-[#EAEAE6]">
            Unable to load announcements
          </h2>

          <p className="mt-2 text-sm text-rose-200">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={loadAnnouncements}
            className="mt-4 rounded-xl border border-[#454650] px-4 py-2 text-sm font-semibold text-[#CDB5F7] transition hover:border-[#CDB5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            Retry
          </button>
        </section>
      )}

      <SectionCard
        title="Announcements"
        description="Search and open official announcements available to your account."
      >
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
          placeholder="Search by title or content..."
          className={[
            'w-full rounded-xl border border-[#3B3C43]',
            'bg-[#26272B] px-4 py-3 text-sm text-[#EAEAE6]',
            'placeholder:text-[#777985] focus:border-[#CDB5F7]',
            'focus:outline-none focus:ring-2 focus:ring-[#CDB5F7]/20',
          ].join(' ')}
        />

        <p className="mt-4 text-sm text-[#A5A6B0]" aria-live="polite">
          {isLoading
            ? 'Loading announcements…'
            : `${filteredAnnouncements.length} announcements available`}
        </p>

        <div className="mt-5 border-t border-[#343640] pt-5">
          {isLoading ? (
            <LoadingState
              message="Loading official announcements"
              rows={3}
            />
          ) : filteredAnnouncements.length === 0 ? (
            <EmptyState
              title={
                errorMessage
                  ? 'Announcements unavailable'
                  : searchQuery
                    ? 'No matching announcements'
                    : 'No official announcements yet'
              }
              description={
                errorMessage
                  ? 'Retry to check whether announcements are available.'
                  : searchQuery
                    ? 'Try another search term.'
                    : 'Official announcements will appear here when they are published for your account.'
              }
              icon="§"
              action={
                errorMessage ? (
                  <button
                    type="button"
                    onClick={loadAnnouncements}
                    className="rounded-xl border border-[#3B3C43] px-4 py-2.5 text-sm font-medium text-[#EAEAE6] transition hover:bg-[#26272B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                  >
                    Retry
                  </button>
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="rounded-xl border border-[#3B3C43] px-4 py-2.5 text-sm font-medium text-[#EAEAE6] transition hover:bg-[#26272B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                  >
                    Clear search
                  </button>
                ) : null
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredAnnouncements.map((announcement) => {
                const id = announcement.id || announcement._id;

                return (
                  <article
                    key={id}
                    className="rounded-xl border border-[#343640] bg-[#26272B] p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#CDB5F7]/10 px-3 py-1 text-xs font-medium capitalize text-[#CDB5F7]">
                        {announcement.type || 'Announcement'}
                      </span>

                      <span className="text-xs text-[#777985]">
                        {formatDate(announcement.createdAt)}
                      </span>
                    </div>

                    <h3 className="mt-3 break-words font-semibold text-[#EAEAE6]">
                      {announcement.title || 'Untitled announcement'}
                    </h3>

                    <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-[#A5A6B0]">
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
                );
              })}
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
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#CDB5F7]">
                  Official announcement
                </p>

                <h2
                  id="announcement-detail-title"
                  className="mt-2 break-words text-xl font-semibold text-[#EAEAE6]"
                >
                  {selectedAnnouncement.title || 'Untitled announcement'}
                </h2>

                <p className="mt-2 text-xs text-[#777985]">
                  Published {formatDate(selectedAnnouncement.createdAt)}
                </p>
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

            <span className="mt-4 inline-flex rounded-full bg-[#CDB5F7]/10 px-3 py-1 text-xs font-medium capitalize text-[#CDB5F7]">
              {selectedAnnouncement.type || 'Announcement'}
            </span>

            <div className="mt-5 max-h-[55vh] overflow-y-auto">
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-[#C4C5CD]">
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