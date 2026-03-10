# Sprint 8 Extension: Boolean Operations for Meshes

**Addition to Sprint 8**: CSG (Constructive Solid Geometry) operations
**Timeline**: +2 days (Oct 18-19, 2024)
**Complexity**: MEDIUM-HIGH
**Value**: VERY HIGH - Professional modeling feature

---

## 🎯 Overview

Add **boolean operations** to combine or modify meshes:
- **Union (Addition)**: Combine two meshes into one
- **Subtract**: Remove one mesh from another
- **Intersect**: Keep only overlapping volume
- **Split**: Separate mesh into pieces

**UX Pattern**: When 2 objects selected → Special "Boolean Operations" panel appears

---

## 📋 Requirements

### Core Features:
1. ✅ Detect when 2 meshes are selected
2. ✅ Show Boolean Operations panel (instead of Properties)
3. ✅ Union operation (A + B)
4. ✅ Subtract operation (A - B)
5. ✅ Intersect operation (A ∩ B)
6. ✅ Split operation (separate mesh)
7. ✅ Real-time preview
8. ✅ Undo/redo support

### Bonus Features:
- ✅ Preview before applying
- ✅ Option to keep/delete original meshes
- ✅ Performance optimization (chunked processing)
- ⏭️ Hollow operation (shell/offset)

---

## 🛠️ Technical Architecture

### CSG Library:

**Using: @jscad/csg** (Recommended by user)
```bash
npm install @jscad/csg
```

**Pros:**
- Lightweight (~30KB)
- Battle-tested (used in OpenJSCAD)
- Simple, clean API
- Fast for most use cases
- Well-documented

**Cons:**
- May need geometry conversion (CSG ↔ Three.js)

**Alternative wrapper**: `THREE-CSGMesh`
```bash
npm install three-csg-mesh
```
- Direct Three.js integration
- ~20KB bundle size
- Based on csg.js

---

## 📁 File Structure

### New Files (~10 files):

**Stores** (1 file):
- `src/stores/booleanOperationsStore.ts` - State for boolean ops

**Libraries** (2 files):
- `src/lib/mesh/BooleanOperations.ts` - CSG operations wrapper
- `src/lib/mesh/__tests__/BooleanOperations.test.ts` - 20+ tests

**Components** (3 files):
- `src/components/panels/BooleanOperationsPanel.tsx` - Boolean UI
- `src/components/modals/BooleanModal.tsx` - Operation modal with preview
- `src/components/panels/__tests__/BooleanOperationsPanel.test.tsx` - Tests

**Commands** (2 files):
- `src/lib/commands/BooleanCommands.ts` - Undo/redo
- `src/lib/commands/__tests__/BooleanCommands.test.ts` - Tests

**Integration** (modify existing):
- `src/components/panels/RightSidebar.tsx` - Add boolean tab logic
- `src/components/viewport/Viewport.tsx` - Handle boolean preview

---

## 🎨 UI Design

### Boolean Operations Panel (Right Sidebar)

```
┌─ BOOLEAN OPERATIONS ────────────────┐
│ Selected: 2 objects                 │
│ • Cube_1 (base)                     │
│ • Sphere_1 (tool)                   │
│                                     │
│ ┌─────────────┬─────────────┐      │
│ │   Union     │   Subtract  │      │
│ │     ∪       │      −      │      │
│ │   [Icon]    │   [Icon]    │      │
│ └─────────────┴─────────────┘      │
│ ┌─────────────┬─────────────┐      │
│ │  Intersect  │    Split    │      │
│ │     ∩       │      ✂      │      │
│ │   [Icon]    │   [Icon]    │      │
│ └─────────────┴─────────────┘      │
│                                     │
│ ─ OPTIONS ──────────────────────── │
│ ☑ Keep original meshes              │
│ ☐ Delete originals after operation │
│                                     │
│ ─ PREVIEW ──────────────────────── │
│ [Show Preview]                      │
└─────────────────────────────────────┘
```

### Boolean Modal

