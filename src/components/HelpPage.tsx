/**
 * Help Page Component
 *
 * Comprehensive guide for QUAR Editor with screenshots and keyboard shortcuts.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Keyboard, Layout, Box, Paintbrush, Sun, Film, Scissors, FileOutput, HelpCircle } from 'lucide-react';

const sections = [
  { id: 'getting-started', label: 'Getting Started', icon: HelpCircle },
  { id: 'interface', label: 'Interface Overview', icon: Layout },
  { id: 'objects', label: 'Creating Objects', icon: Box },
  { id: 'materials', label: 'Materials', icon: Paintbrush },
  { id: 'lighting', label: 'Lighting & Environment', icon: Sun },
  { id: 'animation', label: 'Animation', icon: Film },
  { id: 'edit-mode', label: 'Edit Mode', icon: Scissors },
  { id: 'export', label: 'Export', icon: FileOutput },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
] as const;

function ShortcutRow({ keys, description }: { keys: string; description: string }) {
  return (
    <tr className="border-b border-border/30 last:border-b-0">
      <td className="py-2 pr-4">
        <div className="flex gap-1 flex-wrap">
          {keys.split('+').map((k, i) => (
            <span key={i}>
              {i > 0 && <span className="text-text-tertiary mx-0.5">+</span>}
              <kbd className="inline-block px-2 py-0.5 text-xs font-mono bg-surface-2 border border-border rounded">{k.trim()}</kbd>
            </span>
          ))}
        </div>
      </td>
      <td className="py-2 text-text-secondary text-sm">{description}</td>
    </tr>
  );
}

function Screenshot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="my-4 rounded-lg overflow-hidden border border-border/50 shadow-lg">
      <img src={src} alt={alt} className="w-full h-auto" loading="lazy" />
    </div>
  );
}

export function HelpPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>(sections[0].id);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const sectionEls = container.querySelectorAll<HTMLElement>('[data-section]');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.section;
            if (id) setActiveSection(id);
          }
        }
      },
      { root: container, rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    sectionEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function scrollToSection(id: string) {
    setActiveSection(id);
    const el = contentRef.current?.querySelector(`[data-section="${id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.08) 0%, transparent 60%)',
        }}
      />

      {/* Header */}
      <header className="border-b border-border p-4 relative z-10 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back to Projects</span>
          </button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-3">
            <img src="/logo-dark.svg" alt="QUAR Editor" className="h-8" />
            <h1 className="text-lg font-heading font-semibold">Help & Guide</h1>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Sidebar Navigation */}
        <nav className="w-56 flex-shrink-0 border-r border-border p-4 overflow-y-auto hidden md:block">
          <ul className="space-y-1">
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = activeSection === s.id;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => scrollToSection(s.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-accent/15 text-accent font-medium'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{s.label}</span>
                    {isActive && <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-3xl mx-auto space-y-16">

            {/* Getting Started */}
            <section data-section="getting-started">
              <h2 className="text-2xl font-heading font-bold mb-4">Getting Started</h2>
              <p className="text-text-secondary mb-4 leading-relaxed">
                Welcome to QUAR Editor — a free, open-source 3D design tool that runs entirely in your browser. No downloads, no accounts, no cloud — everything stays on your device.
              </p>
              <p className="text-text-secondary mb-4 leading-relaxed">
                Start by creating a new project from the welcome screen or opening an existing <code className="text-xs bg-surface-2 px-1.5 py-0.5 rounded">.quar</code> file.
              </p>
              <Screenshot src="/help-screenshots/01-welcome-screen.png" alt="Welcome screen with project list" />
              <p className="text-text-secondary leading-relaxed">
                Your projects are saved automatically to your browser's local storage. You can also export them as <code className="text-xs bg-surface-2 px-1.5 py-0.5 rounded">.quar</code> files for backup or sharing.
              </p>
            </section>

            {/* Interface Overview */}
            <section data-section="interface">
              <h2 className="text-2xl font-heading font-bold mb-4">Interface Overview</h2>
              <p className="text-text-secondary mb-4 leading-relaxed">
                The editor is divided into several panels around a central 3D viewport:
              </p>
              <Screenshot src="/help-screenshots/02-editor-empty.png" alt="Empty editor layout" />
              <ul className="list-none space-y-3 text-text-secondary mb-4">
                <li className="flex gap-2">
                  <span className="text-accent font-bold">Left Panel</span> — Scene hierarchy showing all objects in your scene. Drag to reorder, right-click for context menu.
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-bold">Center</span> — 3D viewport where you interact with your scene. Orbit with middle mouse, zoom with scroll wheel, pan with Shift+middle mouse.
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-bold">Right Panel</span> — Properties and materials for the selected object.
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-bold">Bottom Panel</span> — Animation timeline with keyframes and playback controls.
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-bold">Top Toolbar</span> — Transform tools (move, rotate, scale), add objects, and viewport options.
                </li>
              </ul>
              <Screenshot src="/help-screenshots/03-editor-with-cube.png" alt="Editor with cube and properties panel" />
              <Screenshot src="/help-screenshots/11-hierarchy-panel.png" alt="Scene hierarchy panel" />
            </section>

            {/* Creating Objects */}
            <section data-section="objects">
              <h2 className="text-2xl font-heading font-bold mb-4">Creating Objects</h2>
              <p className="text-text-secondary mb-4 leading-relaxed">
                Use <kbd className="px-1.5 py-0.5 text-xs font-mono bg-surface-2 border border-border rounded">Shift+A</kbd> or the toolbar to add objects to your scene. Available primitives include:
              </p>
              <ul className="list-disc list-inside text-text-secondary space-y-1 mb-4">
                <li>Cube, Sphere, Cylinder, Cone, Torus, Plane</li>
                <li>Point Light, Spot Light, Directional Light, Ambient Light</li>
                <li>Empty Group (for organizing objects)</li>
              </ul>
              <Screenshot src="/help-screenshots/10-add-objects-toolbar.png" alt="Object creation toolbar" />
              <p className="text-text-secondary leading-relaxed">
                Once created, select an object by clicking on it in the viewport or hierarchy. Use <kbd className="px-1.5 py-0.5 text-xs font-mono bg-surface-2 border border-border rounded">W</kbd> / <kbd className="px-1.5 py-0.5 text-xs font-mono bg-surface-2 border border-border rounded">E</kbd> / <kbd className="px-1.5 py-0.5 text-xs font-mono bg-surface-2 border border-border rounded">R</kbd> to switch between Move, Rotate, and Scale modes.
                Group objects with <kbd className="px-1.5 py-0.5 text-xs font-mono bg-surface-2 border border-border rounded">Cmd+G</kbd> and ungroup with <kbd className="px-1.5 py-0.5 text-xs font-mono bg-surface-2 border border-border rounded">Cmd+Shift+G</kbd>.
              </p>
            </section>

            {/* Materials */}
            <section data-section="materials">
              <h2 className="text-2xl font-heading font-bold mb-4">Materials</h2>
              <p className="text-text-secondary mb-4 leading-relaxed">
                QUAR Editor supports physically-based rendering (PBR) materials. Select an object and open the Material tab in the right panel to edit its appearance.
              </p>
              <Screenshot src="/help-screenshots/04-material-library.png" alt="Material presets library" />
              <p className="text-text-secondary mb-4 leading-relaxed">
                Choose from built-in presets (Metal, Plastic, Glass, Emissive) or create custom materials. The PBR editor gives you full control over:
              </p>
              <ul className="list-disc list-inside text-text-secondary space-y-1 mb-4">
                <li>Base Color (albedo) and opacity</li>
                <li>Metallic and Roughness values</li>
                <li>Emission color and intensity</li>
                <li>Normal, roughness, metallic, and emission texture maps</li>
              </ul>
              <Screenshot src="/help-screenshots/05-material-editor.png" alt="PBR material editor" />
            </section>

            {/* Lighting & Environment */}
            <section data-section="lighting">
              <h2 className="text-2xl font-heading font-bold mb-4">Lighting & Environment</h2>
              <p className="text-text-secondary mb-4 leading-relaxed">
                Control scene lighting through the Environment panel. QUAR Editor supports 4 light types, HDRI-based image-based lighting, fog, and ground plane settings.
              </p>
              <Screenshot src="/help-screenshots/06-environment-panel.png" alt="Environment and lighting panel" />
              <ul className="list-disc list-inside text-text-secondary space-y-1 mb-4">
                <li><strong>Point Light</strong> — Emits in all directions from a point</li>
                <li><strong>Spot Light</strong> — Cone-shaped light with angle and penumbra</li>
                <li><strong>Directional Light</strong> — Parallel rays (like sunlight)</li>
                <li><strong>Ambient Light</strong> — Uniform fill light</li>
              </ul>
              <p className="text-text-secondary leading-relaxed">
                Choose from 10 built-in HDRI presets (sunset, warehouse, studio, etc.) or upload your own <code className="text-xs bg-surface-2 px-1.5 py-0.5 rounded">.hdr</code> / <code className="text-xs bg-surface-2 px-1.5 py-0.5 rounded">.exr</code> files for realistic reflections and ambient lighting.
              </p>
            </section>

            {/* Animation */}
            <section data-section="animation">
              <h2 className="text-2xl font-heading font-bold mb-4">Animation</h2>
              <p className="text-text-secondary mb-4 leading-relaxed">
                Animate any object's position, rotation, scale, or material properties using the timeline at the bottom of the editor.
              </p>
              <Screenshot src="/help-screenshots/09-animation-timeline.png" alt="Animation timeline" />
              <h3 className="text-lg font-heading font-semibold mt-6 mb-3">Workflow</h3>
              <ol className="list-decimal list-inside text-text-secondary space-y-2 mb-4">
                <li>Select an object and enable <strong>Auto-Keyframe</strong> (REC button) or manually insert keyframes</li>
                <li>Move the playhead to the desired frame</li>
                <li>Change the object's transform — a keyframe is created automatically</li>
                <li>Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-surface-2 border border-border rounded">Space</kbd> to play/pause</li>
              </ol>
              <h3 className="text-lg font-heading font-semibold mt-6 mb-3">Interpolation Modes</h3>
              <ul className="list-disc list-inside text-text-secondary space-y-1">
                <li><strong>Linear</strong> — Constant speed between keyframes</li>
                <li><strong>Bezier</strong> — Smooth acceleration/deceleration (with editable curves)</li>
                <li><strong>Step</strong> — Instant value change</li>
              </ul>
            </section>

            {/* Edit Mode */}
            <section data-section="edit-mode">
              <h2 className="text-2xl font-heading font-bold mb-4">Edit Mode (Polygon Editing)</h2>
              <p className="text-text-secondary mb-4 leading-relaxed">
                Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-surface-2 border border-border rounded">Tab</kbd> with an object selected to enter Edit Mode. This lets you modify the mesh at the vertex, edge, or face level.
              </p>
              <Screenshot src="/help-screenshots/08-edit-mode.png" alt="Polygon edit mode" />
              <h3 className="text-lg font-heading font-semibold mt-6 mb-3">Selection Modes</h3>
              <ul className="list-disc list-inside text-text-secondary space-y-1 mb-4">
                <li><kbd className="px-1.5 py-0.5 text-xs font-mono bg-surface-2 border border-border rounded">1</kbd> — Vertex mode</li>
                <li><kbd className="px-1.5 py-0.5 text-xs font-mono bg-surface-2 border border-border rounded">2</kbd> — Edge mode</li>
                <li><kbd className="px-1.5 py-0.5 text-xs font-mono bg-surface-2 border border-border rounded">3</kbd> — Face mode</li>
              </ul>
              <h3 className="text-lg font-heading font-semibold mt-6 mb-3">Edit Operations</h3>
              <ul className="list-disc list-inside text-text-secondary space-y-1">
                <li><strong>G / R / S</strong> — Grab (move), Rotate, Scale selected elements</li>
                <li><strong>E</strong> — Extrude selected faces</li>
                <li><strong>I</strong> — Inset selected faces</li>
                <li><strong>K</strong> — Knife tool for cutting faces</li>
                <li><strong>X / Delete</strong> — Delete selected elements</li>
                <li><strong>Shift+Click</strong> — Multi-select</li>
              </ul>
            </section>

            {/* Export */}
            <section data-section="export">
              <h2 className="text-2xl font-heading font-bold mb-4">Export</h2>
              <p className="text-text-secondary mb-4 leading-relaxed">
                Export your scene to industry-standard 3D formats for use in game engines, renderers, or other applications.
              </p>
              <Screenshot src="/help-screenshots/07-export-dialog.png" alt="Export dialog with formats" />
              <h3 className="text-lg font-heading font-semibold mt-6 mb-3">Supported Formats</h3>
              <ul className="list-disc list-inside text-text-secondary space-y-1 mb-4">
                <li><strong>GLB / GLTF</strong> — Best for web, Unity, Unreal. Includes materials and animations</li>
                <li><strong>FBX</strong> — Industry standard for game engines and DCC tools</li>
                <li><strong>OBJ</strong> — Simple mesh format, widely supported</li>
                <li><strong>USDZ</strong> — Apple AR Quick Look format</li>
              </ul>
              <p className="text-text-secondary leading-relaxed">
                You can also import GLB, GLTF, FBX, OBJ, and STL files into your scene, preserving hierarchy and materials where possible.
              </p>
            </section>

            {/* Keyboard Shortcuts */}
            <section data-section="shortcuts">
              <h2 className="text-2xl font-heading font-bold mb-4">Keyboard Shortcuts</h2>
              <p className="text-text-secondary mb-6 leading-relaxed">
                QUAR Editor uses Blender-inspired shortcuts for a familiar workflow.
              </p>

              <h3 className="text-lg font-heading font-semibold mb-3">General</h3>
              <div className="glass rounded-lg overflow-hidden mb-6">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-border/30">
                    <ShortcutRow keys="Ctrl + Z" description="Undo" />
                    <ShortcutRow keys="Ctrl + Shift + Z" description="Redo" />
                    <ShortcutRow keys="Ctrl + A" description="Select all objects" />
                    <ShortcutRow keys="Escape" description="Deselect all / Cancel operation" />
                    <ShortcutRow keys="Delete" description="Delete selected objects" />
                    <ShortcutRow keys="Ctrl + D" description="Duplicate selected objects" />
                    <ShortcutRow keys="Ctrl + G" description="Group selected objects" />
                    <ShortcutRow keys="Ctrl + Shift + G" description="Ungroup" />
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-heading font-semibold mb-3">Transform</h3>
              <div className="glass rounded-lg overflow-hidden mb-6">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-border/30">
                    <ShortcutRow keys="W" description="Move mode" />
                    <ShortcutRow keys="E" description="Rotate mode" />
                    <ShortcutRow keys="R" description="Scale mode" />
                    <ShortcutRow keys="G" description="Grab (free move)" />
                    <ShortcutRow keys="S" description="Scale" />
                    <ShortcutRow keys="G + X / Y / Z" description="Move constrained to axis" />
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-heading font-semibold mb-3">Viewport</h3>
              <div className="glass rounded-lg overflow-hidden mb-6">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-border/30">
                    <ShortcutRow keys="Numpad 1" description="Front view" />
                    <ShortcutRow keys="Numpad 3" description="Right view" />
                    <ShortcutRow keys="Numpad 7" description="Top view" />
                    <ShortcutRow keys="Numpad 5" description="Toggle perspective / orthographic" />
                    <ShortcutRow keys="F" description="Focus on selected object" />
                    <ShortcutRow keys="Shift + A" description="Add object menu" />
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-heading font-semibold mb-3">Edit Mode</h3>
              <div className="glass rounded-lg overflow-hidden mb-6">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-border/30">
                    <ShortcutRow keys="Tab" description="Toggle Edit Mode" />
                    <ShortcutRow keys="1" description="Vertex selection mode" />
                    <ShortcutRow keys="2" description="Edge selection mode" />
                    <ShortcutRow keys="3" description="Face selection mode" />
                    <ShortcutRow keys="E" description="Extrude" />
                    <ShortcutRow keys="I" description="Inset face" />
                    <ShortcutRow keys="K" description="Knife tool" />
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-heading font-semibold mb-3">Animation</h3>
              <div className="glass rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-border/30">
                    <ShortcutRow keys="Space" description="Play / Pause animation" />
                  </tbody>
                </table>
              </div>
            </section>

            {/* Bottom spacer */}
            <div className="h-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
