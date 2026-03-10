# Undo/Redo Support Audit

**Date**: October 6, 2024
**Goal**: Ensure ALL operations support undo/redo before OSS launch

---

## ✅ Operations with Undo/Redo (Already Working)

### Object Operations:
- ✅ **Create Object** - CreateObjectCommand
- ✅ **Delete Object** - DeleteObjectsCommand
- ✅ **Duplicate Object** - DuplicateObjectsCommand
- ✅ **Transform Object** - TransformObjectCommand
- ✅ **Update Object** - UpdateObjectCommand
- ✅ **Rename Object** - RenameObjectCommand

### Material Operations:
- ✅ **Create Material** - CreateMaterialCommand
- ✅ **Update Material** - UpdateMaterialCommand
- ✅ **Assign Material** - AssignMaterialCommand

### Animation Operations:
- ✅ **Create Animation** - CreateAnimationCommand
- ✅ **Add Keyframe** - AddKeyframeCommand
- ✅ **Delete Keyframe** - DeleteKeyframeCommand
- ✅ **Update Keyframe** - UpdateKeyframeCommand

---

## ⚠️ Operations MISSING Undo/Redo

### Curve Operations:
- ❌ **Import SVG** - Creates curves but no command
- ❌ **Delete Curve** - Direct store mutation
- ❌ **Extrude Curve** - Uses CreateObjectCommand (partial support)
- ❌ **Revolve Curve** - Uses CreateObjectCommand (partial support)
- ❌ **Loft Curves** - Uses CreateObjectCommand (partial support)
- ❌ **Sweep Curves** - Uses CreateObjectCommand (partial support)

**Issue**: Curve operations create the result mesh (undo works), but don't track:
- Which curves were used
- Operation parameters
- Original curve state

**Impact**:
- Can undo mesh creation ✅
- Cannot undo back to "before operation" state ❌
- Curves remain after undo (might be desired)

### Boolean Operations:
- ⚠️ **Union** - Uses CreateObjectCommand + DeleteObjectsCommand (2 separate)
- ⚠️ **Subtract** - Uses CreateObjectCommand + DeleteObjectsCommand (2 separate)
- ⚠️ **Intersect** - Uses CreateObjectCommand + DeleteObjectsCommand (2 separate)

**Issue**: Two separate commands instead of one atomic command
- Undo only undoes last command (delete OR create, not both)
- Redo may fail if commands are separated

**Impact**:
- Partial undo (only undoes delete or create) ❌
- User must undo twice ❌

### Polygon Editing Operations:
- ❌ **Enter/Exit Edit Mode** - No command
- ❌ **Select Vertices/Edges/Faces** - No command (not needed - selection is transient)
- ❌ **Move Vertices** - No command (critical!)
- ❌ **Delete Vertices** - No command
- ❌ **Extrude Face** - No command
- ❌ **Knife Tool Cut** - No command (critical!)

**Issue**: All edit mode operations directly mutate geometry
- No way to undo vertex moves ❌
- No way to undo knife cuts ❌
- Very bad UX ❌

**Impact**:
- Cannot experiment safely ❌
- Mistakes are permanent ❌
- Professional users expect undo ❌

---

## 🎯 Implementation Plan

### Priority 1: Polygon Editing Undo/Redo (CRITICAL)

**Why Critical:**
- Professional feature requires undo
- Users expect to experiment safely
- Documented in Sprint 9 plan

**Files to Create:**
1. `src/lib/commands/EditModeCommands.ts`
   - MoveVerticesCommand
   - DeleteVerticesCommand
   - ExtrudeFaceCommand
   - KnifeCutCommand
   - (others as needed)

2. Tests: `src/lib/commands/__tests__/EditModeCommands.test.ts`

**Implementation Pattern:**
```typescript
class MoveVerticesCommand implements Command {
  private objectId: string;
  private vertexIndices: number[];
  private oldPositions: Float32Array;
  private newPositions: Float32Array;

  execute() {
    // Apply new positions
    const mesh = meshRegistry.getMesh(this.objectId);
    const positions = mesh.geometry.attributes.position.array;

    this.vertexIndices.forEach((idx, i) => {
      positions[idx * 3] = this.newPositions[i * 3];
      positions[idx * 3 + 1] = this.newPositions[i * 3 + 1];
      positions[idx * 3 + 2] = this.newPositions[i * 3 + 2];
    });

    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.computeBoundingBox();
    mesh.geometry.computeBoundingSphere();
    mesh.geometry.computeVertexNormals();
  }

  undo() {
    // Restore old positions
    const mesh = meshRegistry.getMesh(this.objectId);
    const positions = mesh.geometry.attributes.position.array;

    this.vertexIndices.forEach((idx, i) => {
      positions[idx * 3] = this.oldPositions[i * 3];
      positions[idx * 3 + 1] = this.oldPositions[i * 3 + 1];
      positions[idx * 3 + 2] = this.oldPositions[i * 3 + 2];
    });

    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.computeBoundingBox();
    mesh.geometry.computeBoundingSphere();
    mesh.geometry.computeVertexNormals();
  }
}
```

**Integration Points:**
- `EditModeHelpers.tsx` - When transform ends, create command
- `KnifeToolPanel.tsx` - When applying cut, create command
- `EditOperationsPanel.tsx` - All operations use commands

**Estimated Time**: 3-4 hours

---

### Priority 2: Boolean Operations Atomic Commands (HIGH)

**Why Important:**
- Two separate commands = broken undo/redo
- Should be one atomic operation

**Files to Create:**
1. `src/lib/commands/BooleanCommands.ts`
   - BooleanOperationCommand (union/subtract/intersect)