```
┌─ Union: Cube_1 + Sphere_1 ──────────┐
│                                  [X] │
├─────────────────────────────────────┤
│                                     │
│ Operation: Union (Combine)          │
│                                     │
│ Base Mesh:    Cube_1                │
│ Tool Mesh:    Sphere_1              │
│                                     │
│ Options:                            │
│ ☐ Keep Original Meshes              │
│ ☑ Delete Originals (Replace)        │
│                                     │
│ ⚠️ Complex meshes may take time     │
│                                     │
│          [Cancel]  [Apply Union]    │
└─────────────────────────────────────┘
```

---

## 🔧 Implementation

### Day 1 (Oct 18): Infrastructure & Union

#### Tasks:
1. **Install three-csg-mesh (csg.js wrapper)**
   ```bash
   npm install three-csg-mesh
   ```

2. **Create BooleanOperations.ts**
   ```typescript
   import { CSG } from 'three-csg-mesh';
   import * as THREE from 'three';

   export type BooleanOperation = 'union' | 'subtract' | 'intersect';

   export function performUnion(
     meshA: THREE.Mesh,
     meshB: THREE.Mesh
   ): THREE.Mesh {
     const csgA = CSG.fromMesh(meshA);
     const csgB = CSG.fromMesh(meshB);
     const result = csgA.union(csgB);
     const mesh = CSG.toMesh(result, meshA.matrix);
     mesh.geometry.computeVertexNormals();
     return mesh;
   }

   export function performSubtract(
     meshA: THREE.Mesh,
     meshB: THREE.Mesh
   ): THREE.Mesh {
     const csgA = CSG.fromMesh(meshA);
     const csgB = CSG.fromMesh(meshB);
     const result = csgA.subtract(csgB);
     const mesh = CSG.toMesh(result, meshA.matrix);
     mesh.geometry.computeVertexNormals();
     return mesh;
   }

   export function performIntersect(
     meshA: THREE.Mesh,
     meshB: THREE.Mesh
   ): THREE.Mesh {
     const csgA = CSG.fromMesh(meshA);
     const csgB = CSG.fromMesh(meshB);
     const result = csgA.intersect(csgB);
     const mesh = CSG.toMesh(result, meshA.matrix);
     mesh.geometry.computeVertexNormals();
     return mesh;
   }
   ```

3. **Create booleanOperationsStore.ts**
   ```typescript
   interface BooleanOperationsStore {
     activeOperation: BooleanOperation | null;
     baseMeshId: string | null;
     toolMeshId: string | null;
     keepOriginals: boolean;

     setOperation: (op: BooleanOperation) => void;
     setMeshes: (baseId: string, toolId: string) => void;
     setKeepOriginals: (keep: boolean) => void;
     reset: () => void;
   }
   ```

4. **Create BooleanOperationsPanel.tsx**
   - Show when exactly 2 objects selected
   - 4 operation buttons (Union, Subtract, Intersect, Split)
   - Keep/Delete originals checkbox
   - Preview button

5. **Test Union operation**
   - Create tests for union
   - Test with simple primitives (cube + sphere)
   - Verify geometry is valid

#### Acceptance Criteria:
- [ ] Union works for 2 meshes
- [ ] Creates new mesh with combined geometry
- [ ] Undo/redo works
- [ ] 20+ tests passing

---

### Day 2 (Oct 19): Subtract, Intersect & Polish

#### Tasks:
1. **Implement Subtract operation**
   - A - B (subtract B from A)
   - Handle order (which is base, which is tool)
   - Test with overlapping meshes

2. **Implement Intersect operation**
   - A ∩ B (keep only overlap)
   - Test with partial overlap
   - Test with no overlap (empty result)

3. **Implement Split operation**
   - Separate mesh into disconnected parts
   - May use island detection algorithm
   - Or defer to future if too complex

4. **Create BooleanModal.tsx**
   - Preview before applying
   - Show operation result in real-time
   - Option to swap base/tool
   - Loading indicator for slow operations

5. **Integrate into RightSidebar**
   - Auto-switch to Boolean tab when 2 objects selected
   - Hide Properties/Material panels when boolean active
   - Show Boolean panel with 4 operations

