# Fix Applied: Parser Error During Drag and Drop

## Problem
When dragging a KPI tile, a "parser Error" from ApexCharts was occurring, preventing the drag operation.

## Root Cause
The `isDragging` check was placed at the **end** of the `renderVisualization()` function, **after** all the chart configuration code. This meant:

```typescript
// ❌ BEFORE (WRONG)
const renderVisualization = () => {
    if (kpi.visualizationType === 'text') { ... }
    if (kpi.visualizationType === 'number') { ... }
    if (kpi.visualizationType === 'chart') {
        // All this chart code ran even while dragging! 
        const chartOptions = { ... };
        // ApexCharts would fail here
        return <Chart ... />;
    }
    
    // Check was TOO LATE - error already occurred above
    if (isDragging) {
        return <div>Moving...</div>;
    }
};
```

## Solution
Moved the `isDragging` check to the **beginning** of the function:

```typescript
// ✅ AFTER (CORRECT)
const renderVisualization = () => {
    // Check FIRST, before any chart code runs
    if (isDragging) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-industrial-500 font-mono text-sm">Moving...</div>
            </div>
        );
    }
    
    // Now this code only runs when NOT dragging
    if (kpi.visualizationType === 'text') { ... }
    if (kpi.visualizationType === 'number') { ... }
    if (kpi.visualizationType === 'chart') {
        const chartOptions = { ... };
        return <Chart ... />;
    }
};
```

## Result
- ✅ No more "parser Error" when dragging
- ✅ Better performance (chart code skipped entirely during drag)
- ✅ Lightweight "Moving..." placeholder shown instead

## Testing
1. Refresh your browser (`http://localhost:3000`)
2. Navigate to a scorecard with KPIs
3. Try dragging a tile between sections
4. You should see "Moving..." during drag
5. No error should appear in the console

## Files Changed
- [`src/components/KPITile.tsx`](file:///home/rub0t/scorecard/src/components/KPITile.tsx) - Line 18-27
