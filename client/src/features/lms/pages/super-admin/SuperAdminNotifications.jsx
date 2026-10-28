import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

function BellIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 21h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
    >
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatNotificationType(type) {
  if (!type || typeof type !== 'string') {
    return 'Notification';
  }

  return type
    .split('_')
    .join(' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getNotificationId(notification) {
  return String(notification?._id ?? notification?.id ?? '');
}

function isUnread(notification) {
  return !notification?.readAt;
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export default function SuperAdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState('');

  const loadNotifications = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');

    try {
      const [notificationsResponse, unreadResponse] = await Promise.all([
        api.get('/v1/notifications', {
          params: {
            page,
            limit: 20,
          },
        }),
        api.get('/v1/notifications/unread-count'),
      ]);

      const responseData = notificationsResponse?.data;
      const items = responseData?.data;

      if (!Array.isArray(items)) {
        throw new Error(
          'The server returned an unexpected notifications response.',
        );
      }

      setNotifications(items);

      setUnreadCount(
        Number(unreadResponse?.data?.data?.unreadCount) || 0,
      );

      setPagination({
        page: Number(responseData?.pagination?.page) || page,
        limit: Number(responseData?.pagination?.limit) || 20,
        total: Number(responseData?.pagination?.total) || 0,
        totalPages: Number(responseData?.pagination?.totalPages) || 1,
      });
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
  }, []);

  useEffect(() => {
    loadNotifications(1);
  }, [loadNotifications]);

  const handleMarkAsRead = async (notification) => {
    const notificationId = getNotificationId(notification);

    if (!notificationId || !isUnread(notification)) {
      return;
    }

    setMarkingId(notificationId);
    setActionError('');

    try {
      await api.patch(
        `/v1/notifications/${encodeURIComponent(notificationId)}/read`,
      );

      setNotifications((current) =>
        current.map((item) =>
          getNotificationId(item) === notificationId
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ),
      );

      setUnreadCount((current) => Math.max(0, current - 1));
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

    try {
      await api.patch('/v1/notifications/read-all');

      const now = new Date().toISOString();

      setNotifications((current) =>
        current.map((notification) =>
          isUnread(notification)
            ? { ...notification, readAt: now }
            : notification,
        ),
      );

      setUnreadCount(0);
    } catch (requestError) {
      setActionError(
        getErrorMessage(
          requestError,
          'Unable to mark notifications as read.',
        ),
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const changePage = (nextPage) => {
    if (
      nextPage < 1 ||
      nextPage > pagination.totalPages ||
      nextPage === pagination.page ||
      loading
    ) {
      return;
    }

    loadNotifications(nextPage);
  };

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="SUPER ADMINISTRATION"
        title="Notifications"
        description="Review account activity and institutional updates."
        breadcrumbs={[
          {
            label: 'Dashboard',
            to: '/super-admin/dashboard',
          },
          {
            label: 'Notifications',
          },
        ]}
      />

      <section className="mb-6 overflow-hidden rounded-2xl border border-[#343640] bg-[#1D1F27]">
        <div className="h-1.5 bg-gradient-to-r from-[#CDB5F7] via-[#A997D9] to-[#E5DF98]" />

        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#CDB5F7]/25 bg-[#CDB5F7]/10 text-[#CDB5F7]">
            <BellIcon className="h-7 w-7" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#92929F]">
              Activity centre
            </p>

            <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#EAEAE6]">
              Your notifications
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
              Notifications are retrieved from your authenticated account.
            </p>
          </div>

          <div className="flex w-fit flex-col gap-1 rounded-xl border border-[#454650] bg-[#26272B] px-4 py-3">
            <span className="text-xs text-[#A5A6B0]">
              Unread notifications
            </span>

            <span
              aria-live="polite"
              className="text-2xl font-semibold text-[#E5DF98]"
            >
              {loading ? '—' : unreadCount}
            </span>
          </div>
        </div>
      </section>

      <SectionCard
        eyebrow="INBOX"
        title="Recent notifications"
        description="Your newest notifications appear first."
        icon={<BellIcon />}
        action={
          <ActionButton
            variant="secondary"
            size="sm"
            onClick={() => loadNotifications(pagination.page)}
            disabled={loading}
          >
            Refresh
          </ActionButton>
        }
      >
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-[#B86D78]/30 bg-[#B86D78]/10 p-4"
          >
            <p className="text-sm leading-6 text-[#E9B4BC]">
              {error}
            </p>

            <div className="mt-3">
              <ActionButton
                size="sm"
                onClick={() => loadNotifications(pagination.page)}
              >
                Retry
              </ActionButton>
            </div>
          </div>
        )}

        {actionError && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-[#B86D78]/30 bg-[#B86D78]/10 p-4 text-sm leading-6 text-[#E9B4BC]"
          >
            {actionError}
          </div>
        )}

        {!error && (
          <>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#92929F]">
                {loading
                  ? 'Loading notifications...'
                  : `${pagination.total} notification${pagination.total === 1 ? '' : 's'} in total`}
              </p>

              <ActionButton
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                loading={markingAll}
                disabled={loading || unreadCount === 0 || markingAll}
              >
                Mark all as read
              </ActionButton>
            </div>

            {loading ? (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center justify-center gap-3 rounded-xl border border-[#383943] bg-[#26272B]/50 px-4 py-10 text-sm text-[#A5A6B0]"
              >
                <span
                  aria-hidden="true"
                  className="h-5 w-5 animate-spin rounded-full border-2 border-[#CDB5F7] border-r-transparent motion-reduce:animate-none"
                />
                Loading your notifications...
              </div>
            ) : notifications.length === 0 ? (
              <EmptyState
                title="You're all caught up"
                description="There are no notifications available for your account."
                icon={<BellIcon className="h-7 w-7" />}
              />
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const notificationId =
                    getNotificationId(notification);

                  const unread = isUnread(notification);

                  return (
                    <article
                      key={notificationId}
                      className={[
                        'rounded-xl border p-4 transition-colors sm:p-5',
                        unread
                          ? 'border-[#CDB5F7]/30 bg-[#CDB5F7]/[0.04]'
                          : 'border-[#383943] bg-[#26272B]/40',
                      ].join(' ')}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={[
                            'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
                            unread ? 'bg-[#CDB5F7]' : 'bg-[#656671]',
                          ].join(' ')}
                          aria-hidden="true"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="break-words text-sm font-semibold text-[#EAEAE6]">
                              {notification.title || 'Notification'}
                            </h3>

                            <StatusBadge
                              status={unread ? 'pending' : 'active'}
                              label={unread ? 'Unread' : 'Read'}
                              size="sm"
                            />

                            {notification.priority &&
                              notification.priority !== 'normal' && (
                                <span className="rounded-full border border-[#E5DF98]/20 bg-[#E5DF98]/10 px-2.5 py-1 text-[11px] font-medium capitalize text-[#E5DF98]">
                                  {notification.priority}
                                </span>
                              )}
                          </div>

                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#B8B8C2]">
                            {notification.message || ''}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[#92929F]">
                            <span>
                              {formatNotificationType(notification.type)}
                            </span>

                            <span aria-hidden="true">·</span>

                            <time dateTime={notification.createdAt || undefined}>
                              {formatDate(notification.createdAt)}
                            </time>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            {notification.actionUrl &&
                              notification.actionUrl.startsWith('/') &&
                              !notification.actionUrl.startsWith('//') && (
                                <Link
                                  to={notification.actionUrl}
                                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#CDB5F7]/30 px-3 py-2 text-xs font-semibold text-[#CDB5F7] transition-colors hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                                >
                                  Open related page
                                  <ArrowRightIcon />
                                </Link>
                              )}

                            {unread && (
                              <ActionButton
                                variant="ghost"
                                size="sm"
                                loading={markingId === notificationId}
                                disabled={
                                  markingAll ||
                                  markingId !== '' ||
                                  !notificationId
                                }
                                onClick={() =>
                                  handleMarkAsRead(notification)
                                }
                              >
                                Mark as read
                              </ActionButton>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {!loading && pagination.totalPages > 1 && (
              <div className="mt-6 flex flex-col gap-3 border-t border-[#383943] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-[#92929F]">
                  Page {pagination.page} of {pagination.totalPages}
                </p>

                <div className="flex gap-2">
                  <ActionButton
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => changePage(pagination.page - 1)}
                  >
                    Previous
                  </ActionButton>

                  <ActionButton
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => changePage(pagination.page + 1)}
                  >
                    Next
                  </ActionButton>
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>

      <section className="mt-6 rounded-2xl border border-[#383943] bg-[#1D1F27] p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#92929F]">
          Quick access
        </p>

        <h3 className="mt-2 text-base font-semibold text-[#EAEAE6]">
          Continue administration
        </h3>

        <p className="mt-1 text-sm leading-6 text-[#A5A6B0]">
          Continue managing institutional departments or HOD accounts.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/super-admin/departments"
            className="inline-flex min-h-11 items-center justify-between gap-4 rounded-xl border border-[#454650] px-4 py-3 text-sm font-medium text-[#EAEAE6] transition-colors hover:border-[#CDB5F7] hover:text-[#CDB5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            Manage departments
            <ArrowRightIcon />
          </Link>

          <Link
            to="/super-admin/hods"
            className="inline-flex min-h-11 items-center justify-between gap-4 rounded-xl border border-[#454650] px-4 py-3 text-sm font-medium text-[#EAEAE6] transition-colors hover:border-[#CDB5F7] hover:text-[#CDB5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            Manage HOD accounts
            <ArrowRightIcon />
          </Link>
        </div>
      </section>
    </div>
  );
}