6. **Create BooleanCommands.ts**
   ```typescript
   class BooleanOperationCommand implements Command {
     constructor(
       private baseMeshId: string,
       private toolMeshId: string,
       private operation: BooleanOperation,
       private keepOriginals: boolean
     ) {}

     execute() {
       // Perform boolean op
       // Create result mesh
       // Optionally delete originals
     }

     undo() {
       // Restore original meshes
       // Delete result mesh
     }
   }
   ```

7. **Performance optimization**
   - Show progress for slow operations (>1 second)
   - Debounce preview generation
   - Option to disable preview for complex meshes

#### Acceptance Criteria:
- [ ] All 4 operations working
- [ ] Preview system functional
- [ ] Undo/redo works for all operations
- [ ] Performance acceptable (<2s for simple meshes)
- [ ] 40+ tests passing total

---

## 🧪 Testing Strategy

### Unit Tests (40+ tests):

**BooleanOperations.ts** (20 tests):
- Union: 2 cubes, cube + sphere, overlapping, non-overlapping
- Subtract: cube - sphere, overlapping volumes, no overlap
- Intersect: cube ∩ sphere, overlapping only, no overlap
- Split: single mesh, multi-island mesh
- Edge cases: null meshes, invalid geometry

**booleanOperationsStore.ts** (10 tests):
- Set operation type
- Set base/tool meshes
- Toggle keep originals
- Reset state

**BooleanCommands.ts** (10 tests):
- Execute union command
- Undo union command
- Execute subtract command
- Undo subtract command
- Keep originals behavior
- Delete originals behavior

### Integration Tests (5 tests):
- Select 2 objects → Boolean panel appears
- Perform union → New object created
- Undo boolean operation → Originals restored
- Boolean with material preservation
- Boolean operation saved/loaded with project

### E2E Tests (3 tests):
- User creates cube + sphere → Union → Export GLB
- User creates complex shape → Boolean operations → Undo/redo
- User performs multiple boolean ops in sequence

---

## ⚠️ Technical Challenges

### Challenge 1: CSG Performance
**Problem**: Boolean operations can be slow for high-poly meshes (10k+ vertices)

**Solutions**:
- Show loading indicator for operations >500ms
- Option to disable real-time preview
- Recommend decimation before boolean ops
- Use Web Worker for heavy computation (if time allows)

### Challenge 2: Invalid Geometry
**Problem**: CSG can produce invalid geometry (non-manifold, degenerate triangles)

**Solutions**:
- Validate output geometry
- Show error message if operation fails
- Provide "Repair Mesh" option
- Mesh validation utilities

### Challenge 3: Material Handling
**Problem**: How to handle materials when combining meshes?

**Solutions**:
- Keep base mesh material by default
- Option to merge materials
- Option to create multi-material mesh (future)
- Document material behavior

### Challenge 4: Bundle Size
**Problem**: three-csg-mesh adds ~20-30KB to bundle

**Solutions**:
- Lazy load CSG library (only when needed)
- Code splitting for boolean panel
- Very small cost for powerful feature (~20KB)

---

## 📊 Success Metrics

### Functionality:
- ✅ Union 2 simple meshes (<1s)
- ✅ Subtract overlapping volumes
- ✅ Intersect creates correct result
- ✅ Split separates disconnected parts
- ✅ Preview updates in real-time

### Performance:
- Union: <1s for 1k vertices, <5s for 10k vertices
- Subtract: <1s for 1k vertices
- Intersect: <1s for 1k vertices
- Preview: <500ms or disabled for complex meshes

### Quality:
- ✅ Valid geometry output (manifold, no NaN)
- ✅ Proper normals computed
- ✅ UVs preserved where possible
- ✅ Materials handled correctly
- ✅ Undo/redo works perfectly

### Testing:
- ✅ 40+ boolean operation tests
- ✅ All tests passing
- ✅ >80% code coverage

---

## 🎨 User Experience Flow

### Workflow:
1. **Create/Import 2 meshes** (e.g., cube + sphere)
2. **Select both meshes** (Shift+Click or box select)
3. **Right sidebar auto-switches** to "Boolean Operations" panel
4. **Choose operation** (Union/Subtract/Intersect/Split)
5. **Modal opens** with preview
6. **Adjust options** (keep originals, swap base/tool)
7. **Click Apply** → New mesh created!
8. **Undo if needed** → Restores originals

