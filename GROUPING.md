# Grouping/Ungrouping Research & Analysis

**Date**: October 6, 2024
**Purpose**: Analyze impact of grouping functionality on animation and import systems
**Status**: Research & Planning

---

## 🎯 What is Grouping?

### Definition:
**Grouping** = Creating parent-child relationships between objects
- Parent moves → Children move with it
- Parent rotates → Children rotate around parent
- Parent scales → Children scale proportionally

**Ungrouping** = Breaking parent-child relationships
- Children become independent
- Maintain world position/rotation/scale
- No longer affected by parent transforms

---

## 🔍 Current System Analysis

### Existing Hierarchy Support:

**From `objectsStore.ts`:**
```typescript
interface SceneObject {
  id: string
  name: string
  parentId: string | null  // ✅ Already exists!
  children: string[]       // ✅ Already exists!
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  // ...
}

// Methods that exist:
- setParent(childId, parentId)  // ✅ Already implemented!
- getChildren(id)               // ✅ Already implemented!
```

**Current Status**:
- ✅ Data structure supports hierarchy
- ✅ Parent-child relationships tracked
- ⚠️ **BUT**: No UI for grouping/ungrouping
- ⚠️ **BUT**: Transforms may not respect hierarchy properly

---

## 📊 Impact Analysis

### 1. Impact on Animation System

#### Current Animation Behavior:
```typescript
// From animationStore.ts
interface Keyframe {
  time: number
  property: 'position.x' | 'position.y' | 'rotation.z' | ...
  value: number
  interpolation: 'linear' | 'bezier' | ...
}

interface Track {
  objectId: string  // Animates specific object
  property: string
  keyframes: Keyframe[]
}
```

**Current**: Animations are **per-object absolute values**
- Each object animated independently
- Position/rotation/scale are world-space values
- No parent-child awareness

#### With Grouping - Potential Issues:

**Issue 1: Local vs World Space**
```
Parent at (5, 0, 0)
Child at (2, 0, 0) local → (7, 0, 0) world

If we animate child.position.x to 3:
- Should it be local (3, 0, 0) → (8, 0, 0) world?
- Or world (3, 0, 0)?
```

**Issue 2: Parent Animation Affects Children**
```
Parent animated: position.x from 0 → 10
Children move with parent automatically
But children also have their own animations?
How do these combine?
```

**Issue 3: Inherited Transforms**
```
Parent rotates 90°
Child has rotation 45°
Combined rotation = 135° (but we store 45°)
Keyframes store local or world values?
```

#### Solutions for Animation:

**Option A: Local-Space Animations (Recommended)**
```typescript
// Store animations in local space (relative to parent)
// When parent moves, children move automatically
// Child animations are relative to parent

Pros:
- Natural behavior (children follow parent)
- Animation reusable (can change parent)
- Industry standard (Blender, Unity)

Cons:
- Need to convert world ↔ local space
- Slightly more complex implementation
```

**Option B: World-Space Animations (Current)**
```typescript
// Keep current system (world space)
// When grouping, convert positions to local
// Warning: animations don't follow parent

Pros:
- No changes to animation system
- Simple to implement

Cons:
- Animations break when grouping
- Not industry standard
- Confusing UX
```

**Recommendation**: **Option A - Local Space**
- Standard in all 3D tools
- Better UX
- ~2-3 days implementation

---

### 2. Impact on Import System

#### Current Import Behavior:
```typescript
// From FileImport.tsx
importGLTF(file) {
  gltf.scene.traverse(child => {
    if (child instanceof Mesh) {
      // Create SceneObject with:
      - position: child.position
      - rotation: child.rotation
      - scale: child.scale
      - parentId: null  // ⚠️ Always null!
    }
  })
}
```

**Current Issue**:
- ✅ Imports geometry correctly
- ❌ **Ignores hierarchy** in GLB/GLTF files!
- ❌ All objects become root-level
- ❌ Loses parent-child relationships

#### With Proper Hierarchy Import:

**What GLB/GLTF Files Contain:**
```
Scene
  ├─ Body (parent)
  │   ├─ Arm_Left (child)
  │   ├─ Arm_Right (child)
  │   └─ Head (child)
  └─ Ground (separate object)
```

