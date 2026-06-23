import Link from "next/link";

export function Footer() {
  return (
    <footer className="mx-auto mt-20 max-w-[1480px] px-7 pb-14 text-sm text-[#5d5a52]">
      <div className="rounded-[30px] border border-[#e3e1db] bg-gradient-to-b from-[#fbfaf8] to-[#f0efeb] p-8 shadow-[0_40px_80px_-60px_rgba(30,28,22,.45)] sm:p-10">
        <div className="grid gap-10 md:grid-cols-[1.1fr_.8fr]">
          <div>
            <h3 className="mb-4 text-xl font-bold tracking-[-.02em] text-[#1a1916]">yourguideinusa</h3>
            <p className="max-w-sm leading-6">Made with care for international students, newcomers, and families finding their way in the USA.</p>
          </div>
          <div>
            <h4 className="mb-4 font-['JetBrains_Mono',ui-monospace,monospace] text-xs font-medium uppercase tracking-[.18em] text-[#2f8f86]">Quick Links</h4>
            <div className="grid gap-2">
              {[{href:"/guide",l:"Guide"},{href:"/blog",l:"Blogs"},{href:"/community",l:"Community"},{href:"/contact",l:"Contact us"},{href:"/privacy",l:"Privacy"}].map((link) => (
                <Link key={link.href} href={link.href} className="w-fit hover:text-[#1a1916]">{link.l}</Link>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-[#e3e1db] pt-6 text-center text-[#a3a097]">
          © 2026 yourguideinusa. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
