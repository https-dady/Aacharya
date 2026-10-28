import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import notificationService from '../../services/notificationService.js';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';

const PAGE_SIZE = 20;

const FILTER_OPTIONS = [
  { label: 'All notifications', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Read', value: 'read' },
];

function getNotificationId(notification) {
  return String(notification?._id ?? notification?.id ?? '');
}

function isNotificationRead(notification) {
  return Boolean(notification?.readAt);
}

function formatDate(value) {
  if (!value) {
    return 'Date unavailable';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatLabel(value) {
  if (!value || typeof value !== 'string') {
    return 'Notification';
  }

  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getPriorityClasses(priority) {
  switch (priority) {
    case 'urgent':
      return 'border-red-400/30 bg-red-400/10 text-red-300';

    case 'high':
      return 'border-amber-300/30 bg-amber-300/10 text-amber-200';

    case 'low':
      return 'border-[#454650] bg-[#26272B] text-[#A5A6B0]';

    default:
      return 'border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-[#CDB5F7]';
  }
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function StatCard({ label, value, accent = false }) {
  return (
    <div className="rounded-2xl border border-[#343640] bg-[#202126] p-5">
      <p className="text-sm text-[#A5A6B0]">{label}</p>

      <p
        className={`mt-3 text-3xl font-semibold ${
          accent ? 'text-[#CDB5F7]' : 'text-[#EAEAE6]'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function NotificationItem({
  notification,
  onSelect,
  onMarkAsRead,
  markingId,
}) {
  const notificationId = getNotificationId(notification);
  const read = isNotificationRead(notification);
  const marking = markingId === notificationId;

  return (
    <article
      className={`rounded-xl border p-4 transition-colors ${
        read
          ? 'border-[#343640] bg-[#202126]/60'
          : 'border-[#CDB5F7]/25 bg-[#CDB5F7]/[0.04]'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
            read ? 'bg-[#777985]' : 'bg-[#CDB5F7]'
          }`}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-sm font-semibold text-[#EAEAE6]">
              {notification.title}
            </h3>

            {!read && (
              <span className="rounded-full bg-[#CDB5F7]/10 px-2 py-1 text-xs font-medium text-[#CDB5F7]">
                Unread
              </span>
            )}
          </div>

          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#A5A6B0]">
            {notification.message}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#454650] px-2.5 py-1 text-xs text-[#A5A6B0]">
              {formatLabel(notification.type)}
            </span>

            {notification.priority && (
              <span
                className={`rounded-full border px-2.5 py-1 text-xs ${getPriorityClasses(
                  notification.priority,
                )}`}
              >
                {formatLabel(notification.priority)} priority
              </span>
            )}
          </div>

          <p className="mt-3 text-xs text-[#777985]">
            {formatDate(notification.createdAt)}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onSelect(notification)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-[#CDB5F7] transition hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
            >
              View details
            </button>

            {!read && (
              <button
                type="button"
                onClick={() => onMarkAsRead(notification)}
                disabled={marking}
                className="rounded-lg border border-[#454650] px-3 py-2 text-sm font-medium text-[#EAEAE6] transition hover:border-[#CDB5F7] hover:text-[#CDB5F7] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                {marking ? 'Marking...' : 'Mark as read'}
              </button>
            )}

            {notification.actionUrl && (
              <Link
                to={notification.actionUrl}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[#E5DF98] transition hover:bg-[#E5DF98]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5DF98]"
              >
                Open related page
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedNotification, setSelectedNotification] = useState(null);

  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [listResult, unreadResult] = await Promise.all([
        notificationService.getNotifications({
          page: currentPage,
          limit: PAGE_SIZE,
          unreadOnly: activeFilter === 'unread' ? true : undefined,
        }),
        notificationService.getUnreadCount(),
      ]);

      if (!listResult || !Array.isArray(listResult.items)) {
        throw new Error(
          'The server returned an invalid notifications list.',
        );
      }

      setNotifications(listResult.items);
      setPagination(listResult.pagination);
      setUnreadCount(unreadResult);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          'Unable to load notifications. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [activeFilter, currentPage]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return notifications.filter((notification) => {
      const matchesSearch =
        !query ||
        notification.title?.toLowerCase().includes(query) ||
        notification.message?.toLowerCase().includes(query) ||
        notification.type?.toLowerCase().includes(query);

      const read = isNotificationRead(notification);

      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'unread' && !read) ||
        (activeFilter === 'read' && read);

      return matchesSearch && matchesFilter;
    });
  }, [notifications, searchQuery, activeFilter]);

  const totalNotifications =
    pagination && Number.isSafeInteger(pagination.total)
      ? pagination.total
      : notifications.length;

  const totalPages =
    pagination && Number.isSafeInteger(pagination.totalPages)
      ? pagination.totalPages
      : 1;

  const handleFilterChange = (event) => {
    setActiveFilter(event.target.value);
    setCurrentPage(1);
    setSuccessMessage('');
    setActionError('');
  };

  const handleMarkAsRead = async (notification) => {
    const notificationId = getNotificationId(notification);

    if (!notificationId || isNotificationRead(notification)) {
      return;
    }

    setMarkingId(notificationId);
    setActionError('');
    setSuccessMessage('');

    try {
      await notificationService.markAsRead(notificationId);

      const readAt = new Date().toISOString();

      setNotifications((current) =>
        current.map((item) =>
          getNotificationId(item) === notificationId
            ? { ...item, readAt }
            : item,
        ),
      );

      setSelectedNotification((current) =>
        current &&
        getNotificationId(current) === notificationId
          ? { ...current, readAt }
          : current,
      );

      setUnreadCount((current) => Math.max(0, current - 1));
      setSuccessMessage('Notification marked as read.');
    } catch (requestError) {
      setActionError(
        getErrorMessage(
          requestError,
          'Unable to mark this notification as read.',
        ),
      );
    } finally {
      setMarkingId('');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) {
      return;
    }

    setMarkingAll(true);
    setActionError('');
    setSuccessMessage('');

    try {
      await notificationService.markAllAsRead();

      const readAt = new Date().toISOString();

      setNotifications((current) =>
        current.map((notification) =>
          isNotificationRead(notification)
            ? notification
            : { ...notification, readAt },
        ),
      );

      setSelectedNotification((current) =>
        current && !isNotificationRead(current)
          ? { ...current, readAt }
          : current,
      );

      setUnreadCount(0);
      setSuccessMessage('All notifications marked as read.');
    } catch (requestError) {
      setActionError(
        getErrorMessage(
          requestError,
          'Unable to mark all notifications as read.',
        ),
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setActiveFilter('all');
    setCurrentPage(1);
    setSuccessMessage('');
    setActionError('');
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="Student Workspace"
        title="Notifications"
        description="View important updates and notifications related to your academic activities."
        breadcrumbs={[
          { label: 'Student', to: '/student/dashboard' },
          { label: 'Notifications' },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Total notifications"
          value={totalNotifications}
        />

        <StatCard
          label="Unread notifications"
          value={unreadCount}
          accent
        />
      </div>

      {actionError && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300"
        >
          {actionError}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300"
        >
          {successMessage}
        </div>
      )}

      {error && (
        <SectionCard
          title="Unable to load notifications"
          description={error}
        >
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadNotifications}
              className="rounded-xl bg-[#CDB5F7] px-4 py-2.5 text-sm font-semibold text-[#211A2B] transition hover:bg-[#DDCCFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
            >
              Try again
            </button>
          </div>
        </SectionCard>
      )}

      {!error && (
        <>
          <SectionCard
            title="Your Notifications"
            description="Search notifications and filter them by read status."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px]">
              <div>
                <label
                  htmlFor="notification-search"
                  className="mb-2 block text-sm font-medium text-[#EAEAE6]"
                >
                  Search notifications
                </label>

                <input
                  id="notification-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by title, message, or type..."
                  className="w-full rounded-xl border border-[#3B3C43] bg-[#26272B] px-4 py-3 text-sm text-[#EAEAE6] placeholder:text-[#777985] focus:border-[#CDB5F7] focus:outline-none focus:ring-2 focus:ring-[#CDB5F7]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="notification-filter"
                  className="mb-2 block text-sm font-medium text-[#EAEAE6]"
                >
                  Read status
                </label>

                <select
                  id="notification-filter"
                  value={activeFilter}
                  onChange={handleFilterChange}
                  className="w-full rounded-xl border border-[#3B3C43] bg-[#26272B] px-4 py-3 text-sm text-[#EAEAE6] focus:border-[#CDB5F7] focus:outline-none focus:ring-2 focus:ring-[#CDB5F7]/20"
                >
                  {FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-[#343640] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p
                className="text-sm text-[#A5A6B0]"
                aria-live="polite"
              >
                {loading
                  ? 'Loading notifications...'
                  : `${filteredNotifications.length} notifications shown on this page`}
              </p>

              <div className="flex flex-wrap gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    disabled={markingAll || loading}
                    className="rounded-xl border border-[#454650] px-3 py-2 text-sm font-medium text-[#EAEAE6] transition hover:border-[#CDB5F7] hover:text-[#CDB5F7] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                  >
                    {markingAll
                      ? 'Marking all...'
                      : 'Mark all as read'}
                  </button>
                )}

                {(searchQuery || activeFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-xl px-3 py-2 text-sm font-medium text-[#CDB5F7] transition hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Notification Inbox"
            description="Select a notification to view its details."
          >
            {loading ? (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-3 py-8 text-sm text-[#A5A6B0]"
              >
                <span
                  aria-hidden="true"
                  className="h-5 w-5 animate-spin rounded-full border-2 border-[#CDB5F7] border-r-transparent motion-reduce:animate-none"
                />
                Loading your notifications...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <EmptyState
                title={
                  searchQuery || activeFilter !== 'all'
                    ? 'No matching notifications'
                    : 'You are all caught up'
                }
                description={
                  searchQuery || activeFilter !== 'all'
                    ? 'Try changing your search term or read-status filter.'
                    : 'Notifications will appear here when they become available for your account.'
                }
                icon="♧"
                action={
                  (searchQuery || activeFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="rounded-xl border border-[#3B3C43] px-4 py-2.5 text-sm font-medium text-[#EAEAE6] transition hover:bg-[#26272B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                    >
                      Reset filters
                    </button>
                  )
                }
              />
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={getNotificationId(notification)}
                    notification={notification}
                    onSelect={setSelectedNotification}
                    onMarkAsRead={handleMarkAsRead}
                    markingId={markingId}
                  />
                ))}
              </div>
            )}

            {!loading && !error && totalPages > 1 && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4">
                <p className="text-sm text-[#A5A6B0]">
                  Page {currentPage} of {totalPages}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    disabled={currentPage <= 1}
                    className="rounded-xl border border-[#454650] px-4 py-2 text-sm font-medium text-[#EAEAE6] transition hover:border-[#CDB5F7] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalPages, page + 1),
                      )
                    }
                    disabled={currentPage >= totalPages}
                    className="rounded-xl border border-[#454650] px-4 py-2 text-sm font-medium text-[#EAEAE6] transition hover:border-[#CDB5F7] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        </>
      )}

      {selectedNotification && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedNotification(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-detail-title"
            className="w-full max-w-xl rounded-t-2xl border border-[#343640] bg-[#202126] p-6 shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#CDB5F7]">
                  Notification details
                </p>

                <h2
                  id="notification-detail-title"
                  className="mt-2 break-words text-xl font-semibold text-[#EAEAE6]"
                >
                  {selectedNotification.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                aria-label="Close notification details"
                className="rounded-lg px-3 py-2 text-[#A5A6B0] transition hover:bg-[#343640] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#454650] px-2.5 py-1 text-xs text-[#A5A6B0]">
                {formatLabel(selectedNotification.type)}
              </span>

              {selectedNotification.priority && (
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs ${getPriorityClasses(
                    selectedNotification.priority,
                  )}`}
                >
                  {formatLabel(selectedNotification.priority)} priority
                </span>
              )}

              <span className="rounded-full border border-[#454650] px-2.5 py-1 text-xs text-[#A5A6B0]">
                {isNotificationRead(selectedNotification) ? 'Read' : 'Unread'}
              </span>
            </div>

            <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-[#C4C5CD]">
              {selectedNotification.message}
            </p>

            <p className="mt-4 text-xs text-[#777985]">
              Received: {formatDate(selectedNotification.createdAt)}
            </p>

            {selectedNotification.readAt && (
              <p className="mt-2 text-xs text-[#777985]">
                Read: {formatDate(selectedNotification.readAt)}
              </p>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              {!isNotificationRead(selectedNotification) && (
                <button
                  type="button"
                  onClick={() => handleMarkAsRead(selectedNotification)}
                  disabled={
                    markingId === getNotificationId(selectedNotification)
                  }
                  className="rounded-xl border border-[#454650] px-4 py-2.5 text-sm font-medium text-[#EAEAE6] transition hover:border-[#CDB5F7] hover:text-[#CDB5F7] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                >
                  {markingId === getNotificationId(selectedNotification)
                    ? 'Marking...'
                    : 'Mark as read'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
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