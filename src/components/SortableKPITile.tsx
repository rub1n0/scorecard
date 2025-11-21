'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import KPITile from './KPITile';
import { KPI } from '@/types';

interface SortableKPITileProps {
    kpi: KPI;
    onEdit: () => void;
    onDelete: () => void;
}

export default function SortableKPITile({ kpi, onEdit, onDelete }: SortableKPITileProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: kpi.id });

    const style = {
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 'auto',
        position: 'relative' as 'relative',
        height: '100%',
        touchAction: 'none' // Important for pointer events
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <KPITile kpi={kpi} onEdit={onEdit} onDelete={onDelete} isDragging={isDragging} />
        </div>
    );
}
