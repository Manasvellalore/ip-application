import Link from "next/link";

export default function BargadShellHeader() {
  return (
    <header className="relative z-20 w-full shrink-0 border-b border-[#24aa4d]/35 bg-gradient-to-r from-[#010806] via-[#071910] to-[#03140c] shadow-[inset_0_-1px_0_0_rgba(36,170,77,0.12),0_12px_40px_-12px_rgba(0,0,0,0.85)]">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:h-[4.5rem] sm:px-6 md:px-8">
        <Link
          href="/"
          className="flex items-center outline-none ring-[#24aa4d]/40 focus-visible:ring-2"
        >
            {/* eslint-disable-next-line @next/next/no-img-element -- static public asset, matches Navbar */}
            <img
              src="/white_logo.png"
            alt="Bargad"
            className="h-10 w-auto object-contain sm:h-12 md:h-14"
          />
        </Link>
      </div>
    </header>
  );
}
