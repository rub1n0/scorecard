# Drag and Drop Implementation Review

## Implementation Overview

The KPI Scorecard now supports drag-and-drop functionality using `@dnd-kit`, allowing users to:
- Drag KPI tiles to reorder them
- Move KPI tiles between different sections
- Automatically persist changes to the backend

## Architecture

### Components

1. **`SortableKPITile.tsx`** - Wrapper component that makes individual KPI tiles draggable
2. **`ScorecardView.tsx`** - Main view implementing `DndContext` and drag handlers
3. **`KPITile.tsx`** - Base tile component with `isDragging` prop to optimize rendering

### Key Libraries

- `@dnd-kit/core` - Core drag-and-drop functionality
- `@dnd-kit/sortable` - Sortable list utilities
- `@dnd-kit/utilities` - Helper utilities for transforms

## How It Works

### 1. Setup (ScorecardView.tsx)

```typescript
// Sensors define how drag is initiated
const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);
```

- **PointerSensor**: Requires 8px movement before drag starts (prevents accidental drags)
- **KeyboardSensor**: Enables accessibility

### 2. Drag Events

**handleDragStart**:
- Captures which item is being dragged
- Snapshots current sections to prevent UI glitches

**handleDragOver**:
- Detects when dragging over sections or other items
- Optimistically updates the item's section in local state
- Provides real-time visual feedback

**handleDragEnd**:
- Persists the change to the backend via `updateKPI`
- Clears drag state

### 3. Performance Optimization

**Chart Rendering During Drag**:
```typescript
// In KPITile.tsx
if (isDragging) {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-industrial-500 font-mono text-sm">Moving...</div>
        </div>
    );
}
```

When `isDragging` is true:
- ApexCharts is not rendered (prevents "parser Error")
- Shows lightweight placeholder
- Dramatically improves drag performance
- Avoids DOM conflicts with chart libraries

## Common Issues and Solutions

### Issue 1: "parser Error" from ApexCharts

**Symptom**: Runtime error mentioning `apexcharts.esm.js` and `Ee.parse`

**Cause**: ApexCharts fails to initialize when the component is cloned for the drag overlay

**Solution**: ✅ **FIXED** - Charts are now hidden during drag via `isDragging` prop

### Issue 2: Items Not Moving Between Sections

**Possible Causes**:
1. Section ID mismatch in `DroppableSection`
2. `handleDragOver` not detecting the target section
3. Backend update failing

**Debug Steps**:
```javascript
// Add console.log in handleDragOver
console.log('Over:', overId, 'Target Section:', targetSection);
```

### Issue 3: Drag Not Starting

**Possible Causes**:
1. Pointer sensor activation distance not met (need to drag 8px)
2. Touch events conflicting
3. Z-index issues

**Debug Steps**:
- Check if `handleDragStart` is being called
- Verify CSS `position: relative` on sortable wrapper
- Test with mouse vs touch

### Issue 4: State Not Persisting

**Check**:
1. `updateKPI` is being called in `handleDragEnd`
2. API endpoint `/api/scorecards/[id]` is working
3. Network tab shows successful PUT request

## Testing Checklist

### Manual Testing

- [ ] Can drag a tile within the same section
- [ ] Can drag a tile to a different section
- [ ] Tile visually moves during drag
- [ ] Drag overlay shows "Moving..." placeholder
- [ ] No "parser Error" in console
- [ ] Changes persist after refresh
- [ ] Can drag with mouse
- [ ] Can drag with touch (if applicable)
- [ ] Keyboard navigation works (tab to tile, space to grab, arrows to move)

### Automated Testing

**Current Status**: Manual testing required due to WSL browser automation limitations

**Alternative**: Use Puppeteer/Playwright directly in Windows

## Debugging Tips

### 1. Check Browser Console

**Common Errors**:
- `parser Error` → Chart rendering issue (should be fixed)
- `Cannot read property 'id' of undefined` → Invalid KPI data
- `updateKPI is not defined` → Context issue

### 2. Check Network Tab

Watch for:
- PUT request to `/api/scorecards/[id]` after drop
- 200 status code
- Updated KPI data in response

### 3. Check React DevTools

Inspect:
- `items` state in `ScorecardView`
- `isDragging` prop in `SortableKPITile`
- `activeId` during drag

### 4. Enable Verbose Logging

Add to `handleDragStart`, `handleDragOver`, `handleDragEnd`:

```typescript
console.log('🎯 Drag Start:', event);
console.log('📍 Drag Over:', { activeId, overId, targetSection });
console.log('✅ Drag End:', { activeItem, originalItem });
```

## Known Limitations

1. **No Reordering Within Section**: Currently only supports moving between sections, not reordering within the same section
2. **Mobile Touch**: Requires `touchAction: 'none'` which may conflict with scroll on mobile
3. **WSL Browser Testing**: Automated tests need Windows-based browser or headless mode

## Future Enhancements

- [ ] Drag to reorder within a section
- [ ] Multi-select and bulk drag
- [ ] Drag preview showing actual tile content
- [ ] Undo/redo for drag operations
- [ ] Animations for tile movements
- [ ] Touch gesture improvements

## Getting Help

If you encounter an error:

1. **Check the browser console** for JavaScript errors
2. **Check the terminal** running `npm run dev` for server errors
3. **Provide**:
   - Full error message and stack trace
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser and OS version

## File References

- Implementation: [`src/components/ScorecardView.tsx`](file:///home/rub0t/scorecard/src/components/ScorecardView.tsx)
- Sortable Wrapper: [`src/components/SortableKPITile.tsx`](file:///home/rub0t/scorecard/src/components/SortableKPITile.tsx)
- Base Tile: [`src/components/KPITile.tsx`](file:///home/rub0t/scorecard/src/components/KPITile.tsx)
