import React from 'react';

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {}

function createIcon(name: string) {
  return ({ className = '', ...props }: IconProps) => (
    <span {...props} className={`material-symbols-outlined ${className}`}>{name}</span>
  );
}

export const HomeIcon = createIcon('home');
export const MoonIcon = createIcon('dark_mode');
export const SunIcon = createIcon('light_mode');
export const BarsIcon = createIcon('menu');
export const CloseIcon = createIcon('close');
export const DuplicateIcon = createIcon('content_copy');
export const EditIcon = createIcon('edit');
export const TrashIcon = createIcon('delete');
export const PlusIcon = createIcon('add');
export const CheckIcon = createIcon('check');
