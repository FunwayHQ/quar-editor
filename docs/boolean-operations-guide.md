# Boolean Operations Guide

**QUAR Editor** - Constructive Solid Geometry (CSG)

---

## Overview

Boolean operations allow you to **combine or modify meshes** using set theory operations:

1. **Union (A + B)** - Combine meshes into one
2. **Subtract (A - B)** - Remove one mesh from another
3. **Intersect (A ∩ B)** - Keep only overlapping volume

---

## How to Use

### Step 1: Select 2 Objects
- Click first object
- **Shift+Click** second object
- Right sidebar **auto-switches to "Boolean" tab**

### Step 2: Choose Operation
- **Green + (Union)** - Combine
- **Red - (Subtract)** - Cut/remove
- **Blue ∩ (Intersect)** - Keep overlap

### Step 3: Configure Options
- ☐ **Keep Original Meshes** - Keeps all 3 objects
- ☑ **Delete Originals** (default) - Replaces with result

### Step 4: Apply
- Operation executes (may take 1-5 seconds)
- New mesh created
- Undo/redo supported ✅

---

## Operation Details

### Union (A + B)

**Purpose**: Combine multiple meshes into a single solid

**Use Cases:**
- Merge overlapping parts
- Create complex shapes from simple primitives
- Combine multiple elements
- Build composite objects

**Example:**
```
Cube + Sphere (overlapping) → Combined rounded cube
```

**Tips:**
- Works with **any overlap** (even slight touching)
- Non-overlapping meshes are still combined
- Final mesh has single continuous surface

---

### Subtract (A - B)

**Purpose**: Remove volume of B from A (cutting, carving)

**Use Cases:**
- Cut holes, windows, doors
- Create grooves, channels
- Hollow out objects
- Make negative spaces

**Example:**
```
Cube - Sphere (centered) → Cube with spherical cavity
```

**Order Matters:**
- **Base (A)**: First selected object (what to cut from)
- **Tool (B)**: Second selected object (what to remove)
- A - B ≠ B - A

**Tips:**
- Select base object **first**, tool second
- Tool can be larger than base
- No overlap = base unchanged

---

### Intersect (A ∩ B)

**Purpose**: Keep only the overlapping volume

**Use Cases:**
- Find common volume
- Create exact intersections
- Trim meshes to boundaries
- Complex boolean combinations

**Example:**
```
Cube ∩ Sphere (overlapping) → Rounded cube section
```

**Error Handling:**
- ⚠️ **No overlap** → Error: "No intersection found"
- Ensure meshes actually intersect
- Check object positions

**Tips:**
- Both objects must overlap
- Result size depends on overlap amount
- Can produce very small meshes

---

## Advanced Techniques

### Sequential Operations:

**Drill Multiple Holes:**
```
1. Cube (start)
2. Cube - Cylinder 1 (first hole)
3. Result - Cylinder 2 (second hole)
4. Result - Cylinder 3 (third hole)
```

**Complex Shapes:**
```
1. Union base parts (Cube + Cube + Cylinder)
2. Subtract cavities (Result - Sphere)
3. Intersect with bounding volume
```

### Combined with Curve Ops:

**Product Design:**
```
1. Import logo SVG → Extrude
2. Create cylinder (primitive)
3. Union logo + cylinder → Embossed product
```

**Mechanical Part:**
```
1. Import profile SVG → Revolve → Body
2. Create cylinder → Threaded hole
3. Subtract cylinder from body → Hollow part
```

---

## Performance Tips

### For Fast Operations:
- ✅ Use simple meshes (< 1k vertices)
- ✅ Reduce primitive segments before boolean
- ✅ Operations take 0.5-2 seconds

### For Complex Meshes:
- ⚠️ 10k+ vertices = may take 5-15 seconds
- ⚠️ Very high poly = may fail
- ⚠️ Decimation recommended first

### Optimization:
1. Perform booleans on low-poly versions first
2. Once happy with shape, increase detail
3. Use mesh optimizer after boolean ops
4. Check geometry validity

---

## Common Issues

### "Operation takes forever"
**Solution**: Meshes too complex
- Reduce primitive segments (cube: 1x1x1, not 10x10x10)
- Simplify SVG curves before operations
- Try with simpler meshes first

### "Result has artifacts/holes"
**Solution**: Invalid geometry
- Boolean ops can produce bad topology
- Try different mesh positions
- Use mesh validation
- May need manual cleanup

### "Intersect says 'no intersection found'"
**Solution**: Meshes don't overlap
- Check object positions in viewport
- Ensure meshes actually touch/overlap
- Move meshes closer together

### "Materials look wrong on result"
**Solution**: Material from first mesh is used
- Apply new material after boolean
- Materials don't merge automatically
- UVs may be incorrect (re-unwrap needed)

---

## Best Practices

### Before Boolean Operations:
1. ✅ Position meshes carefully (use transform gizmo)
2. ✅ Ensure proper overlap for Intersect
3. ✅ Consider mesh complexity (lower is faster)
4. ✅ Save project first (just in case!)

### After Boolean Operations:
1. ✅ Check result geometry (no holes, artifacts)
2. ✅ Apply materials as needed
3. ✅ Consider mesh optimization
4. ✅ Test undo/redo works

### Workflow Optimization:
1. **Keep Originals ON** while testing
2. Once happy, **Delete Originals** to clean up
3. Use undo/redo extensively
4. Work iteratively (small changes)

---

## Limitations

### Current Limitations:
- ⏭️ No preview before applying (instant execution)
- ⏭️ No progress indicator for slow operations
- ⏭️ No multi-material support (single material only)
- ⏭️ No automatic mesh repair

### Planned Improvements (Sprint 9):
- Preview before applying
- Progress bar for >1 second operations
- Better error messages
- Mesh validation and auto-repair

---

## Examples

### Example 1: Logo Embossing
```
1. Import logo SVG → Extrude (depth: 0.3)
2. Create cube (background plate)
3. Union logo + cube → Embossed logo plate
```

### Example 2: Pipe with Flange
```
1. Circle SVG → Sweep along path → Pipe
2. Larger circle → Extrude (depth: 0.2) → Flange
3. Union pipe + flange → Complete assembly
```

### Example 3: Complex Cutout
```
1. Create cylinder (base)
2. Create smaller cylinder (hole)
3. Subtract hole from base → Hollow cylinder
4. Create cube → Intersect with result → Segmented piece
```

---

## Keyboard Shortcuts (Planned)

- `Shift + U` = Union
- `Shift + S` = Subtract
- `Shift + I` = Intersect

---

**Previous**: [Curve Modeling Guide](./curve-modeling-guide.md)
