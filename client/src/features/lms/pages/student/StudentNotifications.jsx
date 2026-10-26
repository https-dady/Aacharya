// client/src/features/lms/pages/student/StudentNotifications.jsx

import { useMemo, useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import EmptyState from "../../components/EmptyState.jsx";

const FILTER_OPTIONS = [
  { label: "All notifications", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Read", value: "read" },
];

export default function StudentNotifications() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedNotification, setSelectedNotification] = useState(null);

  // Backend integration pending. No fabricated notifications.
  const notifications = [];

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return notifications.filter((notification) => {
      const matchesSearch =
        !query ||
        notification.title?.toLowerCase().includes(query) ||
        notification.message?.toLowerCase().includes(query);

      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "unread" && !notification.isRead) ||
        (activeFilter === "read" && notification.isRead);

      return matchesSearch && matchesFilter;
    });
  }, [notifications, searchQuery, activeFilter]);

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student Workspace"
        title="Notifications"
        description="View important updates and notifications related to your academic activities."
        breadcrumbs={[
          { label: "Student", to: "/student/dashboard" },
          { label: "Notifications" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#343640] bg-[#202126] p-5">
          <p className="text-sm text-[#A5A6B0]">Total notifications</p>
          <p className="mt-3 text-3xl font-semibold text-[#EAEAE6]">
            {notifications.length}
          </p>
        </div>

        <div className="rounded-2xl border border-[#343640] bg-[#202126] p-5">
          <p className="text-sm text-[#A5A6B0]">Unread notifications</p>
          <p className="mt-3 text-3xl font-semibold text-[#CDB5F7]">
            {unreadCount}
          </p>
        </div>
      </div>

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
              placeholder="Search by title or message..."
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
              onChange={(event) => setActiveFilter(event.target.value)}
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

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4">
          <p className="text-sm text-[#A5A6B0]" aria-live="polite">
            {filteredNotifications.length} notifications found
          </p>

          {(searchQuery || activeFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveFilter("all");
              }}
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
        {filteredNotifications.length === 0 ? (
          <EmptyState
            title={
              searchQuery || activeFilter !== "all"
                ? "No matching notifications"
                : "You're all caught up"
            }
            description={
              searchQuery || activeFilter !== "all"
                ? "Try changing your search term or read-status filter."
                : "Notifications will appear here when they become available for your account."
            }
            icon="♧"
            action={
              (searchQuery || activeFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveFilter("all");
                  }}
                  className="rounded-xl border border-[#3B3C43] px-4 py-2.5 text-sm font-medium text-[#EAEAE6] transition hover:bg-[#26272B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                >
                  Reset filters
                </button>
              )
            }
          />
        ) : (
          <div className="divide-y divide-[#343640]">
            {filteredNotifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => setSelectedNotification(notification)}
                className="flex w-full items-start gap-4 rounded-xl px-3 py-4 text-left transition hover:bg-[#26272B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#CDB5F7]"
              >
                <span
                  aria-hidden="true"
                  className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                    notification.isRead
                      ? "bg-[#777985]"
                      : "bg-[#CDB5F7]"
                  }`}
                />

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[#EAEAE6]">
                      {notification.title}
                    </span>

                    {!notification.isRead && (
                      <span className="rounded-full bg-[#CDB5F7]/10 px-2 py-1 text-xs font-medium text-[#CDB5F7]">
                        Unread
                      </span>
                    )}
                  </span>

                  <span className="mt-1 block text-sm text-[#A5A6B0]">
                    {notification.message}
                  </span>

                  <span className="mt-2 block text-xs text-[#777985]">
                    {notification.createdAt || "Date unavailable"}
                  </span>
                </span>

                <span
                  aria-hidden="true"
                  className="text-[#A5A6B0]"
                >
                  →
                </span>
              </button>
            ))}
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
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#CDB5F7]">
                  Notification details
                </p>

                <h2
                  id="notification-detail-title"
                  className="mt-2 text-xl font-semibold text-[#EAEAE6]"
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

            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-[#C4C5CD]">
              {selectedNotification.message}
            </p>

            <p className="mt-4 text-xs text-[#777985]">
              {selectedNotification.createdAt || "Date unavailable"}
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