**Expected Behavior:**
```typescript
importGLTF(file) {
  // Build parent-child map
  const parentMap = new Map()

  gltf.scene.traverse(child => {
    if (child.parent && child.parent !== gltf.scene) {
      parentMap.set(child, child.parent)
    }
  })

  // Create objects with hierarchy
  gltf.scene.traverse(child => {
    if (child instanceof Mesh) {
      const parent = parentMap.get(child)
      const parentId = parent ? getObjectId(parent) : null

      createObject({
        ...
        parentId: parentId,  // ✅ Preserve hierarchy!
        position: child.position.toArray(),  // Local position
        rotation: child.rotation.toArray(),  // Local rotation
        scale: child.scale.toArray()          // Local scale
      })
    }
  })
}
```

**Benefits:**
- ✅ Preserves model hierarchy
- ✅ Characters import correctly (body + limbs)
- ✅ Complex assemblies maintain structure
- ✅ Animations from GLB work correctly

**Implementation Effort**: ~1-2 days

---

## 🛠️ Implementation Plan

### Phase 1: Grouping UI (1 day)

**Files to Modify:**
1. `HierarchyPanel.tsx` - Add "Group" button
2. `objectsStore.ts` - Add grouping methods

**Features:**
- Select 2+ objects → Right-click → "Group"
- Creates empty parent object
- Selected objects become children
- Ungrouping restores independence

**UI Mockup:**
```
┌─ HIERARCHY ──────────────┐
│ ☑ Cube                   │
│ ☑ Sphere                 │
│ ☐ Cylinder               │
│                          │
│ [Group Selected (Ctrl+G)]│
└──────────────────────────┘

After grouping:
┌─ HIERARCHY ──────────────┐
│ ▼ Group_1                │
│   ├─ Cube                │
│   └─ Sphere              │
│ ☐ Cylinder               │
└──────────────────────────┘
```

---

### Phase 2: Transform Hierarchy (2 days)

**Files to Modify:**
1. `TransformGizmo.tsx` - Apply transforms in local space
2. `SceneObject.tsx` - Render with parent transforms
3. `objectsStore.ts` - Add transform utilities

**Features:**
- Parent transform affects children
- Local vs world space conversion
- Proper matrix multiplication

**Technical:**
```typescript
// Get world position of child
function getWorldPosition(object: SceneObject): Vector3 {
  let worldPos = new Vector3(...object.position)

  let current = object
  while (current.parentId) {
    const parent = getObject(current.parentId)
    if (!parent) break

    // Apply parent transform
    worldPos.applyQuaternion(parent.rotation)
    worldPos.multiplyScalar(parent.scale)
    worldPos.add(parent.position)

    current = parent
  }

  return worldPos
}

// Set world position (update local position based on parent)
function setWorldPosition(object: SceneObject, worldPos: Vector3) {
  if (!object.parentId) {
    object.position = worldPos.toArray()
    return
  }

  const parent = getObject(object.parentId)
  const parentWorldTransform = getWorldTransform(parent)

  // Convert world position to local
  const localPos = worldPos
    .clone()
    .sub(parentWorldTransform.position)
    .applyQuaternion(parentWorldTransform.rotation.invert())
    .divideScalar(parentWorldTransform.scale)

  object.position = localPos.toArray()
}
```

---

### Phase 3: Animation with Hierarchy (2-3 days)

**Files to Modify:**
1. `AnimationEngine.ts` - Apply animations in local space
2. `Timeline.tsx` - Visual parent/child tracks
3. `animationStore.ts` - Parent-aware playback

**Changes:**
```typescript
// Before (world space)
applyKeyframe(object, keyframe) {
  object.position.x = keyframe.value  // World space
}

// After (local space)
applyKeyframe(object, keyframe) {
  // If has parent, value is local to parent
  // If no parent, value is world space
  object.position.x = keyframe.value  // Local space

  // World position calculated during render
}
```

**Visual Changes:**
```
Timeline:
└─ Body (parent)
   ├─ position.x (affects all children)
   └─ rotation.y (rotates children around)
      ├─ Arm_Left (child)
      │  └─ rotation.z (relative to parent)
      └─ Arm_Right (child)
         └─ rotation.z (relative to parent)
```

---

### Phase 4: Import Hierarchy (1 day)

**Files to Modify:**
1. `FileImport.tsx` - Preserve GLB/GLTF hierarchy

