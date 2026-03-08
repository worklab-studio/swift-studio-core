import { ChevronRight, Menu } from 'lucide-react';

interface AppTopbarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
}

export const AppTopbar = ({ collapsed, onToggle, isMobile }: AppTopbarProps) => {
  return (
    <header className="h-12 border-b flex items-center px-4">
      {!isMobile && collapsed && (
        <button onClick={onToggle} className="rounded-md p-1.5 hover:bg-muted transition-colors">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </header>
  );
};
