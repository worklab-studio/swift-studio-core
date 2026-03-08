import { createContext, useContext, useState, ReactNode } from 'react';

interface NewProjectContextType {
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
}

const NewProjectContext = createContext<NewProjectContextType>({
  isOpen: false,
  openDialog: () => {},
  closeDialog: () => {},
});

export const NewProjectDialogProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <NewProjectContext.Provider value={{ isOpen, openDialog: () => setIsOpen(true), closeDialog: () => setIsOpen(false) }}>
      {children}
    </NewProjectContext.Provider>
  );
};

export const useNewProjectDialog = () => useContext(NewProjectContext);
