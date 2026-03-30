export const dynamic = "force-dynamic";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-gray-200">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Pulse
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <Link
            href="/"
            className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Projects
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
