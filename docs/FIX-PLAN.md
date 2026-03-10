# QUAR Editor — Code Review Fix Plan

## Phase 1: Stability (Critical + High Priority)

### 1. Fix geometry shallow-copy in `duplicateObjects()`
- **File**: `src/stores/objectsStore.ts` ~line 505
- **Problem**: `qMesh` and `renderGeometry` are shallow-copied — all duplicates share same reference
- **Fix**: Deep-clone geometry via `renderGeometry.clone()` and rebuild QMesh from cloned geometry

### 2. Fix `useKeyboardShortcuts` missing dependencies + X key conflict
- **File**: `src/hooks/useKeyboardShortcuts.ts` line 470
- **Problem**: 6 missing deps (`play`, `pause`, `stop`, `setCurrentTime`, `clearEditSelection`, `editingObjectId`) cause stale closures. Also X key conflict (delete vs shading mode).
- **Fix**: Add missing deps to array; reorder X key handling so shading mode is checked before delete

### 3. Add monotonic counter for half-edge IDs
- **File**: `src/lib/qmesh/QMesh.ts`
- **Problem**: `he_${this.halfEdges.size}` allows ID collisions after deletions
- **Fix**: Add private `_heCounter` field, increment on each creation

### 4. Fix `curveStore` Vector3/Vector2 deserialization bug
- **File**: `src/stores/curveStore.ts` line 209
- **Problem**: Deserializes 2D curve points as `THREE.Vector3` instead of `THREE.Vector2`
- **Fix**: Change `new THREE.Vector3(p.x, p.y)` to `new THREE.Vector2(p.x, p.y)`

### 5. Fix window event listeners leak in appStore
- **File**: `src/stores/appStore.ts` lines 117-123
- **Problem**: `online`/`offline` listeners added at module load, never removed
- **Fix**: Add guard to prevent duplicate registration

### 6. Fix missing auto-save dependencies
- **File**: `src/hooks/useAutoSave.ts` line 59
- **Problem**: `onSaveSuccess` and `onSaveError` missing from deps
- **Fix**: Add to dependency array

### 7. Fix morphTargetStore base pose memory leak
- **File**: `src/stores/morphTargetStore.ts`
- **Problem**: BufferGeometry clones never disposed when objects are deleted
- **Fix**: Add disposal in `clearShapeKeysForObject`

## Phase 2: Performance

### 8. Remove deprecated BufferGeometry operations (~500 lines)
- **File**: `src/lib/mesh/MeshOperations.ts` lines 256-758
- **Problem**: Old unused code: `extrudeFaces()`, `insetFaces()`, `loopCut()`, `bevel()`
- **Fix**: Delete deprecated functions, keep only QMesh-based operations

### 9. Fix BoneRenderer material-per-frame waste
- **File**: `src/components/viewport/BoneRenderer.tsx` lines 113-148
- **Problem**: Creates new materials per bone per frame
- **Fix**: Cache materials at module level indexed by [color, mode]

### 10. Shared TextureLoader singleton
- **File**: `src/components/viewport/SceneObject.tsx` lines 383-429
- **Problem**: New TextureLoader per material change
- **Fix**: Module-level shared TextureLoader instance

### 11. Fix AnimationEngine JSON.stringify comparison
- **File**: `src/lib/animation/AnimationEngine.ts` lines 103-111
- **Problem**: Uses JSON.stringify for value caching (expensive)
- **Fix**: Component-wise numeric comparison

### 12. Fix commandStore force re-render hack
- **File**: `src/stores/commandStore.ts` lines 36-37
- **Problem**: `set((state) => ({ ...state }))` spreads entire state to trigger re-render
- **Fix**: Use a version counter instead

## Phase 3: Polish

### 13. Remove dead code
- `SceneObject.tsx` lines 847-889: Commented-out bounding box code
- `MeshOperations.ts`: Deprecated functions (covered in #8)
- `curveStore.ts` line 155: Unused `generateName()`
- `boneStore.ts` line 93: Unimplemented IK methods

### 14. Add ErrorBoundary around Canvas
- **File**: `src/components/viewport/Viewport.tsx`
- **Fix**: Wrap `<Canvas>` in an error boundary component

### 15. Standardize serialization format
- Make all stores use consistent `{ key: Array }` pattern

### 16. Fix editModeStore circular dependency
- **File**: `src/stores/editModeStore.ts` lines 104-108
- **Fix**: Replace async `import()` with synchronous store access pattern
