import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import notificationService from '../../services/notificationService.js';

const PAGE_SIZE = 10;

const NOTIFICATION_TYPES = [
  { value: '', label: 'All notification types' },
  { value: 'system', label: 'System' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'academic', label: 'Academic' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'result', label: 'Result' },
  { value: 'message', label: 'Message' },
  { value: 'reminder', label: 'Reminder' },
];

function formatDate(value) {
  if (!value) {
    return 'Date unavailable';
  }

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

function getSafeInternalPath(actionUrl) {
  if (
    typeof actionUrl !== 'string' ||
    !actionUrl.startsWith('/') ||
    actionUrl.startsWith('//') ||
    actionUrl.includes('\\')
  ) {
    return null;
  }

  try {
    const parsedUrl = new URL(
      actionUrl,
      window.location.origin,
    );

    if (parsedUrl.origin !== window.location.origin) {
      return null;
    }

    return (
      parsedUrl.pathname +
      parsedUrl.search +
      parsedUrl.hash
    );
  } catch {
    return null;
  }
}

function NotificationCard({
  notification,
  isUpdating,
  onMarkAsRead,
}) {
  const notificationId =
    notification.id || notification._id;

  const isRead = Boolean(notification.readAt);
  const actionPath = getSafeInternalPath(
    notification.actionUrl,
  );

  return (
    <article
      className={[
        'rounded-xl border p-4 transition-colors sm:p-5',
        isRead
          ? 'border-[#343640] bg-[#191A21]'
          : 'border-[#CDB5F7]/30 bg-[#CDB5F7]/[0.045]',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={[
            'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full',
            isRead ? 'bg-[#62636E]' : 'bg-[#CDB5F7]',
          ].join(' ')}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-sm font-semibold text-[#EAEAE6] sm:text-base">
              {notification.title || 'Notification'}
            </h3>

            <span
              className={[
                'inline-flex items-center rounded-full border px-2.5 py-1',
                'text-xs font-medium',
                isRead
                  ? 'border-[#454650] text-[#A5A6B0]'
                  : 'border-[#CDB5F7]/30 bg-[#CDB5F7]/10 text-[#D8CBFF]',
              ].join(' ')}
            >
              {isRead ? 'Read' : 'Unread'}
            </span>
          </div>

          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#B8B8C2]">
            {notification.message || 'No message provided.'}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[#858590]">
            {notification.type && (
              <span className="rounded-md border border-[#383943] px-2 py-1 capitalize">
                {notification.type}
              </span>
            )}

            {notification.priority && (
              <span className="capitalize">
                Priority: {notification.priority}
              </span>
            )}

            <time dateTime={notification.createdAt || undefined}>
              {formatDate(notification.createdAt)}
            </time>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {actionPath && (
              <Link
                to={actionPath}
                className="inline-flex min-h-9 items-center rounded-lg border border-[#454650] px-3 py-2 text-xs font-semibold text-[#CDB5F7] transition-colors hover:border-[#CDB5F7] hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                Open related page
              </Link>
            )}

            {!isRead && notificationId && (
              <ActionButton
                variant="secondary"
                size="sm"
                loading={isUpdating}
                disabled={isUpdating}
                onClick={() => onMarkAsRead(notification)}
              >
                Mark as read
              </ActionButton>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-sm font-medium text-[#D0D0D8]">
        {label}
      </span>

      <select
        value={value}
        onChange={onChange}
        className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2.5 text-sm text-[#EAEAE6] outline-none transition-colors focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
      >
        {children}
      </select>
    </label>
  );
}

export default function FacultyNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState(null);

  const [page, setPage] = useState(1);
  const [selectedType, setSelectedType] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const [unreadCount, setUnreadCount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [updatingNotificationId, setUpdatingNotificationId] =
    useState(null);

  const [pageError, setPageError] = useState('');
  const [actionError, setActionError] = useState('');

  const loadNotifications = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setPageError('');
      setActionError('');

      try {
        const [listResult, countResult] =
          await Promise.allSettled([
            notificationService.getNotifications({
              page,
              limit: PAGE_SIZE,
              type: selectedType || undefined,
              unreadOnly: unreadOnly ? true : undefined,
            }),
            notificationService.getUnreadCount(),
          ]);

        if (listResult.status === 'fulfilled') {
          setNotifications(listResult.value.items);
          setPagination(listResult.value.pagination);
        } else {
          setPageError(
            listResult.reason?.message ||
              'Unable to load notifications.',
          );
        }

        if (countResult.status === 'fulfilled') {
          setUnreadCount(countResult.value);
        } else {
          setUnreadCount(null);

          if (listResult.status === 'fulfilled') {
            setPageError(
              'Notifications loaded, but the unread count could not be retrieved.',
            );
          } else {
            setPageError(
              'Unable to retrieve notifications. Please try again.',
            );
          }
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, selectedType, unreadOnly],
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = useCallback(
    async (notification) => {
      const notificationId =
        notification.id || notification._id;

      if (!notificationId || notification.readAt) {
        return;
      }

      setUpdatingNotificationId(notificationId);
      setActionError('');

      try {
        await notificationService.markAsRead(notificationId);

        setNotifications((current) =>
          current.map((item) => {
            const itemId = item.id || item._id;

            return itemId === notificationId
              ? {
                  ...item,
                  readAt: new Date().toISOString(),
                }
              : item;
          }),
        );

        setUnreadCount((current) =>
          current === null
            ? null
            : Math.max(0, current - 1),
        );
      } catch (error) {
        setActionError(
          error?.message ||
            'Unable to mark this notification as read.',
        );
      } finally {
        setUpdatingNotificationId(null);
      }
    },
    [],
  );

  const handleMarkAllAsRead = useCallback(async () => {
    if (
      unreadCount === 0 ||
      unreadCount === null ||
      isMarkingAll
    ) {
      return;
    }

    setIsMarkingAll(true);
    setActionError('');

    try {
      await notificationService.markAllAsRead();

      const now = new Date().toISOString();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          readAt: notification.readAt || now,
        })),
      );

      setUnreadCount(0);

      if (unreadOnly) {
        await loadNotifications({ silent: true });
      }
    } catch (error) {
      setActionError(
        error?.message ||
          'Unable to mark notifications as read.',
      );
    } finally {
      setIsMarkingAll(false);
    }
  }, [
    unreadCount,
    isMarkingAll,
    unreadOnly,
    loadNotifications,
  ]);

  const totalPages = pagination?.totalPages ?? 0;
  const totalNotifications = pagination?.total ?? null;

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title="Notifications"
        description="Review account updates and academic notifications delivered to you."
        breadcrumbs={[
          {
            label: 'Faculty Dashboard',
            to: '/faculty/dashboard',
          },
          {
            label: 'Notifications',
          },
        ]}
        actions={
          <Link
            to="/faculty/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#454650] bg-[#26272B] px-4 py-2.5 text-sm font-semibold text-[#EAEAE6] transition-colors hover:border-[#CDB5F7] hover:text-[#CDB5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            Back to Dashboard
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Unread Notifications
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            {unreadCount === null ? '—' : unreadCount}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#858590]">
            Count retrieved from your authenticated account.
          </p>
        </div>

        <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Notifications
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            {totalNotifications === null
              ? '—'
              : totalNotifications}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#858590]">
            Total matching records returned by the server.
          </p>
        </div>
      </div>

      <SectionCard
        eyebrow="ACCOUNT ACTIVITY"
        title="Your Notifications"
        description="Filter, review, and manage your notification status."
        action={
          <div className="flex flex-wrap gap-2">
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => loadNotifications({ silent: true })}
              loading={isRefreshing}
              disabled={isLoading || isRefreshing}
            >
              Refresh
            </ActionButton>

            <ActionButton
              variant="secondary"
              size="sm"
              onClick={handleMarkAllAsRead}
              loading={isMarkingAll}
              disabled={
                isLoading ||
                isRefreshing ||
                isMarkingAll ||
                unreadCount === 0 ||
                unreadCount === null
              }
            >
              Mark All Read
            </ActionButton>
          </div>
        }
      >
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <SelectField
            label="Notification Type"
            value={selectedType}
            onChange={(event) => {
              setSelectedType(event.target.value);
              setPage(1);
            }}
          >
            {NOTIFICATION_TYPES.map((type) => (
              <option
                key={type.value || 'all'}
                value={type.value}
                className="bg-[#191A21]"
              >
                {type.label}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Read Status"
            value={unreadOnly ? 'unread' : 'all'}
            onChange={(event) => {
              setUnreadOnly(event.target.value === 'unread');
              setPage(1);
            }}
          >
            <option value="all" className="bg-[#191A21]">
              All notifications
            </option>

            <option value="unread" className="bg-[#191A21]">
              Unread only
            </option>
          </SelectField>
        </div>

        {actionError && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-[#B86D78]/30 bg-[#B86D78]/10 p-3 text-sm leading-6 text-[#F0B0B9]"
          >
            {actionError}
          </div>
        )}

        {isLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-center gap-3 py-12 text-sm text-[#A5A6B0]"
          >
            <span
              aria-hidden="true"
              className="h-5 w-5 animate-spin rounded-full border-2 border-[#CDB5F7] border-r-transparent motion-reduce:animate-none"
            />

            Loading notifications...
          </div>
        ) : pageError && notifications.length === 0 ? (
          <div className="space-y-4">
            <div
              role="alert"
              className="rounded-xl border border-[#B86D78]/30 bg-[#B86D78]/10 p-4 text-sm leading-6 text-[#F0B0B9]"
            >
              {pageError}
            </div>

            <ActionButton
              variant="secondary"
              onClick={() => loadNotifications()}
            >
              Try Again
            </ActionButton>
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            title="No notifications found"
            description={
              unreadOnly
                ? 'There are no unread notifications matching the selected filter.'
                : 'There are no notifications matching the selected filters.'
            }
            action={
              selectedType || unreadOnly ? (
                <ActionButton
                  variant="secondary"
                  onClick={() => {
                    setSelectedType('');
                    setUnreadOnly(false);
                    setPage(1);
                  }}
                >
                  Clear Filters
                </ActionButton>
              ) : undefined
            }
            className="border-0 bg-transparent"
          />
        ) : (
          <div className="space-y-3">
            {pageError && (
              <p
                role="status"
                className="text-sm leading-6 text-[#E5DF98]"
              >
                {pageError}
              </p>
            )}

            {notifications.map((notification, index) => {
              const notificationId =
                notification.id ||
                notification._id ||
                `${notification.createdAt || 'notification'}-${index}`;

              return (
                <NotificationCard
                  key={notificationId}
                  notification={notification}
                  isUpdating={
                    updatingNotificationId === notificationId
                  }
                  onMarkAsRead={handleMarkAsRead}
                />
              );
            })}
          </div>
        )}

        {!isLoading && totalPages > 1 && (
          <div className="mt-6 flex flex-col gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#A5A6B0]">
              Page {page} of {totalPages}
            </p>

            <div className="flex gap-2">
              <ActionButton
                variant="secondary"
                size="sm"
                disabled={page <= 1 || isRefreshing}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </ActionButton>

              <ActionButton
                variant="secondary"
                size="sm"
                disabled={
                  page >= totalPages ||
                  isRefreshing
                }
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </ActionButton>
            </div>
          </div>
        )}
      </SectionCard>

      <p className="mt-5 text-xs leading-5 text-[#777986]">
        Notification records and read status are managed by the existing
        backend. This page does not create notifications or modify
        notification content.
      </p>
    </div>
  );
}