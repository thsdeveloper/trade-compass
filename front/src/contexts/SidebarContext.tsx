'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

const STORAGE_KEY_COLLAPSED = 'sidebar-collapsed';
const STORAGE_KEY_EXPANDED_GROUPS = 'sidebar-expanded-groups';

interface SidebarContextType {
  /** Mobile drawer open state */
  isOpen: boolean;
  /** Set mobile drawer open state */
  setIsOpen: (open: boolean) => void;
  /** Desktop sidebar collapsed state (icon-only mode) */
  isCollapsed: boolean;
  /** Toggle desktop sidebar collapsed state */
  toggleCollapsed: () => void;
  /** List of expanded group IDs */
  expandedGroups: string[];
  /** Toggle a group's expanded state */
  toggleGroup: (groupId: string) => void;
  /** Check if a group is expanded */
  isGroupExpanded: (groupId: string) => boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['financas', 'investimentos']);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate state from localStorage on mount
  useEffect(() => {
    const storedCollapsed = localStorage.getItem(STORAGE_KEY_COLLAPSED);
    const storedGroups = localStorage.getItem(STORAGE_KEY_EXPANDED_GROUPS);

    if (storedCollapsed !== null) {
      setIsCollapsed(JSON.parse(storedCollapsed));
    }
    if (storedGroups !== null) {
      setExpandedGroups(JSON.parse(storedGroups));
    }
    setIsHydrated(true);
  }, []);

  // Persist collapsed state
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY_COLLAPSED, JSON.stringify(isCollapsed));
    }
  }, [isCollapsed, isHydrated]);

  // Persist expanded groups
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY_EXPANDED_GROUPS, JSON.stringify(expandedGroups));
    }
  }, [expandedGroups, isHydrated]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  }, []);

  const isGroupExpanded = useCallback(
    (groupId: string) => expandedGroups.includes(groupId),
    [expandedGroups]
  );

  const value = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      isCollapsed,
      toggleCollapsed,
      expandedGroups,
      toggleGroup,
      isGroupExpanded,
    }),
    [isOpen, isCollapsed, toggleCollapsed, expandedGroups, toggleGroup, isGroupExpanded]
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