### Visual Feedback:
- Selected meshes highlighted
- Preview mesh semi-transparent
- Progress indicator for slow operations
- Success/error notifications

---

## 🔄 Integration Points

### RightSidebar.tsx:
```typescript
const { selectedIds } = useObjectsStore();
const [activeTab, setActiveTab] = useState<Tab>('properties');

// Auto-switch to boolean tab when 2 objects selected
useEffect(() => {
  if (selectedIds.length === 2 && !isEditMode) {
    setActiveTab('boolean');
  }
}, [selectedIds.length, isEditMode]);

// Tabs
{selectedIds.length === 2 && (
  <button onClick={() => setActiveTab('boolean')}>
    <Combine className="w-4 h-4" />
    Boolean
  </button>
)}

// Content
{activeTab === 'boolean' && <BooleanOperationsPanel />}
```

### BooleanOperationsPanel.tsx:
```typescript
export function BooleanOperationsPanel() {
  const selectedIds = useObjectsStore((state) => state.selectedIds);
  const getObject = useObjectsStore((state) => state.getObject);

  if (selectedIds.length !== 2) {
    return <div>Select exactly 2 objects for boolean operations</div>;
  }

  const [baseMesh, toolMesh] = selectedIds;
  const baseObj = getObject(baseMesh);
  const toolObj = getObject(toolMesh);

  return (
    <div className="p-4 space-y-4">
      <h3>Boolean Operations</h3>

      {/* Operation Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => performUnion()}>Union</button>
        <button onClick={() => performSubtract()}>Subtract</button>
        <button onClick={() => performIntersect()}>Intersect</button>
        <button onClick={() => performSplit()}>Split</button>
      </div>

      {/* Options */}
      <label>
        <input type="checkbox" checked={keepOriginals} />
        Keep original meshes
      </label>
    </div>
  );
}
```

---

## 🧪 Testing Plan

### Test Cases:

**Union Tests**:
```typescript
test('union of cube and sphere', () => {
  const cube = createCube();
  const sphere = createSphere();
  const result = performUnion(cube, sphere);

  expect(result.geometry.attributes.position.count).toBeGreaterThan(0);
  expect(hasValidGeometry(result.geometry)).toBe(true);
});

test('union of non-overlapping meshes', () => {
  const cube1 = createCube([0, 0, 0]);
  const cube2 = createCube([5, 0, 0]);
  const result = performUnion(cube1, cube2);

  expect(result).toBeDefined();
});
```

**Subtract Tests**:
```typescript
test('subtract sphere from cube', () => {
  const cube = createCube();
  const sphere = createSphere();
  const result = performSubtract(cube, sphere);

  expect(result.geometry.attributes.position.count).toBeGreaterThan(0);
});

test('subtract larger mesh from smaller mesh', () => {
  const small = createCube(0.5);
  const large = createCube(2.0);
  const result = performSubtract(small, large);

  // Should result in empty or very small mesh
  expect(result).toBeDefined();
});
```

**Intersect Tests**:
```typescript
test('intersect overlapping cubes', () => {
  const cube1 = createCube([0, 0, 0]);
  const cube2 = createCube([0.5, 0, 0]);
  const result = performIntersect(cube1, cube2);

  expect(result.geometry.attributes.position.count).toBeGreaterThan(0);
});

test('intersect non-overlapping meshes', () => {
  const cube1 = createCube([0, 0, 0]);
  const cube2 = createCube([10, 0, 0]);
  const result = performIntersect(cube1, cube2);

  // Should result in empty mesh or null
  expect(result.geometry.attributes.position.count).toBe(0);
});
```

---

## 📚 Dependencies

### NPM Packages:
```bash
npm install three-csg-mesh
```

### Bundle Impact:
- three-csg-mesh: ~20-30KB
- **Total**: ~20-30KB (very lightweight!)

