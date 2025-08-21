import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Topbar } from './Topbar';
import { AppSidebar } from './AppSidebar';
import { BottomNav } from './BottomNav';
import { Breadcrumbs } from './Breadcrumbs';

export const AppLayout = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop Sidebar */}
        <AppSidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <Topbar />
          <Breadcrumbs />
          
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </SidebarProvider>
  );
};