**Implementation:**
```typescript
importGLTF(file) {
  const objectMap = new Map()  // THREE.Object3D → SceneObject ID

  // First pass: Create all objects
  gltf.scene.traverse(child => {
    if (child instanceof Mesh) {
      const sceneObject = createObject({...})
      objectMap.set(child, sceneObject.id)
    }
  })

  // Second pass: Set parent relationships
  gltf.scene.traverse(child => {
    if (child instanceof Mesh && child.parent) {
      const childId = objectMap.get(child)
      const parentId = objectMap.get(child.parent)

      if (childId && parentId) {
        setParent(childId, parentId)
      }
    }
  })
}
```

**Benefits:**
- ✅ Character rigs import correctly
- ✅ Complex assemblies maintain structure
- ✅ Animations from GLB work

---

## ⚠️ Challenges & Risks

### Challenge 1: Transform Math Complexity
**Problem**: Local ↔ World space conversions are error-prone

**Mitigation**:
- Use Three.js built-in methods (Object3D.getWorldPosition)
- Extensive testing with nested hierarchies
- Clear documentation

**Risk**: Medium

---

### Challenge 2: Animation System Refactor
**Problem**: Current animations are world-space only

**Mitigation**:
- Add "space" flag to keyframes (local vs world)
- Convert existing animations to local space on load
- Backward compatibility for old projects

**Risk**: Medium-High

---

### Challenge 3: Existing Projects Compatibility
**Problem**: Old projects with animations may break

**Mitigation**:
- Version flag in project data
- Auto-migration on load (world → local)
- Keep old animation engine as fallback

**Risk**: Medium

---

### Challenge 4: UI Complexity
**Problem**: Users need to understand local vs world space

**Mitigation**:
- Default to local space (industry standard)
- Add "World Space" toggle (advanced users)
- Clear documentation and tooltips

**Risk**: Low (users familiar with 3D tools will understand)

---

## 📋 Feature Comparison

### Without Grouping (Current):

**Pros:**
- ✅ Simple mental model
- ✅ All transforms independent
- ✅ Animations straightforward
- ✅ No bugs with hierarchy

**Cons:**
- ❌ Can't move related objects together
- ❌ Character rigs don't import correctly
- ❌ Complex assemblies are painful
- ❌ No "organize" capability

**Use Cases Blocked:**
- Character animation (body + limbs)
- Product assemblies (parts that move together)
- Architectural groups (furniture sets)
- Vehicle models (wheels + body)

---

### With Grouping:

**Pros:**
- ✅ Professional workflow (like Blender/Unity)
- ✅ Character rigs work
- ✅ Complex imports preserve structure
- ✅ Organize scene hierarchy
- ✅ Group transforms (move all at once)
- ✅ Animation inheritance

**Cons:**
- ⚠️ More complex implementation
- ⚠️ Local vs world space confusion (for beginners)
- ⚠️ Animation system refactor needed
- ⚠️ Import system changes
- ⚠️ Potential for bugs

**Use Cases Enabled:**
- Everything! This is a pro feature.

---

## 🎨 UX Design

### Grouping Workflow:

**Method 1: Select & Group**
```
1. Select multiple objects (Shift+Click)
2. Right-click → "Group" (or Ctrl+G)
3. Creates "Group_1" parent
4. Selected objects become children
5. Group appears in hierarchy as folder
```

**Method 2: Drag & Drop**
```
1. Drag object in hierarchy panel
2. Drop onto another object
3. Becomes child of that object
4. (Already partially implemented!)
```

**Method 3: Create Empty**
```
1. Create → Empty Group
2. Drag objects into it
3. Manual organization
```

### Ungrouping Workflow:

**Method 1: Ungroup Command**
```
1. Select group
2. Right-click → "Ungroup" (or Ctrl+Shift+G)
3. Children become root-level
4. Maintain world position
5. Group deleted (if empty)
```

**Method 2: Drag Out**
```
1. Drag child in hierarchy
2. Drop at root level
3. Becomes independent
4. (Already partially works!)
```

---

## 🔧 Technical Implementation

### 1. Transform Calculations

