import { useState } from 'react';

export default function Topbar({
  title = 'Dashboard',
  subtitle = '',
  user = null,
  notificationCount = 0,
  onMenuClick,
  onSearch,
  onNotificationsClick,
  onProfileClick,
  onLogout,
}) {
  const [searchValue, setSearchValue] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const displayName = user?.name || 'Account';
  const displayRole = user?.role || '';
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || 'A';

  function handleSearchSubmit(event) {
    event.preventDefault();

    const query = searchValue.trim();

    if (query && onSearch) {
      onSearch(query);
    }
  }

  function handleProfileClick() {
    setIsProfileOpen(false);

    if (onProfileClick) {
      onProfileClick();
    }
  }

  async function handleLogout() {
    setIsProfileOpen(false);

    if (onLogout) {
      await onLogout();
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-20 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          aria-label="Open navigation menu"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden"
          onClick={onMenuClick}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-0.5 hidden truncate text-sm text-slate-500 sm:block">
              {subtitle}
            </p>
          )}
        </div>

        <form
          role="search"
          onSubmit={handleSearchSubmit}
          className="hidden w-full max-w-xs md:block"
        >
          <label htmlFor="lms-global-search" className="sr-only">
            Search
          </label>

          <div className="relative">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            >
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path strokeLinecap="round" d="m16 16 4 4" />
            </svg>

            <input
              id="lms-global-search"
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </form>

        <button
          type="button"
          aria-label={
            notificationCount > 0
              ? `Notifications, ${notificationCount} unread`
              : 'Notifications'
          }
          className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          onClick={onNotificationsClick}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 21h4" />
          </svg>

          {notificationCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"
            />
          )}
        </button>

        <div className="relative shrink-0">
          <button
            type="button"
            aria-expanded={isProfileOpen}
            aria-haspopup="menu"
            aria-label="Open profile menu"
            className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            onClick={() => setIsProfileOpen((current) => !current)}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              {avatarInitial}
            </span>

            <span className="hidden max-w-32 text-left sm:block">
              <span className="block truncate text-sm font-semibold text-slate-800">
                {displayName}
              </span>

              {displayRole && (
                <span className="block truncate text-xs text-slate-500">
                  {displayRole}
                </span>
              )}
            </span>

            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="hidden h-4 w-4 text-slate-400 sm:block"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m7 10 5 5 5-5"
              />
            </svg>
          </button>

          {isProfileOpen && (
            <div
              role="menu"
              aria-label="Account menu"
              className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-200/60"
            >
              <button
                type="button"
                role="menuitem"
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                onClick={handleProfileClick}
              >
                My Profile
              </button>

              <button
                type="button"
                role="menuitem"
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}