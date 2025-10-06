# Curve Modeling Guide

**QUAR Editor** - SVG Import & 2D-to-3D Operations

---

## Overview

QUAR Editor supports importing SVG files and converting 2D curves into 3D meshes using four powerful operations:

1. **Extrude** - Linear depth extrusion
2. **Revolve** - Rotation around an axis (lathe)
3. **Loft** - Interpolation between multiple curves
4. **Sweep** - Extrude profile along path

---

## Importing SVG Files

### Supported Formats:
- ✅ **Paths** (`<path>` elements)
- ✅ **Circles** (`<circle>`)
- ✅ **Rectangles** (`<rect>`)
- ✅ **Ellipses** (`<ellipse>`)
- ✅ **Polygons** (`<polygon>`)

### How to Import:
1. Click **Import** button in toolbar
2. Select `.svg` file
3. Curves appear as **yellow lines** on grid
4. Check **Curves tab** in left sidebar

### SVG Preparation Tips (Figma/Illustrator):

**Figma:**
- Select shapes → Right-click → "Copy as SVG"
- Or File → Export → SVG
- Flatten any groups/transforms
- Outline strokes to paths

**Illustrator:**
- Select shapes → Object → Path → Outline Stroke
- File → Export → Export As → SVG
- Options: Presentation Attributes (not Internal CSS)
- Decimal Places: 2-3 is sufficient

---

## Operation 1: Extrude

**Purpose**: Add depth to 2D shapes

### When to Use:
- Convert logos to 3D
- Create text/typography (from SVG)
- Build simple solid shapes
- Architectural elements (walls, columns)

### Parameters:

**Depth** (0.1 - 10):
- How far to extrude
- Example: 1.0 = moderate depth, 5.0 = very tall

**Steps** (1 - 10):
- Subdivisions along depth
- Higher = smoother curves
- 1 = straight extrusion

**Bevel**:
- ☑ Enable Bevel - Rounds the edges
- Size: How far bevel extends (0.01 - 1.0)
- Segments: Smoothness of bevel (1 - 8)

**Curve Segments** (3 - 50):
- Subdivisions around curve
- Higher = smoother circles/curves
- 12 = good default

### Example Workflows:

**Logo to 3D:**
1. Export logo as SVG from Figma
2. Import to QUAR
3. Extrude depth: 0.5, Enable bevel, Size: 0.1
4. Apply material
5. Export as GLB

**3D Text:**
1. Create text in Illustrator → Convert to Outlines
2. Export as SVG
3. Extrude depth: 1.0, Bevel: ON
4. Add metallic material
5. Render!

---

## Operation 2: Revolve

**Purpose**: Rotate curve around axis to create symmetrical objects

### When to Use:
- Vases, bottles, cups
- Columns, pillars
- Wheels, gears
- Any rotationally symmetric object

### Parameters:

**Axis** (X / Y / Z):
- Y: Vertical rotation (most common - vase)
- X: Horizontal rotation
- Z: Depth rotation

**Angle** (1° - 360°):
- 360° = Full revolution (closed surface)
- 180° = Half revolution (bowl)
- 90° = Quarter (wedge)

**Segments** (8 - 64):
- Smoothness around rotation
- 16 = angular, 32 = smooth, 64 = very smooth

**Offset** (0 - 5):
- Distance from rotation axis
- 0 = curve touches axis
- 1+ = creates hollow center

**Start Angle** (0° - 360°):
- Offset where revolution begins
- Creates rotated results

### Example Workflows:

**Vase:**
1. Draw half-profile of vase in Figma (side view)
2. Import SVG
3. Revolve: Y axis, 360°, Segments: 32
4. Done!

**Bowl:**
1. Draw bowl profile (half-circle)
2. Revolve: Y axis, 180°, Offset: 0
3. Creates hemisphere

**Gear:**
1. Draw gear tooth profile
2. Revolve: Y axis, 360°, Segments: 8 (for angular look)

---

## Operation 3: Loft

**Purpose**: Create smooth transition between multiple curves

### When to Use:
- Organic shapes (character bodies)
- Morphing shapes
- Aircraft fuselages
- Architectural forms
- Complex transitions

### Requirements:
- **Minimum 2 curves** required
- More curves = smoother transition

### Parameters:

**Axis** (X / Y / Z):
- Direction to distribute curves
- Y: Vertical stacking (most common)
- X: Horizontal left-right
- Z: Horizontal front-back

**Curve Order**:
- Use ↑↓ arrows to reorder
- First curve = start, Last curve = end
- Order affects shape dramatically!

**Segments** (5 - 50):
- Subdivisions between curves
- 20 = good default
- 50 = very smooth (but slower)

**Cap Ends** ☑:
- Closes top and bottom
- Only works for closed curves
- Currently disabled (bug - fix pending)

**Closed (Tube)** ☐:
- Wraps loft into tube
- Creates donut-like shapes

### Example Workflows:

**Character Body:**
1. Create 3-4 body cross-sections (shoulders, waist, hips)
2. Import all as one SVG
3. Shift+Click to select all curves
4. Loft: Y axis, reorder from top to bottom
5. Creates smooth body form

**Bottle:**
1. Create 3 circles (large, medium, small)
2. Loft along Y axis
3. Creates tapered bottle shape

**Airplane Fuselage:**
1. Create nose, cockpit, body, tail cross-sections
2. Loft in sequence
3. Smooth aircraft body

