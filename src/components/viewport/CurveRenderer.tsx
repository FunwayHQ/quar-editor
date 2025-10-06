/**
 * CurveRenderer Component
 *
 * Renders all curves from the curve store in the viewport.
 */

import React from 'react';
import { useCurveStore } from '../../stores/curveStore';
import { useObjectsStore } from '../../stores/objectsStore';
import { CurveObject } from './CurveObject';

export function CurveRenderer() {
  const curves = useCurveStore((state) => state.curves);
  const selectedCurveIds = useCurveStore((state) => state.selectedCurveIds);
  const selectCurve = useCurveStore((state) => state.selectCurve);
  const clearObjectSelection = useObjectsStore((state) => state.clearSelection);

  const handleCurveSelect = (id: string, multiSelect: boolean) => {
    console.log('[CurveRenderer] handleCurveSelect called:', id, 'multiSelect:', multiSelect);
    // Clear object selection when selecting curves
    clearObjectSelection();
    selectCurve(id, multiSelect);
    console.log('[CurveRenderer] After select, selectedIds:', useCurveStore.getState().selectedCurveIds);
  };

  return (
    <>
      {Array.from(curves.values()).map((curve) => (
        <CurveObject
          key={curve.id}
          curve={curve}
          isSelected={selectedCurveIds.includes(curve.id)}
          onSelect={handleCurveSelect}
        />
      ))}
    </>
  );
}
