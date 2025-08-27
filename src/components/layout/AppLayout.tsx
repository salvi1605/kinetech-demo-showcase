import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Topbar } from './Topbar';
import { AppSidebar } from './AppSidebar';
import { BottomNav } from './BottomNav';
import { Breadcrumbs } from './Breadcrumbs';
import { SkipLink } from '@/components/shared/SkipLink';

export const AppLayout = () => {
  return (
    <SidebarProvider defaultOpen={true}>
      <SkipLink />
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop Sidebar */}
        <AppSidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <Breadcrumbs />
          
          <main 
            id="main-content" 
            className="flex-1 overflow-auto focus:outline-none"
            tabIndex={-1}
            role="main"
            aria-label="Contenido principal"
          >
            <Outlet />
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </SidebarProvider>
  );
};