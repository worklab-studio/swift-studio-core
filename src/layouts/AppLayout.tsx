import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopbar } from '@/components/AppTopbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { NewProjectDialogProvider } from '@/contexts/NewProjectContext';
import NewProjectDialog from '@/components/NewProjectDialog';
import { useIsMobile } from '@/hooks/use-mobile';

export const AppLayout = () => {
  const isMobile = useIsMobile();
  const location = useLocation();

  return (
    <NewProjectDialogProvider>
      <div className="min-h-screen bg-background">
        {!isMobile && <AppSidebar />}
        <div className={isMobile ? '' : 'ml-60'}>
          <AppTopbar />
          <main className="px-4 sm:px-8 py-8 pb-24 sm:pb-8">
            <div key={location.pathname}>
              <div className="animate-fade-in">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
        {isMobile && <MobileBottomNav />}
      </div>
      <NewProjectDialog />
    </NewProjectDialogProvider>
  );
};
