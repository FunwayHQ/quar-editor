# Object Hierarchy & Grouping Guide

**QUAR Editor - Sprint 9 Feature**

Learn how to organize your 3D scenes with parent-child relationships and groups.

---

## What is Object Hierarchy?

Object hierarchy allows you to create **parent-child relationships** between objects. When you move, rotate, or scale a parent, all children automatically follow!

### Real-World Examples:

**Character Rig:**
- Body (parent)
  - Head (child)
  - Left Arm (child)
    - Left Hand (grandchild)
  - Right Arm (child)

When you rotate the body, the whole character turns. When you rotate the left arm, only the arm and hand move.

**Vehicle:**
- Car Body (parent)
  - Wheel 1 (child)
  - Wheel 2 (child)
  - Wheel 3 (child)
  - Wheel 4 (child)

When you move the car body, all wheels follow!

---

## Creating Groups

### Method 1: Keyboard Shortcut (Fastest)
1. Select 2 or more objects (Shift+Click or Cmd+Click)
2. Press **Cmd+G** (Mac) or **Ctrl+G** (Windows/Linux)
3. A group is created at the center of the selected objects

### Method 2: Hierarchy Panel Button
1. Select 2 or more objects in the hierarchy panel (left sidebar)
2. Click the **Group** button (folder icon) in the panel header
3. Group is created

### What Happens When You Group:
- A new **Group** object is created at the center of the selected objects
- Selected objects become **children** of the group
- Children's positions are converted to **local space** (relative to group center)
- Objects **stay in the same world position** (no visual movement)
- The group appears in the hierarchy panel with children indented

---

## Ungrouping Objects

### Method 1: Keyboard Shortcut
1. Select a group object
2. Press **Cmd+Shift+G** (Mac) or **Ctrl+Shift+G** (Windows/Linux)
3. Children are released to the root level

### Method 2: Hierarchy Panel Button
1. Select a group object
2. Click the **Ungroup** button in the panel header

### What Happens When You Ungroup:
- Children are moved to the group's parent (or root if group had no parent)
- Children's positions are converted back to **world space**
- Objects **stay in the same visual position** (no movement)
- The group object is deleted

---

## Working with Hierarchies

### Selecting Objects

**Normal Mode:**
- Click on any object in a group → **The entire group is selected**
- This lets you move/rotate/scale the whole group as one unit

**Hierarchy Panel:**
- Click individual children in the panel to see their properties
- Expand/collapse groups with the arrow icon

### Transforming Objects

**Parent Transforms:**
- Select the parent/group
- Use W/E/R to move/rotate/scale
- All children follow automatically!

**Child Transforms:**
- Currently, you can't select individual children in the viewport
- Use the Properties Panel to adjust child transforms manually
- Or ungroup, transform, then regroup

### Transform Spaces Explained

**Local Space** (default):
- Child's position is **relative to parent**
- If parent is at (10, 0, 0) and child is at local (5, 0, 0)
- Child appears at world position (15, 0, 0)

**World Space**:
- Absolute position in the scene
- Not affected by parent transform
- (Advanced feature - coming in future update)

---

## Animations with Hierarchy

### How It Works

Animations on hierarchical objects work in **local space** by default:

**Example:**
1. Create parent box, child sphere (local position: 5, 0, 0)
2. Animate parent moving from x=0 to x=10
3. Animate child moving from x=5 to x=8 (local)
4. **Result**: Both animations combine!
   - At t=0: child world position = 0 + 5 = 5
   - At t=1: child world position = 10 + 8 = 18

### Creating Hierarchical Animations

**Step 1**: Set up your hierarchy (group objects or set parents)

**Step 2**: Create animation and add tracks

**Step 3**: Add keyframes - values are in **local space**
- Parent animation: Affects all children
- Child animation: Relative to parent

**Step 4**: Play and watch the magic! ✨

### Tips

