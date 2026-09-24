import { YuhomeLogo } from "./yuhome-logo";

const NAV = [
  { label: "Automated Laundry Systems", href: "#" },
  { label: "Floor Washer", href: "#" },
  { label: "Water Purifier", href: "#" },
  { label: "Accessories", href: "#" },
];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-[21px]">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" strokeLinecap="round" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-[21px]">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.8 7.8 0 0 1 15 0" strokeLinecap="round" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-[21px]">
      <path d="M4.5 7.5h15l-1.2 12.2a1.4 1.4 0 0 1-1.4 1.3H7.1a1.4 1.4 0 0 1-1.4-1.3L4.5 7.5Z" strokeLinejoin="round" />
      <path d="M8.7 9.6V6.4a3.3 3.3 0 0 1 6.6 0v3.2" strokeLinecap="round" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="relative z-50 w-full bg-white">
      <div className="relative mx-auto flex h-14 items-center px-5 sm:px-6">
        <a href="#" aria-label="yuhome home" className="shrink-0">
          <YuhomeLogo className="h-[33px] w-auto" />
        </a>

        {/* Nav is optically centred in the bar, independent of the logo width. */}
        <nav className="pointer-events-none absolute inset-x-0 hidden justify-center lg:flex">
          <ul className="pointer-events-auto flex items-center gap-7 font-brand text-[13.5px] text-[#222]">
            {NAV.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="transition-colors hover:text-[#F0765A]"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-5 text-[#222] sm:gap-6">
          <button aria-label="Search" className="transition-colors hover:text-[#F0765A]">
            <SearchIcon />
          </button>
          <button aria-label="Account" className="transition-colors hover:text-[#F0765A]">
            <AccountIcon />
          </button>
          <button aria-label="Cart" className="transition-colors hover:text-[#F0765A]">
            <CartIcon />
          </button>
        </div>
      </div>
    </header>
  );
}