**World Position (Read):**
```typescript
function getWorldPosition(objectId: string): Vector3 {
  const object = getObject(objectId)
  let pos = new Vector3(...object.position)
  let rot = new Quaternion().setFromEuler(object.rotation)
  let scale = new Vector3(...object.scale)

  // Traverse up to root
  let currentId = object.parentId
  while (currentId) {
    const parent = getObject(currentId)

    // Apply parent transform
    pos.multiply(scale).applyQuaternion(rot)
    pos.add(new Vector3(...parent.position))

    // Accumulate transforms
    rot.premultiply(new Quaternion().setFromEuler(parent.rotation))
    scale.multiply(new Vector3(...parent.scale))

    currentId = parent.parentId
  }

  return pos
}
```

**Local Position (Write):**
```typescript
function setWorldPosition(objectId: string, worldPos: Vector3) {
  const object = getObject(objectId)

  if (!object.parentId) {
    // No parent, world = local
    object.position = worldPos.toArray()
    return
  }

  // Get parent world transform
  const parentWorldPos = getWorldPosition(object.parentId)
  const parentWorldRot = getWorldRotation(object.parentId)
  const parentWorldScale = getWorldScale(object.parentId)

  // Convert world to local
  const localPos = worldPos
    .clone()
    .sub(parentWorldPos)
    .applyQuaternion(parentWorldRot.invert())
    .divide(parentWorldScale)

  object.position = localPos.toArray()
}
```

---

### 2. Rendering with Hierarchy

**Current Three.js Scene Graph:**
```typescript
// In SceneObject.tsx - Currently flat
<mesh
  position={object.position}  // Absolute
  rotation={object.rotation}  // Absolute
  scale={object.scale}        // Absolute
/>
```

**With Hierarchy:**
```typescript
// Render as nested groups
function renderObjectWithChildren(object) {
  return (
    <group
      position={object.position}  // Local to parent
      rotation={object.rotation}  // Local to parent
      scale={object.scale}        // Local to parent
    >
      {/* Object mesh */}
      <mesh geometry={...} material={...} />

      {/* Children recursively */}
      {object.children.map(childId => {
        const child = getObject(childId)
        return renderObjectWithChildren(child)
      })}
    </group>
  )
}
```

**Changes Needed:**
- Refactor SceneObject to support recursive rendering
- Handle parent transforms automatically (Three.js does this)
- Update picking/raycasting (need to account for parent transforms)

---

### 3. Animation Engine Changes

**Current:**
```typescript
applyKeyframe(objectId, property, value) {
  const object = getObject(objectId)
  object[property] = value  // Direct assignment
}
```

**With Hierarchy:**
```typescript
applyKeyframe(objectId, property, value, space = 'local') {
  const object = getObject(objectId)

  if (space === 'local' || !object.parentId) {
    // Local space or no parent - direct assignment
    object[property] = value
  } else {
    // World space - convert to local
    const localValue = worldToLocal(objectId, property, value)
    object[property] = localValue
  }
}
```

**Additional Features:**
- Parent track → Child tracks indented (visual hierarchy)
- Animate parent → Children follow automatically
- Option: "Bake animation to world space" (flatten hierarchy)

---

### 4. Import Hierarchy Preservation

**Current (Flat Import):**
```
CharacterModel.glb:
  Body (parent) → position: (0, 0, 0) world
    Arm_L (child) → position: (1, 2, 0) local

Imports as:
  Body → position: (0, 0, 0)
  Arm_L → position: (1, 2, 0)  ✅ Looks correct
  But: No parent relationship! ❌
```

**With Hierarchy Import:**
```
CharacterModel.glb:
  Body (parent)
    Arm_L (child) → local (1, 2, 0)

Imports as:
  Body → position: (0, 0, 0), children: ['arm_l']
  Arm_L → position: (1, 2, 0), parentId: 'body'
```

**Result**: Move body → Arm follows! ✅

---

## ⏱️ Timeline Estimate

### Full Grouping Implementation:

| Phase | Task | Time |
|-------|------|------|
| 1 | Group/Ungroup UI | 1 day |
| 2 | Transform hierarchy (local/world) | 2 days |
| 3 | Animation system refactor | 2-3 days |
| 4 | Import hierarchy preservation | 1 day |
| 5 | Testing & bug fixes | 2 days |
| 6 | Documentation | 1 day |
| **Total** | **Full Implementation** | **9-10 days** |

### Minimal Grouping (No Animation Changes):

