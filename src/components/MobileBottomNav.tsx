import { LayoutDashboard, Plus, FolderOpen, Users, Settings } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useNewProjectDialog } from '@/contexts/NewProjectContext';

export const MobileBottomNav = () => {
  const { openDialog } = useNewProjectDialog();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex h-16 items-center justify-around border-t bg-background sm:hidden">
      <NavLink
        to="/app/dashboard"
        end
        className="flex flex-col items-center gap-1 text-xs text-muted-foreground"
        activeClassName="text-primary"
      >
        <LayoutDashboard className="h-5 w-5" />
        <span>Home</span>
      </NavLink>
      <button onClick={() => openDialog()} className="flex flex-col items-center gap-1 text-xs text-primary">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Plus className="h-5 w-5" />
        </div>
      </button>
      <NavLink
        to="/app/projects"
        end
        className="flex flex-col items-center gap-1 text-xs text-muted-foreground"
        activeClassName="text-primary"
      >
        <FolderOpen className="h-5 w-5" />
        <span>Projects</span>
      </NavLink>
      <NavLink
        to="/app/settings"
        end
        className="flex flex-col items-center gap-1 text-xs text-muted-foreground"
        activeClassName="text-primary"
      >
        <Settings className="h-5 w-5" />
        <span>Settings</span>
      </NavLink>
    </nav>
  );
};