### Tips:
- ⚠️ **Orientation matters!** All curves should have same winding direction
- ⚠️ **Different point counts** are auto-resampled (may cause artifacts)
- 💡 **Use similar shapes** for best results
- 💡 **More curves** = smoother transitions

---

## Operation 4: Sweep

**Purpose**: Extrude a profile curve along a path curve

### When to Use:
- Pipes, tubes, cables
- Railings, handrails
- Roads, tracks
- Decorative trim
- Any extrusion following a path

### Requirements:
- **Exactly 2 curves** required
- One = Profile (cross-section)
- One = Path (trajectory)

### Parameters:

**Profile & Path Assignment**:
- Click **"↔ Swap Profile & Path"** to switch roles
- Profile = shape (e.g., rectangle)
- Path = where it goes (e.g., U-curve)

**Segments Along Path** (5 - 100):
- Subdivisions following path
- More = smoother curves
- 50 = good default

**Twist** (-720° to +720°):
- Rotation along path
- 0° = no twist
- 180° = half turn
- 360° = full spiral

**Scale at Start/End** (0.1 - 3.0):
- Creates taper effect
- Start: 1.0, End: 0.2 = cone/funnel
- Start: 0.5, End: 1.5 = expanding

**Auto-Close Profile** ☑:
- Automatically closes open profiles
- U-shape → closed U
- Creates solid tubes

**Cap Ends** ☑:
- Seals tube at start/end of path
- Prevents open ends

### Example Workflows:

**Pipe:**
1. Draw circle (profile)
2. Draw wavy line (path)
3. Sweep: Auto-close ON, Cap ends ON
4. Creates curved pipe

**Handrail:**
1. Draw handrail cross-section (rounded rectangle)
2. Draw staircase path
3. Sweep with twist if needed
4. Realistic handrail

**Road:**
1. Draw road cross-section (flat rectangle)
2. Draw road path (curved line)
3. Sweep along path
4. Textured road mesh

### Tips:
- 💡 **Swap button** is your friend - try both assignments!
- 💡 **Sharp turns** in path may cause twisting
- 💡 **Closed profiles** work best (rectangles, circles)
- 💡 **Auto-close** for U-shapes and C-shapes

---

## Common Issues & Solutions

### "No preview visible"
- Check curves are on grid (yellow lines visible)
- Check modal z-index (should be above timeline)
- Check console for errors

### "Mesh has holes"
- **Extrude**: Check if SVG path is closed
- **Sweep**: Enable "Auto-Close Profile" and "Cap Ends"
- **Loft**: Use closed curves or enable caps (when fixed)

### "Weird twisting in Sweep"
- Path has sharp curves (inflection points)
- Try reducing segments
- Try adding manual twist to counter it
- Or use Loft instead for more control

### "Loft produces unexpected shapes"
- Check curve order (reorder with ↑↓)
- Check orientation (curves may be reversed)
- Ensure similar shapes for smooth results

### "Operation is slow"
- Reduce segments
- Use simpler curves (fewer points)
- Complex curves = longer processing

---

## Best Practices

### SVG Preparation:
1. ✅ Simplify paths (reduce anchor points)
2. ✅ Outline all strokes
3. ✅ Flatten transforms
4. ✅ Close paths when possible
5. ✅ Use simple shapes (3-20 points ideal)

### Curve Selection:
1. ✅ Click curves in viewport or Curves panel
2. ✅ Shift+Click for multi-select
3. ✅ Check curve count (listed in panel)
4. ✅ Verify closed vs open status

### Operation Choice:
- **Simple depth?** → Extrude
- **Rotationally symmetric?** → Revolve
- **Multiple cross-sections?** → Loft
- **Follow a path?** → Sweep

### Performance:
- Start with low segment counts
- Increase once you're happy with shape
- Use preview to iterate quickly
- Optimize final mesh if needed

---

## Keyboard Shortcuts

**Curve Selection:**
- `Shift` + Click = Multi-select curves
- Click empty space = Deselect all
- Click selected curve = Deselect (if only one)

**Operations:**
- `Shift + E` = Extrude (planned)
- `Shift + R` = Revolve (planned)
- `Shift + L` = Loft (planned)

---

## Advanced Techniques

### Complex Organic Forms:
1. Create 5-10 cross-sections in Figma
2. Vary sizes and shapes gradually
3. Loft them all together
4. Creates smooth organic transitions

### Twisted Columns:
1. Create column profile
2. Create straight vertical path
3. Sweep with Twist: 360°
4. Spiral column!

### Tapered Pipes:
1. Create circle profile
2. Create curved path
3. Sweep with Scale Start: 1.0, End: 0.3
4. Funnel/cone effect

### Combining Operations:
1. Extrude base shape
2. Revolve detail elements
3. Use Boolean Union to combine
4. Professional results!

---

## Troubleshooting

**"Sweep doesn't close the tube"**
→ Enable "Auto-Close Profile" and "Cap Ends"

**"Loft twists unexpectedly"**
→ Curves have different orientations - check winding

**"Preview is empty"**
→ Curves may not overlap in 3D space - check positions

**"Mesh has black spots"**
→ Missing or incorrect normals - mesh optimizer can help

**"Textures don't work"**
→ No UVs generated - use mesh optimizer

---

**Next**: [Boolean Operations Guide](./boolean-operations-guide.md)