### Lazy Loading (Optional):
```typescript
// Only load when boolean panel is opened
const { CSG } = await import('three-csg-mesh');
```

---

## 🎯 Implementation Priority

### Phase 1: Core Operations (Day 1)
**Focus**: Get Union working end-to-end
- Install library
- Create BooleanOperations.ts
- Implement Union
- Create Boolean panel UI
- Basic tests

### Phase 2: Complete Operations (Day 2)
**Focus**: Add Subtract, Intersect, Split
- Implement remaining operations
- Add preview system
- Create modal UI
- Undo/redo commands
- Comprehensive tests

### Fallback Plan:
- **Ship with Union + Subtract only** (most useful)
- Defer Intersect/Split to future sprint
- Core value achieved with just 2 operations

---

## 🚀 Sprint 8 Extended Timeline

### Original Plan (10 days):
- Day 1-7: SVG Import & 2D-to-3D operations ✅
- Day 8-9: Mesh optimization
- Day 10: Documentation

### Extended Plan (12 days):
- Day 1-7: SVG Import & 2D-to-3D operations ✅ (DONE IN 1 DAY!)
- **Day 8-9: Boolean Operations** 🆕
- Day 10: Mesh optimization
- Day 11: Advanced options (taper, twist for extrude)
- Day 12: Documentation & examples

**New End Date**: Oct 19, 2024
**Sprint 9 Starts**: Oct 20, 2024
**OSS Launch**: Oct 27, 2024

---

## 💡 Use Cases

### Union (Addition):
- Combine multiple primitives into one mesh
- Merge overlapping shapes
- Create complex forms from simple parts

### Subtract:
- Cut holes in meshes
- Create doorways, windows
- Hollow out objects
- Create threads, grooves

### Intersect:
- Find overlapping volume
- Create complex intersections
- Trim meshes to boundaries

### Split:
- Separate disconnected parts
- Extract islands
- Prepare for individual manipulation

---

## 🎉 Value Proposition

**With Boolean Operations, QUAR Editor becomes:**
- ✅ **Professional CAD-like tool** (like Blender's boolean modifier)
- ✅ **No other browser tool has this** (huge differentiator)
- ✅ **Powerful workflow**: SVG → Extrude → Boolean → Complex model
- ✅ **Industrial design capable** (mechanical parts, products)

**Marketing angle**:
> "The only browser-based 3D editor with SVG import, parametric modeling, AND boolean operations"

---

## 🔍 Risk Assessment

### Overall Risk: MEDIUM

**Risks**:
1. CSG library may have bugs (30% - Mitigation: Test extensively)
2. Performance issues with complex meshes (40% - Mitigation: Loading indicators)
3. Invalid geometry output (20% - Mitigation: Validation + repair)
4. Timeline extension needed (10% - Mitigation: We're ahead of schedule!)

**Success Probability**: 85%

---

## 📝 Documentation Needed

1. **User guide**: Boolean operations explained
2. **Best practices**: Mesh preparation for booleans
3. **Troubleshooting**: Common issues and fixes
4. **Examples**: 5+ example workflows
5. **Performance tips**: When to use booleans vs other methods

---

## ✅ Approval Checklist

Before starting:
- [ ] Confirm +2 days to Sprint 8 is acceptable
- [ ] Confirm bundle size increase (~100KB) is acceptable
- [ ] Confirm boolean operations are high priority
- [ ] Confirm three-bvh-csg library is approved

**Ready to proceed?** This will make QUAR Editor incredibly powerful! 🚀

---

## 📦 Installation & Setup

Using **csg.js** via the **three-csg-mesh** wrapper:

```bash
npm install three-csg-mesh
```

**Why three-csg-mesh:**
- Clean Three.js integration
- Based on proven csg.js library
- Lightweight (~20KB)
- Simple API
- No geometry conversion needed
- Good TypeScript support

**Basic Usage:**
```typescript
import { CSG } from 'three-csg-mesh';

// Union
const result = CSG.union(meshA, meshB);

// Subtract
const result = CSG.subtract(meshA, meshB);

// Intersect
const result = CSG.intersect(meshA, meshB);
```

**Start implementation?** 🚀
