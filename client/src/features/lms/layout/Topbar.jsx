import { useEffect, useRef, useState } from 'react';

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

  const profileMenuRef = useRef(null);

  const displayName = user?.name || 'Account';
  const displayRole = user?.role || '';

  const avatarInitial =
    displayName.trim().charAt(0).toUpperCase() || 'A';

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

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setIsProfileOpen(false);
      }
    }

    function handleEscapeKey(event) {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-[#383943] bg-[#14161C]/95 backdrop-blur-xl">
      <div className="flex min-h-20 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          aria-label="Open navigation menu"
          aria-controls="lms-sidebar"
          className={[
            'inline-flex h-10 w-10 shrink-0 items-center justify-center',
            'rounded-xl text-[#A4A4AF] transition-colors',
            'hover:bg-[#26272B] hover:text-[#EAEAE6]',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[#CDB5F7] lg:hidden',
          ].join(' ')}
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
          <h1 className="truncate text-lg font-bold tracking-tight text-[#EAEAE6] sm:text-xl">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-0.5 hidden truncate text-sm text-[#A4A4AF] sm:block">
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
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#858590]"
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
              className={[
                'h-10 w-full rounded-xl border border-[#383943]',
                'bg-[#1D1F27] pl-9 pr-3 text-sm text-[#EAEAE6]',
                'outline-none transition-colors',
                'placeholder:text-[#777783]',
                'focus:border-[#CDB5F7]',
                'focus:ring-2 focus:ring-[#CDB5F7]/15',
              ].join(' ')}
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
          className={[
            'relative inline-flex h-10 w-10 shrink-0 items-center',
            'justify-center rounded-xl text-[#A4A4AF]',
            'transition-colors hover:bg-[#26272B]',
            'hover:text-[#EAEAE6]',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[#CDB5F7]',
          ].join(' ')}
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

            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 21h4"
            />
          </svg>

          {notificationCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#E5DF98] ring-2 ring-[#14161C]"
            />
          )}
        </button>

        <div ref={profileMenuRef} className="relative shrink-0">
          <button
            type="button"
            aria-expanded={isProfileOpen}
            aria-haspopup="menu"
            aria-label="Open profile menu"
            className={[
              'flex items-center gap-2 rounded-xl p-1.5',
              'transition-colors hover:bg-[#26272B]',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[#CDB5F7]',
            ].join(' ')}
            onClick={() => {
              setIsProfileOpen((current) => !current);
            }}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#CDB5F7]/25 bg-[#CDB5F7]/15 text-sm font-bold text-[#CDB5F7]">
              {avatarInitial}
            </span>

            <span className="hidden max-w-32 text-left sm:block">
              <span className="block truncate text-sm font-semibold text-[#EAEAE6]">
                {displayName}
              </span>

              {displayRole && (
                <span className="block truncate text-xs capitalize text-[#A4A4AF]">
                  {displayRole.replaceAll('_', ' ')}
                </span>
              )}
            </span>

            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className={[
                'hidden h-4 w-4 text-[#858590] sm:block',
                'transition-transform duration-150',
                isProfileOpen ? 'rotate-180' : '',
              ].join(' ')}
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
              className={[
                'absolute right-0 top-full mt-2 w-56',
                'rounded-xl border border-[#383943]',
                'bg-[#1D1F27] p-1.5 shadow-2xl shadow-black/30',
              ].join(' ')}
            >
              <div className="border-b border-[#383943] px-3 py-3">
                <p className="truncate text-sm font-semibold text-[#EAEAE6]">
                  {displayName}
                </p>

                {displayRole && (
                  <p className="mt-1 truncate text-xs capitalize text-[#A4A4AF]">
                    {displayRole.replaceAll('_', ' ')}
                  </p>
                )}
              </div>

              <button
                type="button"
                role="menuitem"
                className={[
                  'mt-1 w-full rounded-lg px-3 py-2.5 text-left',
                  'text-sm text-[#EAEAE6] transition-colors',
                  'hover:bg-[#26272B]',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-[#CDB5F7]',
                ].join(' ')}
                onClick={handleProfileClick}
              >
                My Profile
              </button>

              <button
                type="button"
                role="menuitem"
                className={[
                  'w-full rounded-lg px-3 py-2.5 text-left',
                  'text-sm text-[#E5DF98] transition-colors',
                  'hover:bg-[#E5DF98]/10',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-[#E5DF98]',
                ].join(' ')}
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