**Implementation:**
```typescript
class BooleanOperationCommand implements Command {
  private baseMeshId: string;
  private toolMeshId: string;
  private operation: BooleanOperation;
  private keepOriginals: boolean;
  private resultMeshId: string | null = null;

  // Stored data for undo
  private baseMeshData: any;
  private toolMeshData: any;

  execute() {
    // Perform boolean op
    // Create result mesh (store ID)
    // Optionally delete originals
  }

  undo() {
    // Delete result mesh
    // Restore originals (if deleted)
  }
}
```

**Integration Points:**
- `BooleanOperationsPanel.tsx` - Replace direct calls with command

**Estimated Time**: 1-2 hours

---

### Priority 3: Curve Commands (MEDIUM)

**Why Medium Priority:**
- Curve operations already create mesh objects (those are undoable)
- Curve creation/deletion is less critical than mesh operations
- But good to have for completeness

**Files to Create:**
1. `src/lib/commands/CurveCommands.ts`
   - CreateCurveCommand (for SVG import)
   - DeleteCurveCommand
   - CreateMeshFromCurveCommand (for extrude/revolve/loft/sweep)

**Implementation:**
```typescript
class CreateMeshFromCurveCommand implements Command {
  private curveId: string;
  private operation: 'extrude' | 'revolve' | 'loft' | 'sweep';
  private parameters: any;
  private resultMeshId: string | null = null;

  execute() {
    // Perform operation
    // Create mesh
    // Store mesh ID
  }

  undo() {
    // Delete created mesh
    // Curve remains (this is fine)
  }
}
```

**Integration Points:**
- All curve modals (ExtrudeModal, RevolveModal, etc.)

**Estimated Time**: 2-3 hours

---

## 📋 Implementation Checklist

### Polygon Editing (Priority 1):
- [ ] Create `EditModeCommands.ts`
- [ ] MoveVerticesCommand
- [ ] DeleteVerticesCommand
- [ ] ExtrudeFaceCommand
- [ ] KnifeCutCommand
- [ ] Integrate into EditModeHelpers
- [ ] Integrate into KnifeToolPanel
- [ ] Test all edit operations with undo/redo

### Boolean Operations (Priority 2):
- [ ] Create `BooleanCommands.ts`
- [ ] BooleanOperationCommand (atomic)
- [ ] Replace dual-command approach in BooleanOperationsPanel
- [ ] Test all 3 boolean ops with undo/redo
- [ ] Test with keep/delete originals

### Curve Commands (Priority 3):
- [ ] Create `CurveCommands.ts`
- [ ] CreateCurveCommand (for import)
- [ ] DeleteCurveCommand
- [ ] CreateMeshFromCurveCommand
- [ ] Integrate into curve modals
- [ ] Test curve undo/redo

---

## 🧪 Testing Strategy

### Undo/Redo Tests (Per Operation):
```typescript
test('operation can be undone', () => {
  // Perform operation
  // Record state
  // Undo
  // Verify state restored
});

test('operation can be redone', () => {
  // Perform operation
  // Undo
  // Redo
  // Verify operation re-applied
});

test('multiple undo/redo', () => {
  // Perform operation 3 times
  // Undo 3 times
  // Redo 3 times
  // Verify all states correct
});
```

### Integration Tests:
- Sequential operations + mixed undo/redo
- Undo after save/load
- Command history limit (100 commands)

---

## 📊 Current Undo/Redo Status

### ✅ Fully Supported:
- Object creation/deletion/transform
- Material operations
- Animation operations
- Light operations
- Environment settings

### ⚠️ Partially Supported:
- Curve operations (mesh creation undoable, but not linked to curves)
- Boolean operations (two separate commands)

### ❌ NOT Supported:
- Polygon editing (all operations)
- Curve import/deletion
- Knife tool cuts

**Coverage**: ~70% (needs to be 100%)

---

## 🎯 Success Criteria

**Before OSS Launch:**
- ✅ ALL operations have undo/redo
- ✅ Undo/redo works correctly in all scenarios
- ✅ Command history limit enforced (100 commands)
- ✅ No memory leaks from undo/redo
- ✅ 50+ undo/redo tests passing
- ✅ Documentation updated

**Test Scenarios:**
1. Edit vertices → Undo → Positions restored ✅
2. Knife cut → Undo → Geometry restored ✅
3. Boolean union → Undo → Originals restored ✅
4. Curve extrude → Undo → Mesh deleted ✅
5. Sequential operations → Multiple undo → All restored ✅

---

## ⏱️ Timeline Estimate

**Total Work**: 6-9 hours

**Breakdown:**
- Priority 1 (Polygon Editing): 3-4 hours
- Priority 2 (Boolean Atomic): 1-2 hours
- Priority 3 (Curve Commands): 2-3 hours
- Testing: 1-2 hours (included)

**When**:
- Start: Today (Oct 6) or Tomorrow (Oct 7)
- Complete by: Oct 8-9
- Still well ahead of Sprint 9 (Oct 18)

---

## 🚀 Recommendation

**Implement all 3 priorities NOW** before moving to Sprint 9:

**Why:**
1. Undo/redo is **table stakes** for professional tool
2. We're ahead of schedule (12 days buffer)
3. Better to fix now than discover at launch
4. Users will absolutely expect this

**Order:**
1. **Polygon Editing** (most critical, most complex)
2. **Boolean Operations** (high value, simple fix)
3. **Curve Commands** (nice to have, simple)

**Ready to start?** I'll begin with Priority 1 (Polygon Editing Commands).
