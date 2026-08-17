import React from 'react';
import { NavLink } from 'react-router-dom';
import { FileStack, BookMarked, FilePlus2 } from 'lucide-react';

const links = [
  { to: '/dashboard', label: 'Case Files', icon: FileStack },
  { to: '/links', label: 'Docket', icon: BookMarked },
  { to: '/upload-template', label: 'New Filing', icon: FilePlus2 },
];

const TabRail = () => {
  return (
    <nav className="tab-rail" aria-label="Primary">
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
          <Icon size={17} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
};

export default TabRail;
