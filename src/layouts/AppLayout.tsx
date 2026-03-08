import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopbar } from '@/components/AppTopbar';

export const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="ml-60">
        <AppTopbar />
        <main className="px-8 py-8">
          <div className="max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
