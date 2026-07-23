import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { getSubscriptionStatus } from "@/lib/subscription";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { companyId?: string; role?: string; isSystemAdmin?: boolean; isApproved?: boolean } | undefined;
    const companyId = sessionUser?.companyId;
    const isSystemAdmin = sessionUser?.isSystemAdmin === true;
    const isApprovalAdmin = isSystemAdmin || sessionUser?.role === 'ADMIN';

    if (!companyId && !isSystemAdmin) {
      redirect('/login');
    }

    if (companyId && !isApprovalAdmin) {
      let subscription: Awaited<ReturnType<typeof getSubscriptionStatus>> | null = null;

      try {
        subscription = await getSubscriptionStatus(companyId);
      } catch (error) {
        console.error('[DashboardLayout] Failed to load subscription status', error);
      }

      // Allow access if the user was explicitly approved by an admin.
      const sessionUserApproved = sessionUser?.isApproved === true;

      if (subscription && !subscription.isActive && !sessionUserApproved) {
        redirect('/plans');
      }
    }
  } catch (error) {
    console.error('[DashboardLayout] Failed to resolve session', error);
    redirect('/login');
  }

  return (
    <div className="flex w-full min-h-full flex-row">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