| Phase | Task | Time |
|-------|------|------|
| 1 | Group/Ungroup UI | 1 day |
| 2 | Transform hierarchy (visual only) | 1 day |
| 3 | Import hierarchy (basic) | 1 day |
| 4 | Testing | 1 day |
| **Total** | **Basic Implementation** | **4 days** |

**Note**: Minimal version = grouping works for transforms, but animations stay world-space

---

## 💡 Recommendations

### For OSS Launch (October 25):

**Recommendation**: **Skip grouping for OSS**

**Reasoning:**
1. ✅ **Not critical** for launch (nice-to-have)
2. ✅ **Complex** (9-10 days for full implementation)
3. ✅ **Risky** (could introduce bugs in animation system)
4. ✅ **Alternative exists** (manual positioning)

**Instead:**
- Launch without grouping
- Gather user feedback
- Implement based on demand
- Do it right (full hierarchy + animations)

---

### For Phase 2 (Cloud Version):

**Recommendation**: **Implement full grouping**

**Reasoning:**
1. ✅ More time available (post-launch)
2. ✅ Can refactor animation system properly
3. ✅ Professional feature for paid users
4. ✅ Collaborate on complex models (groups are organizational)

**Priority**: High for cloud version

---

### For Phase 1.5 (Post-OSS, Pre-Cloud):

**Recommendation**: **Implement basic grouping if heavily requested**

**Approach:**
- UI for grouping (1 day)
- Transform hierarchy (1 day)
- **Don't** change animation system
- Document limitation: "Animations are world-space"

**Trigger**: If 20+ users request it in first month

---

## 🎯 Minimum Viable Grouping (MVP)

If we must add it before OSS:

### Features:
- ✅ Group/Ungroup UI (Ctrl+G, Ctrl+Shift+G)
- ✅ Visual hierarchy in panel
- ✅ Parent transform affects children (translate only)
- ⏭️ Rotations/scale inheritance (complex)
- ⏭️ Animation system changes (defer)
- ⏭️ Import hierarchy (defer)

### Timeline: **2-3 days**

### Caveats:
- "Grouping is visual organization only"
- "Animations don't follow parent transforms"
- "Use for organizing, not rigging"

**Worth it?** Probably not - better to wait and do it right.

---

## 📊 Decision Matrix

| Factor | Skip | MVP (2-3 days) | Full (9-10 days) |
|--------|------|----------------|------------------|
| Launch Delay | 0 days | +2-3 days | +9-10 days |
| User Impact | Low | Medium | High |
| Complexity | None | Low-Med | High |
| Risk | None | Low | Medium |
| Quality | N/A | Basic | Professional |
| Animation Support | N/A | No | Yes |
| Import Support | N/A | No | Yes |
| **Recommendation** | ✅ | ⚠️ | 🔄 (Phase 2) |

---

## ✅ Final Recommendation

### For OSS Launch (Oct 25):
**SKIP GROUPING** ✅

**Why:**
1. Not critical for launch
2. Complex to do right
3. Could delay launch
4. Can add post-launch based on feedback

### For Post-Launch:
**IMPLEMENT FULL GROUPING** (Phase 2)

**Why:**
1. Proper time to refactor animation system
2. Can do it right (local space, full inheritance)
3. Professional feature for cloud version
4. Based on real user feedback

---

## 📚 Research Summary

### Current State:
- ✅ Data structure supports hierarchy
- ✅ Parent-child tracked in objects
- ⏭️ No UI for grouping
- ⏭️ Transforms ignore hierarchy
- ⏭️ Animations world-space only
- ⏭️ Imports flatten hierarchy

### To Add Full Grouping:
- UI for group/ungroup (1 day)
- Transform calculations (2 days)
- Animation refactor (2-3 days)
- Import preservation (1 day)
- Testing (2 days)
- **Total**: 9-10 days

### Impact:
- ✅ Professional workflow
- ✅ Character rigs work
- ✅ Complex models import correctly
- ⚠️ Significant refactor needed

### Recommendation:
- **OSS**: Skip (not critical, too complex)
- **Phase 2**: Implement full version (proper time)

---

**Status**: 📋 Research Complete

**Decision**: Defer grouping to Phase 2 (post-OSS launch)

**Rationale**: Not worth delaying launch for a feature we can add later based on user feedback.
