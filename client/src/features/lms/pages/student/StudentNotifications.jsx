import { useCallback, useEffect, useMemo, useState } from 'react';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import LoadingState from '../../components/LoadingState.jsx';

import notificationService from '../../services/notificationService.js';

const FILTER_OPTIONS = [
  { label: 'All notifications', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Read', value: 'read' },
];

function getNotificationId(notification) {
  return notification?.id || notification?._id || null;
}

function isNotificationRead(notification) {
  return Boolean(notification?.readAt);
}

function formatDate(value) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getErrorMessage(error) {
  if (error?.response?.status === 401) {
    return 'Your session has expired. Please sign in again.';
  }

  if (error?.response?.status === 403) {
    return 'Your account does not currently have access to notifications.';
  }

  return error?.message || 'Unable to load notifications. Please try again.';
}

function getPriorityClass(priority) {
  switch (priority) {
    case 'urgent':
      return 'border-rose-400/20 bg-rose-400/10 text-rose-300';

    case 'high':
      return 'border-[#E5DF98]/20 bg-[#E5DF98]/10 text-[#E5DF98]';

    default:
      return 'border-[#454650] bg-[#26272B] text-[#A5A6B0]';
  }
}

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const [selectedNotification, setSelectedNotification] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const options = {
        page: 1,
        limit: 100,
      };

      if (activeFilter === 'unread') {
        options.unreadOnly = true;
      }

      if (activeFilter === 'read') {
        options.unreadOnly = false;
      }

      const result = await notificationService.getNotifications(options);

      setNotifications(result.items);
      setPagination(result.pagination);
    } catch (error) {
      setNotifications([]);
      setPagination(null);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return notifications.filter((notification) => {
      const title = String(notification.title || '').toLowerCase();
      const message = String(notification.message || '').toLowerCase();

      const matchesSearch =
        !query || title.includes(query) || message.includes(query);

      const isRead = isNotificationRead(notification);

      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'unread' && !isRead) ||
        (activeFilter === 'read' && isRead);

      return matchesSearch && matchesFilter;
    });
  }, [notifications, searchQuery, activeFilter]);

  const unreadCount = useMemo(
    () => notifications.filter(
      (notification) => !isNotificationRead(notification),
    ).length,
    [notifications],
  );

  async function handleSelectNotification(notification) {
    setSelectedNotification(notification);
    setActionError('');

    if (isNotificationRead(notification)) {
      return;
    }

    const notificationId = getNotificationId(notification);

    if (!notificationId) {
      setActionError('This notification has no valid identifier.');
      return;
    }

    try {
      const updated = await notificationService.markAsRead(notificationId);

      const updatedNotification = {
        ...notification,
        ...updated,
        readAt: updated?.readAt || new Date().toISOString(),
      };

      setNotifications((current) =>
        current.map((item) =>
          getNotificationId(item) === notificationId
            ? updatedNotification
            : item,
        ),
      );

      setSelectedNotification(updatedNotification);
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  async function handleMarkAllAsRead() {
    if (unreadCount === 0 || isMarkingAllRead) {
      return;
    }

    setIsMarkingAllRead(true);
    setActionError('');

    try {
      await notificationService.markAllAsRead();

      const readAt = new Date().toISOString();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          readAt: notification.readAt || readAt,
        })),
      );

      setSelectedNotification((current) =>
        current
          ? {
              ...current,
              readAt: current.readAt || readAt,
            }
          : null,
      );
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsMarkingAllRead(false);
    }
  }

  function resetFilters() {
    setSearchQuery('');
    setActiveFilter('all');
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="STUDENT WORKSPACE"
        title="Notifications"
        description="View important updates and notifications related to your academic activities."
        breadcrumbs={[
          { label: 'Student', to: '/student/dashboard' },
          { label: 'Notifications' },
        ]}
        actions={
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || isMarkingAllRead || isLoading}
            className={[
              'inline-flex min-h-10 items-center justify-center rounded-xl',
              'border border-[#454650] px-4 py-2 text-sm font-semibold',
              'text-[#CDB5F7] transition-colors hover:border-[#CDB5F7]',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[#CDB5F7]',
            ].join(' ')}
          >
            {isMarkingAllRead ? 'Marking as read…' : 'Mark all as read'}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Loaded notifications
          </p>

          <p className="mt-3 text-3xl font-semibold text-[#EAEAE6]">
            {isLoading ? '—' : notifications.length}
          </p>

          <p className="mt-2 text-xs text-[#858590]">
            {pagination?.totalItems !== undefined
              ? `${pagination.totalItems} total in your inbox`
              : 'Notifications returned by the server'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Unread notifications
          </p>

          <p className="mt-3 text-3xl font-semibold text-[#CDB5F7]">
            {isLoading ? '—' : unreadCount}
          </p>

          <p className="mt-2 text-xs text-[#858590]">
            Notifications that still need your attention
          </p>
        </div>
      </div>

      {errorMessage && (
        <section
          role="alert"
          className="rounded-xl border border-rose-400/20 bg-[#1D1F27] p-5"
        >
          <h2 className="font-semibold text-[#EAEAE6]">
            Could not load notifications
          </h2>

          <p className="mt-2 text-sm text-rose-200">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={loadNotifications}
            className="mt-4 rounded-lg border border-[#454650] px-4 py-2 text-sm font-semibold text-[#CDB5F7] hover:border-[#CDB5F7]"
          >
            Retry
          </button>
        </section>
      )}

      {actionError && (
        <p
          role="alert"
          className="rounded-xl border border-rose-400/20 bg-[#1D1F27] p-4 text-sm text-rose-200"
        >
          {actionError}
        </p>
      )}

      <SectionCard
        title="Your Notifications"
        description="Search your notifications and filter them by read status."
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
              placeholder="Search by title or message..."
              className={[
                'w-full rounded-xl border border-[#3B3C43]',
                'bg-[#26272B] px-4 py-3 text-sm text-[#EAEAE6]',
                'placeholder:text-[#777985] focus:border-[#CDB5F7]',
                'focus:outline-none focus:ring-2 focus:ring-[#CDB5F7]/20',
              ].join(' ')}
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
              onChange={(event) => setActiveFilter(event.target.value)}
              className={[
                'w-full rounded-xl border border-[#3B3C43]',
                'bg-[#26272B] px-4 py-3 text-sm text-[#EAEAE6]',
                'focus:border-[#CDB5F7] focus:outline-none',
                'focus:ring-2 focus:ring-[#CDB5F7]/20',
              ].join(' ')}
            >
              {FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4">
          <p className="text-sm text-[#A5A6B0]" aria-live="polite">
            {isLoading
              ? 'Loading notifications…'
              : `${filteredNotifications.length} notifications shown`}
          </p>

          {(searchQuery || activeFilter !== 'all') && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg px-3 py-2 text-sm font-medium text-[#CDB5F7] transition hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
            >
              Clear filters
            </button>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Notification Inbox"
        description="Select a notification to view its details."
      >
        {isLoading ? (
          <LoadingState
            message="Loading your notifications"
            rows={3}
          />
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            title={
              errorMessage
                ? 'Notifications unavailable'
                : searchQuery || activeFilter !== 'all'
                  ? 'No matching notifications'
                  : "You're all caught up"
            }
            description={
              errorMessage
                ? 'Retry loading the inbox to check for new notifications.'
                : searchQuery || activeFilter !== 'all'
                  ? 'Try changing your search term or read-status filter.'
                  : 'New notifications for your account will appear here.'
            }
            icon="♧"
            action={
              errorMessage ? (
                <button
                  type="button"
                  onClick={loadNotifications}
                  className="rounded-xl border border-[#3B3C43] px-4 py-2.5 text-sm font-medium text-[#EAEAE6] hover:bg-[#26272B]"
                >
                  Retry
                </button>
              ) : (searchQuery || activeFilter !== 'all') ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl border border-[#3B3C43] px-4 py-2.5 text-sm font-medium text-[#EAEAE6] hover:bg-[#26272B]"
                >
                  Reset filters
                </button>
              ) : null
            }
          />
        ) : (
          <div className="divide-y divide-[#343640]">
            {filteredNotifications.map((notification) => {
              const notificationId = getNotificationId(notification);
              const isRead = isNotificationRead(notification);

              return (
                <button
                  key={notificationId}
                  type="button"
                  onClick={() => handleSelectNotification(notification)}
                  className={[
                    'flex w-full items-start gap-4 rounded-xl px-3 py-4',
                    'text-left transition hover:bg-[#26272B]',
                    'focus-visible:outline-none focus-visible:ring-2',
                    'focus-visible:ring-inset focus-visible:ring-[#CDB5F7]',
                  ].join(' ')}
                >
                  <span
                    aria-hidden="true"
                    className={[
                      'mt-2 h-2.5 w-2.5 shrink-0 rounded-full',
                      isRead ? 'bg-[#777985]' : 'bg-[#CDB5F7]',
                    ].join(' ')}
                  />

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="break-words font-medium text-[#EAEAE6]">
                        {notification.title}
                      </span>

                      {!isRead && (
                        <span className="rounded-full bg-[#CDB5F7]/10 px-2 py-1 text-xs font-medium text-[#CDB5F7]">
                          Unread
                        </span>
                      )}

                      {notification.priority &&
                        ['high', 'urgent'].includes(notification.priority) && (
                          <span
                            className={[
                              'rounded-full border px-2 py-1 text-xs font-medium',
                              getPriorityClass(notification.priority),
                            ].join(' ')}
                          >
                            {notification.priority}
                          </span>
                        )}
                    </span>

                    <span className="mt-1 block break-words text-sm leading-6 text-[#A5A6B0]">
                      {notification.message}
                    </span>

                    <span className="mt-2 block text-xs text-[#777985]">
                      {formatDate(notification.createdAt)}
                    </span>
                  </span>

                  <span
                    aria-hidden="true"
                    className="shrink-0 text-[#A5A6B0]"
                  >
                    →
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>

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
                className="rounded-lg px-3 py-2 text-[#A5A6B0] hover:bg-[#343640] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {selectedNotification.type && (
                <span className="rounded-full border border-[#454650] bg-[#26272B] px-2.5 py-1 text-xs capitalize text-[#A5A6B0]">
                  {selectedNotification.type}
                </span>
              )}

              {selectedNotification.priority && (
                <span
                  className={[
                    'rounded-full border px-2.5 py-1 text-xs font-medium',
                    getPriorityClass(selectedNotification.priority),
                  ].join(' ')}
                >
                  {selectedNotification.priority}
                </span>
              )}

              <span className="rounded-full border border-[#454650] bg-[#26272B] px-2.5 py-1 text-xs text-[#A5A6B0]">
                {isNotificationRead(selectedNotification) ? 'Read' : 'Unread'}
              </span>
            </div>

            <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-[#C4C5CD]">
              {selectedNotification.message}
            </p>

            <p className="mt-4 text-xs text-[#777985]">
              {formatDate(selectedNotification.createdAt)}
            </p>

            <div className="mt-6 flex justify-end">
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