import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import useAuth from '../../../auth/context/useAuth.js';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

import notificationService from '../../services/notificationService.js';
import facultyAcademicService from '../../services/facultyAcademicService.js';

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

function getInitials(name) {
  if (typeof name !== 'string' || !name.trim()) {
    return 'FA';
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
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

    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return null;
  }
}

function DashboardMetric({ label, value, description }) {
  return (
    <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
      <p className="text-sm text-[#A5A6B0]">
        {label}
      </p>

      <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-[#858590]">
        {description}
      </p>
    </div>
  );
}

function NotificationItem({
  notification,
  isUpdating,
  onMarkAsRead,
}) {
  const isRead = Boolean(notification.readAt);

  const safeActionPath = getSafeInternalPath(
    notification.actionUrl,
  );

  return (
    <article
      className={[
        'rounded-xl border p-4 transition-colors',
        isRead
          ? 'border-[#343640] bg-[#191A21]'
          : 'border-[#CDB5F7]/30 bg-[#CDB5F7]/[0.045]',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={[
            'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
            isRead ? 'bg-[#62636E]' : 'bg-[#CDB5F7]',
          ].join(' ')}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-sm font-semibold text-[#EAEAE6]">
              {notification.title || 'Notification'}
            </h3>

            <StatusBadge
              status={isRead ? 'completed' : 'pending'}
              label={isRead ? 'Read' : 'Unread'}
              size="sm"
            />
          </div>

          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#B8B8C2]">
            {notification.message || 'No message provided.'}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#858590]">
            {notification.type && (
              <span className="capitalize">
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
            {safeActionPath && (
              <Link
                to={safeActionPath}
                className="inline-flex min-h-9 items-center rounded-lg border border-[#454650] px-3 py-2 text-xs font-semibold text-[#CDB5F7] transition-colors hover:border-[#CDB5F7] hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                Open related page
              </Link>
            )}

            {!isRead && (
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

function AcademicLoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-3 rounded-2xl border border-[#343640] bg-[#1D1F27] py-10 text-sm text-[#A5A6B0]"
    >
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-[#CDB5F7] border-r-transparent motion-reduce:animate-none"
      />
      Loading academic overview...
    </div>
  );
}

function CourseCard({ course }) {
  return (
    <article className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold text-[#EAEAE6]">
          {course.title || 'Untitled course'}
        </h3>

        {course.status && (
          <StatusBadge
            status={course.status.toLowerCase()}
            size="sm"
          />
        )}
      </div>

      <p className="mt-2 text-sm text-[#A5A6B0]">
        {course.code || 'Course code unavailable'}
        {course.semester
          ? ` · Semester ${course.semester}`
          : ''}
      </p>

      <p className="mt-2 text-xs text-[#858590]">
        {course.batches.length} batch(es)
        {' · '}
        {course.sections.length} section(s)
      </p>
    </article>
  );
}

function AssignmentCard({ assignment }) {
  return (
    <article className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <h3 className="font-semibold text-[#EAEAE6]">
        {assignment.title || 'Untitled assignment'}
      </h3>

      <p className="mt-1 text-xs text-[#A5A6B0]">
        Due {formatDate(assignment.dueDate)}
      </p>
    </article>
  );
}

function QuizCard({ quiz }) {
  return (
    <article className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <h3 className="font-semibold text-[#EAEAE6]">
        {quiz.title || 'Untitled quiz'}
      </h3>

      <p className="mt-1 text-xs text-[#A5A6B0]">
        Starts {formatDate(quiz.startAt)}
      </p>
    </article>
  );
}

export default function FacultyDashboard() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(null);

  const [academicOverview, setAcademicOverview] = useState(null);
  const [isAcademicLoading, setIsAcademicLoading] = useState(true);
  const [academicError, setAcademicError] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [pageError, setPageError] = useState('');
  const [actionError, setActionError] = useState('');

  const [updatingNotificationId, setUpdatingNotificationId] =
    useState(null);

  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const displayName =
    user?.fullName?.trim() ||
    user?.name?.trim() ||
    'Faculty Member';

  const departmentName =
    typeof user?.department === 'string'
      ? user.department
      : user?.department?.name || 'Department not available';

  // ---------------------------------------------
  // Notifications
  // ---------------------------------------------

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
              page: 1,
              limit: 5,
            }),

            notificationService.getUnreadCount(),
          ]);

        if (listResult.status === 'fulfilled') {
          setNotifications(listResult.value.items);
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
              'Unable to retrieve notifications from the server. Please try again.',
            );
          }
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
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
    if (unreadCount === 0 || isMarkingAll) {
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
    } catch (error) {
      setActionError(
        error?.message ||
          'Unable to mark all notifications as read.',
      );
    } finally {
      setIsMarkingAll(false);
    }
  }, [unreadCount, isMarkingAll]);

  // ---------------------------------------------
  // Academic dashboard data
  // ---------------------------------------------

  const loadAcademicOverview = useCallback(async () => {
    setIsAcademicLoading(true);
    setAcademicError('');

    try {
      const overview =
        await facultyAcademicService.getDashboardOverview();

      setAcademicOverview(overview);

      if (overview.hasErrors) {
        setAcademicError(
          'Some academic sections could not be loaded. Available sections are still shown.',
        );
      }
    } catch (error) {
      setAcademicError(
        error?.message ||
          'Unable to load your academic overview.',
      );
    } finally {
      setIsAcademicLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAcademicOverview();
  }, [loadAcademicOverview]);

  // ---------------------------------------------
  // Render
  // ---------------------------------------------

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title={`Welcome, ${displayName}`}
        description="Your teaching workspace, account information, and latest notifications."
        breadcrumbs={[
          {
            label: 'Faculty Dashboard',
          },
        ]}
        actions={
          <Link
            to="/faculty/profile"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#454650] bg-[#26272B] px-4 py-2.5 text-sm font-semibold text-[#EAEAE6] transition-colors hover:border-[#CDB5F7] hover:text-[#CDB5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            My Profile
          </Link>
        }
      />

      {/* Faculty account overview */}

      <section
        aria-label="Faculty account overview"
        className="mb-6 rounded-2xl border border-[#343640] bg-[#1D1F27] p-5 sm:p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#CDB5F7]/25 bg-[#CDB5F7]/10 text-lg font-semibold text-[#CDB5F7]"
          >
            {getInitials(displayName)}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="break-words text-lg font-semibold text-[#EAEAE6]">
              {displayName}
            </h2>

            <p className="mt-1 break-all text-sm text-[#A5A6B0]">
              {user?.email || 'Email not available'}
            </p>

            <p className="mt-2 text-sm text-[#858590]">
              {departmentName}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge
              status={
                user?.status === 'ACTIVE'
                  ? 'active'
                  : user?.status || 'pending'
              }
              size="md"
            />

            <StatusBadge
              status={
                user?.isEmailVerified
                  ? 'completed'
                  : 'pending'
              }
              label={
                user?.isEmailVerified
                  ? 'Email verified'
                  : 'Email unverified'
              }
              size="md"
            />
          </div>
        </div>
      </section>

      {/* Dashboard metrics */}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetric
          label="Unread Notifications"
          value={unreadCount === null ? '—' : unreadCount}
          description="Live count retrieved from your account."
        />

        <DashboardMetric
          label="Assigned Courses"
          value={
            isAcademicLoading
              ? '—'
              : academicOverview?.summary.assignedCourses ?? 0
          }
          description="Courses assigned to your faculty account."
        />

        <DashboardMetric
          label="Assignments"
          value={
            isAcademicLoading
              ? '—'
              : academicOverview?.summary.totalAssignments ?? 0
          }
          description="Assignments in your authorized courses."
        />

        <DashboardMetric
          label="Upcoming Quizzes"
          value={
            isAcademicLoading
              ? '—'
              : academicOverview?.summary.upcomingQuizzes ?? 0
          }
          description="Published quizzes scheduled for the future."
        />
      </div>

      {/* Academic overview */}

      <section
        aria-label="Academic overview"
        className="mb-6 space-y-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#CDB5F7]">
              Teaching workspace
            </p>

            <h2 className="mt-1 text-xl font-semibold text-[#EAEAE6]">
              Academic Overview
            </h2>

            <p className="mt-1 text-sm text-[#A5A6B0]">
              Course and assessment information available to your faculty account.
            </p>
          </div>

          <ActionButton
            variant="secondary"
            size="sm"
            onClick={loadAcademicOverview}
            loading={isAcademicLoading}
            disabled={isAcademicLoading}
          >
            Refresh Academic Data
          </ActionButton>
        </div>

        {academicError && (
          <div
            role="status"
            className="rounded-xl border border-[#E5DF98]/25 bg-[#E5DF98]/[0.07] p-3 text-sm leading-6 text-[#E5DF98]"
          >
            {academicError}
          </div>
        )}

        {isAcademicLoading ? (
          <AcademicLoadingState />
        ) : (
          <>
            {/* Assigned courses */}

            <SectionCard
              eyebrow="YOUR TEACHING"
              title="Assigned Courses"
              description="Only courses assigned to your authenticated faculty account are shown."
              action={
                <Link
                  to="/faculty/courses"
                  className="text-sm font-semibold text-[#CDB5F7] hover:underline"
                >
                  View All Courses
                </Link>
              }
            >
              {academicOverview?.courses.items.length ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {academicOverview.courses.items
                    .slice(0, 4)
                    .map((course) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                      />
                    ))}
                </div>
              ) : (
                <EmptyState
                  title="No assigned courses"
                  description="No active courses are currently assigned to your faculty account. Contact your HOD if this seems incorrect."
                  className="border-0 bg-transparent"
                />
              )}
            </SectionCard>

            {/* Assignments and quizzes */}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <SectionCard
                eyebrow="ASSESSMENT WORK"
                title="Upcoming Assignments"
                description="Published assignments with upcoming due dates."
                action={
                  <Link
                    to="/faculty/assignments"
                    className="text-sm font-semibold text-[#CDB5F7] hover:underline"
                  >
                    Manage Assignments
                  </Link>
                }
              >
                {academicOverview?.assignments.upcoming.length ? (
                  <div className="space-y-3">
                    {academicOverview.assignments.upcoming
                      .slice(0, 5)
                      .map((assignment) => (
                        <AssignmentCard
                          key={assignment.id}
                          assignment={assignment}
                        />
                      ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No upcoming assignments"
                    description="There are no published assignments with future due dates in the available records."
                    className="border-0 bg-transparent"
                  />
                )}
              </SectionCard>

              <SectionCard
                eyebrow="ASSESSMENT WORK"
                title="Upcoming Quizzes"
                description="Published quizzes scheduled to start in the future."
                action={
                  <Link
                    to="/faculty/quizzes"
                    className="text-sm font-semibold text-[#CDB5F7] hover:underline"
                  >
                    Manage Quizzes
                  </Link>
                }
              >
                {academicOverview?.quizzes.upcoming.length ? (
                  <div className="space-y-3">
                    {academicOverview.quizzes.upcoming
                      .slice(0, 5)
                      .map((quiz) => (
                        <QuizCard
                          key={quiz.id}
                          quiz={quiz}
                        />
                      ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No upcoming quizzes"
                    description="There are no published quizzes with future start times in the available records."
                    className="border-0 bg-transparent"
                  />
                )}
              </SectionCard>
            </div>
          </>
        )}
      </section>

      {/* Recent notifications */}

      <SectionCard
        eyebrow="ACCOUNT ACTIVITY"
        title="Recent Notifications"
        description="Updates delivered to your authenticated account."
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
        {actionError && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-[#B86D78]/30 bg-[#B86D78]/10 p-3 text-sm text-[#F0B0B9]"
          >
            {actionError}
          </div>
        )}

        {isLoading ? (
          <div
            className="flex items-center justify-center gap-3 py-12 text-sm text-[#A5A6B0]"
            role="status"
            aria-live="polite"
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
            title="No notifications yet"
            description="When the backend delivers notifications to your account, they will appear here."
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
                <NotificationItem
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
      </SectionCard>
    </div>
  );
}