- **Parent animations** are great for overall motion (character walking, vehicle driving)
- **Child animations** are great for details (arm waving, wheel spinning)
- **Combine both** for complex, realistic motion!

---

## Importing Models with Hierarchy

### GLB/GLTF Files

**Hierarchy is preserved automatically!**

When you import a GLB or GLTF file:
- Character rigs maintain their bone structure
- Complex models keep their assembly hierarchy
- Parent-child relationships are recreated exactly
- Local transforms are preserved

**Example:**
Import a character model:
```
Body
├─ Head
├─ LeftArm
│  └─ LeftHand
├─ RightArm
│  └─ RightHand
└─ Legs
```

This structure is fully preserved and immediately ready to animate!

### FBX Files

FBX files also preserve hierarchy (same as GLB/GLTF).

### OBJ Files

OBJ format **does not support hierarchy**. All objects are imported flat at the root level.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Cmd+G** (Mac) / **Ctrl+G** (Win) | Group selected objects |
| **Cmd+Shift+G** / **Ctrl+Shift+G** | Ungroup selected group |
| **W** | Move mode (affects whole group) |
| **E** | Rotate mode (affects whole group) |
| **R** | Scale mode (affects whole group) |
| **Cmd+Z** / **Ctrl+Z** | Undo (works with grouping!) |
| **Cmd+Shift+Z** / **Ctrl+Shift+Z** | Redo |

---

## Advanced Tips

### Creating Empty Groups

You can create empty groups to organize your scene:
1. Use the hierarchy panel
2. Create objects
3. Drag-and-drop them into the empty group (coming soon!)

### Deep Nesting

QUAR Editor supports **unlimited nesting depth**:
- Groups within groups
- Multi-level hierarchies (5, 10, 100+ levels!)
- Performance stays smooth

### Deleting Parents

**Important**: When you delete a parent object, **all children are also deleted**.

This is the industry-standard behavior (matches Blender, Unity, Maya).

**To prevent accidental deletion:**
- Use Undo (Cmd+Z)
- Ungroup first if you want to keep children

---

## Troubleshooting

### "My objects moved when I grouped them!"
This shouldn't happen! If it does:
1. Undo (Cmd+Z)
2. Report the bug - grouping should preserve world positions

### "I can't select individual children in the viewport"
This is intentional! When you click a child, the whole group is selected.

**To select children:**
- Use the Hierarchy Panel (left sidebar)
- Or ungroup, work on children, then regroup

### "Hierarchy not preserved on import"
Make sure you're using:
- **GLB** or **GLTF** format (hierarchy supported)
- **FBX** format (hierarchy supported)

**OBJ format does not support hierarchy** - all objects will be flat.

---

## Best Practices

### 1. Group Related Objects
Keep your scene organized:
- Furniture → "Office_Furniture" group
- Character parts → "Character" group
- Lights → "Lighting_Rig" group

### 2. Use Descriptive Names
Double-click objects in the hierarchy panel to rename:
- "Group001" → "CharacterRig"
- "Imported012" → "Body"

### 3. Animate the Right Level
- Large motions → Animate the parent
- Fine details → Animate the children

### 4. Test Before Animating
Group your objects, move the parent, verify children follow correctly BEFORE creating animations.

---

## What's Next?

**Current Features (Sprint 9):**
- ✅ Grouping/ungrouping with undo/redo
- ✅ Hierarchical transforms
- ✅ Animations in local space
- ✅ Import hierarchy preservation (GLB/GLTF/FBX)

**Future Features (Sprint 10+):**
- Drag-and-drop reparenting in hierarchy panel
- Select individual children in viewport (Ctrl+Click)
- World/local space toggle for advanced users
- Animation baking (local → world conversion)

---

## Support

Having issues? Found a bug?
- Check the **troubleshooting** section above
- Review your hierarchy in the left panel
- Try undo/redo if something unexpected happens

Enjoy building complex 3D scenes with QUAR Editor! 🚀
