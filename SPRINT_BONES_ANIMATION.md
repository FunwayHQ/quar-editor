# Sprint: Bones & Skeletal Animation System

**Goal**: Implement a fully GLB/GLTF compatible bones and skeletal animation system for the QUAD Editor.

**Status**: Planning Phase
**Target Completion**: [TBD]
**Priority**: High

---

## 🎯 Overview

Implement a complete skeletal animation system that allows:
- Loading GLB/GLTF files with rigged characters and animations
- Creating custom bone rigs (armatures) for meshes
- Animating bones with keyframes
- Weight painting for skinning
- Exporting with bones and animations preserved
- Full THREE.js compatibility (Bone, Skeleton, SkinnedMesh)

---

## 📋 Epic Breakdown

### Epic 1: Data Structures & Core Architecture
**Goal**: Establish bone/armature data model compatible with GLB/GLTF

#### User Stories
1. **As a developer**, I need bone data structures that map to THREE.js Bone/Skeleton
2. **As a developer**, I need armature objects in the scene hierarchy
3. **As a developer**, I need skinning data (vertex weights) storage
4. **As a user**, I want bones to appear in the scene hierarchy like other objects

#### Technical Tasks

**1.1 Extend SceneObject for Bones** (`src/stores/objectsStore.ts`)
```typescript
// Add to ObjectType
export type ObjectType =
  | 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane'
  | 'group' | 'camera' | 'imported'
  | 'pointLight' | 'spotLight' | 'directionalLight' | 'ambientLight'
  | 'bone' | 'armature';  // NEW

// Add to SceneObject interface
export interface SceneObject {
  // ... existing fields

  // Bone properties (for type: 'bone')
  boneProps?: {
    headPosition: [number, number, number];  // Bone head (start)
    tailPosition: [number, number, number];  // Bone tail (end)
    roll: number;                            // Bone roll angle (twist)
    length: number;                          // Computed length
    connected: boolean;                      // Connected to parent bone
  };

  // Armature properties (for type: 'armature')
  armatureProps?: {
    rootBoneId: string;                      // Root bone of this armature
    displayType: 'octahedral' | 'stick' | 'bbone' | 'envelope';
    inFront: boolean;                        // X-ray display
    axesDisplay: 'none' | 'wire' | 'solid';
  };

  // Skinning data (for meshes with bones)
  skinData?: {
    armatureId: string;                      // Which armature this is bound to
    weights: SkinWeights;                    // Vertex weights
    bindMatrix: number[];                    // Inverse bind matrix (16 floats)
    bindPose: Map<string, BonePose>;         // Rest pose for each bone
  };
}

// Skin weights: vertex index -> bone influences
export interface SkinWeights {
  [vertexIndex: number]: BoneInfluence[];
}

export interface BoneInfluence {
  boneId: string;
  weight: number;  // 0-1
}

export interface BonePose {
  position: [number, number, number];
  rotation: [number, number, number, number];  // Quaternion
  scale: [number, number, number];
}
```

**1.2 Create Bone Store** (`src/stores/boneStore.ts`)
```typescript
export interface BoneState {
  // Pose mode state
  isPoseMode: boolean;
  activeBoneId: string | null;
  selectedBoneIds: Set<string>;

  // Bone operations
  createBone: (parentId: string | null, position: [number, number, number]) => string;
  subdivideBone: (boneId: string, segments: number) => string[];
  deleteBone: (boneId: string, deleteChildren: boolean) => void;

  // Armature operations
  createArmature: (name: string, position: [number, number, number]) => string;
  deleteArmature: (armatureId: string) => void;

  // Pose operations
  enterPoseMode: (armatureId: string) => void;
  exitPoseMode: () => void;
  setPoseTransform: (boneId: string, transform: BonePose) => void;
  resetPose: (boneId?: string) => void;
  applyPoseAsRest: () => void;

  // Skinning operations
  bindMeshToArmature: (meshId: string, armatureId: string) => void;
  unbindMesh: (meshId: string) => void;
  setVertexWeights: (meshId: string, vertexIndex: number, influences: BoneInfluence[]) => void;
  autoWeight: (meshId: string, method: 'automatic' | 'envelope') => void;
  normalizeWeights: (meshId: string) => void;

  // IK/FK (Future)
  addIKConstraint?: (boneId: string, targetId: string, chainLength: number) => void;
}
```

**1.3 Extend Animation Store** (`src/stores/animationStore.ts`)
```typescript
// Add bone animation track type
export interface AnimationTrack {
  // ... existing fields

  // For bone animations
  boneId?: string;                           // Which bone is being animated
  transformType?: 'position' | 'rotation' | 'scale';  // What property
  space?: 'local' | 'pose';                  // Local = relative to parent, Pose = relative to rest
}

// Add pose library
export interface PoseLibrary {
  id: string;
  name: string;
  poses: Map<string, StoredPose>;
}

export interface StoredPose {
  id: string;
  name: string;
  bonePoses: Map<string, BonePose>;          // boneId -> pose
  thumbnail?: string;                         // Base64 image
}
```

#### Acceptance Criteria
- [x] Data structures defined
- [ ] Bone objects can be created and stored
- [ ] Armature objects can be created
- [ ] Skin data can be attached to meshes
- [ ] Bone hierarchy is maintained correctly
- [ ] Type-safe TypeScript interfaces

#### Estimated Effort
**8 story points** (2-3 days)

---

### Epic 2: GLB/GLTF Import with Bones
**Goal**: Load rigged characters from GLB files with full bone preservation

#### User Stories
1. **As a user**, I can import a rigged GLB file and see bones in the scene
2. **As a user**, I can see bone hierarchies in the outliner
3. **As a user**, I can see animations from the GLB file
4. **As a user**, I want skinned meshes to deform correctly

#### Technical Tasks

**2.1 Enhance GLB Loader** (`src/components/import/FileImport.tsx`)
```typescript
const importGLTF = async (file: File) => {
  // ... existing code

  loader.load(url, (gltf) => {
    // NEW: Extract skeletons
    const skeletons = new Map<THREE.Skeleton, string>();

    // NEW: Extract bones
    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Bone) {
        const boneObject = createBoneObject(child);
        executeCommand(new CreateObjectCommand(boneObject));
        threeToSceneId.set(child, boneObject.id);
      }

      if (child instanceof THREE.SkinnedMesh) {
        // Store skeleton reference
        skeletons.set(child.skeleton, generateId());

        // Create mesh object with skin data
        const meshObject = createSkinnedMeshObject(child);
        executeCommand(new CreateObjectCommand(meshObject));
      }
    });

    // NEW: Extract animations
    if (gltf.animations && gltf.animations.length > 0) {
      importAnimations(gltf.animations, threeToSceneId);
    }
  });
};

function importAnimations(
  threeAnimations: THREE.AnimationClip[],
  objectMap: Map<THREE.Object3D, string>
) {
  threeAnimations.forEach(clip => {
    const animation = convertThreeAnimationToStore(clip, objectMap);
    useAnimationStore.getState().createAnimation(animation.name, clip.duration);

    // Import all tracks
    clip.tracks.forEach(track => {
      const animTrack = convertThreeTrackToStore(track, objectMap);
      if (animTrack) {
        useAnimationStore.getState().addTrack(animation.id, animTrack);
      }
    });
  });
}
```

**2.2 Create Bone Converter** (`src/lib/bones/BoneConverter.ts`)
```typescript
export class BoneConverter {
  /**
   * Convert THREE.Bone to SceneObject
   */
  static fromThreeBone(bone: THREE.Bone): SceneObject {
    // Extract bone properties
    const headPos = bone.position.toArray() as [number, number, number];
    const tailPos = calculateTailPosition(bone);

    return {
      id: generateId(),
      name: bone.name || 'Bone',
      type: 'bone',
      visible: true,
      locked: false,
      position: headPos,
      rotation: [bone.rotation.x, bone.rotation.y, bone.rotation.z],
      scale: [bone.scale.x, bone.scale.y, bone.scale.z],
      parentId: null,
      children: [],
      boneProps: {
        headPosition: headPos,
        tailPosition: tailPos,
        roll: 0,
        length: calculateLength(headPos, tailPos),
        connected: false,
      },
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
  }

  /**
   * Convert THREE.SkinnedMesh to SceneObject with skin data
   */
  static fromSkinnedMesh(
    mesh: THREE.SkinnedMesh,
    boneMap: Map<THREE.Bone, string>
  ): SceneObject {
    // Extract skin weights
    const skinData = extractSkinData(mesh, boneMap);

    return {
      // ... standard mesh properties
      skinData,
    };
  }

  /**
   * Extract skin weights from THREE.SkinnedMesh
   */
  static extractSkinData(
    mesh: THREE.SkinnedMesh,
    boneMap: Map<THREE.Bone, string>
  ): SkinData {
    const geometry = mesh.geometry;
    const skinIndex = geometry.attributes.skinIndex;
    const skinWeight = geometry.attributes.skinWeight;

    const weights: SkinWeights = {};

    for (let i = 0; i < skinIndex.count; i++) {
      const influences: BoneInfluence[] = [];

      for (let j = 0; j < 4; j++) {  // Max 4 influences per vertex
        const boneIndex = skinIndex.getX(i + j);
        const weight = skinWeight.getX(i + j);

        if (weight > 0) {
          const bone = mesh.skeleton.bones[boneIndex];
          const boneId = boneMap.get(bone);

          if (boneId) {
            influences.push({ boneId, weight });
          }
        }
      }

      if (influences.length > 0) {
        weights[i] = influences;
      }
    }

    return {
      armatureId: '', // Will be set later
      weights,
      bindMatrix: Array.from(mesh.bindMatrix.elements),
      bindPose: extractBindPose(mesh.skeleton, boneMap),
    };
  }
}
```

**2.3 Animation Converter** (`src/lib/animation/AnimationConverter.ts`)
```typescript
export class AnimationConverter {
  /**
   * Convert THREE.AnimationClip to Animation store format
   */
  static fromThreeAnimation(
    clip: THREE.AnimationClip,
    objectMap: Map<THREE.Object3D, string>
  ): Animation {
    const tracks = clip.tracks.map(track =>
      this.convertTrack(track, objectMap)
    ).filter(Boolean);

    return {
      id: generateId(),
      name: clip.name,
      duration: clip.duration,
      tracks,
      loop: true,
      enabled: true,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
  }

  /**
   * Convert THREE.KeyframeTrack to AnimationTrack
   */
  static convertTrack(
    track: THREE.KeyframeTrack,
    objectMap: Map<THREE.Object3D, string>
  ): AnimationTrack | null {
    // Parse track name: "boneName.position"
    const [objectName, property] = track.name.split('.');
    const objectId = findObjectByName(objectName, objectMap);

    if (!objectId) return null;

    // Extract keyframes
    const keyframes: Keyframe[] = [];
    for (let i = 0; i < track.times.length; i++) {
      keyframes.push({
        id: generateId(),
        time: track.times[i],
        value: extractValue(track.values, i, property),
        interpolation: getInterpolationType(track),
        space: 'local',
      });
    }

    return {
      id: generateId(),
      objectId,
      property,
      propertyPath: [property],
      keyframes,
      enabled: true,
      boneId: objectId,  // For bone tracks
      transformType: property as any,
    };
  }

  /**
   * Convert Animation store format back to THREE.AnimationClip
   */
  static toThreeAnimation(animation: Animation): THREE.AnimationClip {
    const tracks = animation.tracks.map(track =>
      this.createThreeTrack(track)
    );

    return new THREE.AnimationClip(animation.name, animation.duration, tracks);
  }
}
```

#### Acceptance Criteria
- [ ] GLB files with bones load successfully
- [ ] Bone hierarchy preserved from GLB
- [ ] Skin weights imported correctly
- [ ] Animations imported and playable
- [ ] No crashes or errors on import
- [ ] Support for multiple armatures in one file

#### Estimated Effort
**13 story points** (4-5 days)

---

### Epic 3: Bone Visualization & UI
**Goal**: Render bones in viewport and provide UI controls

#### User Stories
1. **As a user**, I can see bones rendered in the 3D viewport
2. **As a user**, I can select bones by clicking them
3. **As a user**, I can see bone names in the outliner
4. **As a user**, I can toggle bone display options

#### Technical Tasks

**3.1 Bone Renderer Component** (`src/components/viewport/BoneRenderer.tsx`)
```typescript
export function BoneRenderer({ bone, isSelected }: {
  bone: SceneObject,
  isSelected: boolean
}) {
  const { displayType, inFront } = useArmatureDisplaySettings(bone);

  // Get bone head and tail positions
  const head = new THREE.Vector3(...bone.boneProps!.headPosition);
  const tail = new THREE.Vector3(...bone.boneProps!.tailPosition);

  // Render based on display type
  if (displayType === 'octahedral') {
    return <OctahedralBone head={head} tail={tail} isSelected={isSelected} />;
  } else if (displayType === 'stick') {
    return <StickBone head={head} tail={tail} isSelected={isSelected} />;
  }

  return null;
}

function OctahedralBone({ head, tail, isSelected }: BoneProps) {
  const geometry = useMemo(() => {
    return createOctahedralGeometry(head, tail);
  }, [head, tail]);

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: isSelected ? 0x7C3AED : 0x6B7280,
      wireframe: false,
      depthTest: !inFront,
    });
  }, [isSelected, inFront]);

  return <mesh geometry={geometry} material={material} />;
}
```

**3.2 Skeleton Helper** (`src/components/viewport/SkeletonHelper.tsx`)
```typescript
/**
 * Renders entire skeleton hierarchy with connections
 */
export function SkeletonHelper({ armatureId }: { armatureId: string }) {
  const objects = useObjectsStore(state => state.objects);
  const bones = getBones(armatureId, objects);

  // Create bone connections
  const connections = useMemo(() => {
    return bones.map(bone => {
      if (!bone.parentId) return null;

      const parent = objects.get(bone.parentId);
      if (!parent || parent.type !== 'bone') return null;

      return {
        from: new THREE.Vector3(...bone.boneProps!.headPosition),
        to: new THREE.Vector3(...parent.boneProps!.headPosition),
      };
    }).filter(Boolean);
  }, [bones]);

  return (
    <group>
      {bones.map(bone => (
        <BoneRenderer key={bone.id} bone={bone} />
      ))}

      {connections.map((conn, i) => (
        <Line key={i} points={[conn.from, conn.to]} color="gray" />
      ))}
    </group>
  );
}
```

**3.3 Pose Mode Panel** (`src/components/panels/PoseModePanel.tsx`)
```typescript
export function PoseModePanel() {
  const { isPoseMode, activeBoneId, enterPoseMode, exitPoseMode } = useBoneStore();
  const { resetPose, applyPoseAsRest } = useBoneStore();

  if (!isPoseMode) return null;

  return (
    <div className="pose-mode-panel">
      <h3>Pose Mode</h3>

      <div className="controls">
        <button onClick={() => resetPose()}>
          Reset Pose
        </button>
        <button onClick={() => applyPoseAsRest()}>
          Apply as Rest Pose
        </button>
        <button onClick={() => exitPoseMode()}>
          Exit Pose Mode
        </button>
      </div>

      {activeBoneId && <BoneTransformControls boneId={activeBoneId} />}

      <PoseLibraryBrowser />
    </div>
  );
}
```

**3.4 Bone Transform Controls** (`src/components/viewport/BoneTransformControls.tsx`)
```typescript
/**
 * Transform controls specialized for bones (respects IK, constraints, etc.)
 */
export function BoneTransformControls({ boneId }: { boneId: string }) {
  const bone = useObjectsStore(state => state.objects.get(boneId));
  const { setPoseTransform } = useBoneStore();

  // ... TransformControls setup

  const handleChange = () => {
    // Update bone pose
    const newPose: BonePose = {
      position: [position.x, position.y, position.z],
      rotation: [quat.x, quat.y, quat.z, quat.w],
      scale: [scale.x, scale.y, scale.z],
    };

    setPoseTransform(boneId, newPose);
  };

  return <TransformControls onChange={handleChange} />;
}
```

#### Acceptance Criteria
- [ ] Bones visible in viewport
- [ ] Bones can be selected
- [ ] Bone names shown in outliner
- [ ] Multiple display modes (octahedral, stick, etc.)
- [ ] X-ray mode works
- [ ] Pose mode can be entered/exited
- [ ] Transform controls work in pose mode

#### Estimated Effort
**13 story points** (4-5 days)

---

### Epic 4: Weight Painting & Skinning
**Goal**: Create tools for painting vertex weights

#### User Stories
1. **As a user**, I can enter weight paint mode
2. **As a user**, I can paint weights with a brush
3. **As a user**, I can see weight visualization (heat map)
4. **As a user**, I can use automatic weights
5. **As a user**, I can normalize weights

#### Technical Tasks

**4.1 Weight Paint Store** (`src/stores/weightPaintStore.ts`)
```typescript
export interface WeightPaintState {
  isWeightPaintMode: boolean;
  activeMeshId: string | null;
  activeBoneId: string | null;

  // Brush settings
  brushSize: number;
  brushStrength: number;
  brushFalloff: 'linear' | 'smooth' | 'sharp';

  // Display settings
  showWeights: boolean;
  weightColorMap: 'rainbow' | 'redblue' | 'grayscale';

  // Operations
  enterWeightPaintMode: (meshId: string) => void;
  exitWeightPaintMode: () => void;
  setActiveBone: (boneId: string) => void;
  paintWeight: (vertexIndices: number[], weight: number) => void;
  smoothWeights: (vertexIndices: number[]) => void;
}
```

**4.2 Weight Paint Component** (`src/components/viewport/WeightPaintMode.tsx`)
```typescript
export function WeightPaintMode() {
  const { activeMeshId, activeBoneId, brushSize } = useWeightPaintStore();
  const mesh = useObjectsStore(state => state.objects.get(activeMeshId!));

  // Handle brush painting
  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!event.uv) return;

    // Find vertices near UV coordinate
    const vertices = getVerticesNearUV(mesh, event.uv, brushSize);

    // Paint weights
    paintWeight(vertices, brushStrength);
  };

  return (
    <>
      <mesh onPointerMove={handlePointerMove}>
        <WeightVisualizationMaterial
          weights={mesh.skinData.weights}
          activeBoneId={activeBoneId}
        />
      </mesh>

      <BrushCursor size={brushSize} />
    </>
  );
}
```

**4.3 Weight Visualization Shader** (`src/lib/shaders/WeightVisualization.ts`)
```glsl
// Vertex shader
attribute vec4 skinIndex;
attribute vec4 skinWeight;

uniform int activeBoneIndex;
varying float vWeight;

void main() {
  // Find weight for active bone
  vWeight = 0.0;
  for(int i = 0; i < 4; i++) {
    if(int(skinIndex[i]) == activeBoneIndex) {
      vWeight = skinWeight[i];
    }
  }

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// Fragment shader
varying float vWeight;
uniform vec3 colorLow;
uniform vec3 colorHigh;

void main() {
  vec3 color = mix(colorLow, colorHigh, vWeight);
  gl_FragColor = vec4(color, 1.0);
}
```

**4.4 Automatic Weights** (`src/lib/bones/AutoWeight.ts`)
```typescript
export class AutoWeight {
  /**
   * Automatic weights using heat diffusion method
   */
  static computeAutomaticWeights(
    mesh: SceneObject,
    armature: SceneObject
  ): SkinWeights {
    const qMesh = mesh.qMesh!;
    const bones = getBones(armature.id);

    const weights: SkinWeights = {};

    // For each vertex
    qMesh.vertices.forEach((vertex, vertexId) => {
      const influences: BoneInfluence[] = [];

      // Calculate distance to each bone
      bones.forEach(bone => {
        const distance = distanceTobone(vertex.position, bone);
        const weight = calculateWeight(distance);

        if (weight > 0.01) {
          influences.push({ boneId: bone.id, weight });
        }
      });

      // Normalize weights
      normalizeInfluences(influences);

      // Keep top 4 influences
      influences.sort((a, b) => b.weight - a.weight);
      weights[vertexId] = influences.slice(0, 4);
    });

    return weights;
  }

  /**
   * Envelope-based automatic weights
   */
  static computeEnvelopeWeights(
    mesh: SceneObject,
    armature: SceneObject
  ): SkinWeights {
    // Use bone envelopes (head/tail radius) for weighting
    // ...
  }
}
```

#### Acceptance Criteria
- [ ] Weight paint mode can be entered
- [ ] Brush paints weights on mesh
- [ ] Weight visualization shows as heat map
- [ ] Automatic weights work reasonably
- [ ] Weights can be normalized
- [ ] Multiple bones can have weights per vertex

#### Estimated Effort
**21 story points** (6-7 days)

---

### Epic 5: Bone Animation System
**Goal**: Integrate bones with existing animation system

#### User Stories
1. **As a user**, I can keyframe bone transforms
2. **As a user**, I can see bone animation in timeline
3. **As a user**, I can play bone animations
4. **As a user**, animated bones deform the mesh correctly

#### Technical Tasks

**5.1 Bone Animation Engine** (`src/lib/animation/BoneAnimationEngine.ts`)
```typescript
export class BoneAnimationEngine {
  /**
   * Apply animation to bones at given time
   */
  static applyAnimationAtTime(
    animation: Animation,
    time: number,
    objects: Map<string, SceneObject>
  ): void {
    animation.tracks.forEach(track => {
      if (!track.boneId) return;

      const bone = objects.get(track.boneId);
      if (!bone || bone.type !== 'bone') return;

      // Get interpolated value at time
      const value = interpolateKeyframes(track.keyframes, time);

      // Apply to bone based on transform type
      if (track.transformType === 'position') {
        bone.position = value;
      } else if (track.transformType === 'rotation') {
        bone.rotation = value;
      } else if (track.transformType === 'scale') {
        bone.scale = value;
      }
    });
  }

  /**
   * Update skinned mesh based on bone poses
   */
  static updateSkinnedMesh(
    mesh: SceneObject,
    bones: Map<string, SceneObject>
  ): void {
    if (!mesh.skinData) return;

    const qMesh = mesh.qMesh;
    if (!qMesh) return;

    // For each vertex
    qMesh.vertices.forEach((vertex, vertexId) => {
      const weights = mesh.skinData.weights[vertexId];
      if (!weights) return;

      // Blend position based on bone transforms
      const blendedPosition = new THREE.Vector3();

      weights.forEach(({ boneId, weight }) => {
        const bone = bones.get(boneId);
        if (!bone) return;

        // Get bone transform matrix
        const boneMatrix = getBoneWorldMatrix(bone);

        // Transform vertex by bone
        const transformed = vertex.position.clone()
          .applyMatrix4(mesh.skinData.bindMatrix)
          .applyMatrix4(boneMatrix);

        // Add weighted contribution
        blendedPosition.addScaledVector(transformed, weight);
      });

      // Update vertex position
      vertex.position.copy(blendedPosition);
    });

    // Recompile mesh
    mesh.renderGeometry = qMesh.toBufferGeometry();
  }
}
```

**5.2 Timeline Bone Tracks** (`src/components/timeline/BoneTrackView.tsx`)
```typescript
export function BoneTrackView({ track }: { track: AnimationTrack }) {
  if (!track.boneId) return null;

  const bone = useObjectsStore(state => state.objects.get(track.boneId!));

  return (
    <div className="bone-track">
      <div className="track-header">
        <BoneIcon />
        <span>{bone?.name}</span>
        <span className="property">{track.transformType}</span>
      </div>

      <KeyframeTrack track={track} />
    </div>
  );
}
```

**5.3 Auto-Keyframe Bones** (`src/hooks/useAutoKeyframeBones.ts`)
```typescript
export function useAutoKeyframeBones() {
  const { autoKeyframe, activeAnimationId } = useAnimationStore();
  const { isPoseMode, selectedBoneIds } = useBoneStore();

  const recordBonePose = useCallback((boneId: string) => {
    if (!autoKeyframe || !isPoseMode || !activeAnimationId) return;

    const bone = useObjectsStore.getState().objects.get(boneId);
    if (!bone) return;

    const currentTime = useAnimationStore.getState().currentTime;

    // Create keyframes for position, rotation, scale
    ['position', 'rotation', 'scale'].forEach(prop => {
      const track = findOrCreateTrack(activeAnimationId, boneId, prop);

      addKeyframe(activeAnimationId, track.id, {
        id: generateId(),
        time: currentTime,
        value: bone[prop],
        interpolation: 'linear',
      });
    });
  }, [autoKeyframe, isPoseMode, activeAnimationId]);

  return { recordBonePose };
}
```

#### Acceptance Criteria
- [ ] Bone keyframes can be created
- [ ] Bone animations play correctly
- [ ] Skinned meshes deform during animation
- [ ] Timeline shows bone tracks
- [ ] Auto-keyframe works for bones
- [ ] IK (Inverse Kinematics) basic support

#### Estimated Effort
**21 story points** (6-7 days)

---

### Epic 6: Export with Bones
**Goal**: Export GLB/GLTF with bones and animations preserved

#### User Stories
1. **As a user**, I can export a rigged character to GLB
2. **As a user**, exported bones work in other software (Blender, Unity)
3. **As a user**, exported animations play correctly

#### Technical Tasks

**6.1 Bone Exporter** (`src/lib/export/BoneExporter.ts`)
```typescript
export class BoneExporter {
  /**
   * Convert SceneObject bones to THREE.Bone hierarchy
   */
  static createThreeSkeleton(armatureId: string): THREE.Skeleton {
    const bones = getBones(armatureId);
    const threeBones: THREE.Bone[] = [];
    const boneMap = new Map<string, THREE.Bone>();

    // Create THREE.Bone objects
    bones.forEach(boneObj => {
      const bone = new THREE.Bone();
      bone.name = boneObj.name;
      bone.position.fromArray(boneObj.position);
      bone.rotation.fromArray(boneObj.rotation);
      bone.scale.fromArray(boneObj.scale);

      threeBones.push(bone);
      boneMap.set(boneObj.id, bone);
    });

    // Build hierarchy
    bones.forEach(boneObj => {
      if (boneObj.parentId) {
        const parent = boneMap.get(boneObj.parentId);
        const child = boneMap.get(boneObj.id);
        if (parent && child) {
          parent.add(child);
        }
      }
    });

    return new THREE.Skeleton(threeBones);
  }

  /**
   * Create THREE.SkinnedMesh from SceneObject
   */
  static createSkinnedMesh(mesh: SceneObject): THREE.SkinnedMesh {
    const geometry = mesh.renderGeometry || mesh.qMesh?.toBufferGeometry();
    if (!geometry) throw new Error('No geometry');

    // Add skin indices and weights attributes
    const skinData = mesh.skinData!;
    const { skinIndex, skinWeight } = this.createSkinAttributes(skinData);

    geometry.setAttribute('skinIndex', skinIndex);
    geometry.setAttribute('skinWeight', skinWeight);

    const material = new THREE.MeshStandardMaterial();
    const skinnedMesh = new THREE.SkinnedMesh(geometry, material);

    // Create skeleton
    const skeleton = this.createThreeSkeleton(skinData.armatureId);
    skinnedMesh.bind(skeleton);

    return skinnedMesh;
  }

  /**
   * Create skin attributes from SkinData
   */
  static createSkinAttributes(skinData: SkinData) {
    const vertexCount = Object.keys(skinData.weights).length;

    const skinIndexArray = new Uint16Array(vertexCount * 4);
    const skinWeightArray = new Float32Array(vertexCount * 4);

    Object.entries(skinData.weights).forEach(([vertexIdx, influences]) => {
      const idx = parseInt(vertexIdx);

      for (let i = 0; i < 4; i++) {
        if (i < influences.length) {
          skinIndexArray[idx * 4 + i] = getBoneIndex(influences[i].boneId);
          skinWeightArray[idx * 4 + i] = influences[i].weight;
        } else {
          skinIndexArray[idx * 4 + i] = 0;
          skinWeightArray[idx * 4 + i] = 0;
        }
      }
    });

    return {
      skinIndex: new THREE.Uint16BufferAttribute(skinIndexArray, 4),
      skinWeight: new THREE.Float32BufferAttribute(skinWeightArray, 4),
    };
  }
}
```

**6.2 Enhance GLTFExporter** (`src/lib/export/GLTFExporter.ts`)
```typescript
// In existing export function
export async function exportGLTF(/* ... */) {
  // ... existing code

  // NEW: Handle bones
  const armatures = Array.from(objects.values()).filter(o => o.type === 'armature');

  armatures.forEach(armature => {
    const skeleton = BoneExporter.createThreeSkeleton(armature.id);
    scene.add(skeleton.bones[0]); // Add root bone
  });

  // NEW: Handle skinned meshes
  const skinnedMeshes = Array.from(objects.values()).filter(o => o.skinData);

  skinnedMeshes.forEach(meshObj => {
    const skinnedMesh = BoneExporter.createSkinnedMesh(meshObj);
    scene.add(skinnedMesh);
  });

  // NEW: Handle animations
  if (animations.size > 0) {
    const threeAnimations = Array.from(animations.values()).map(anim =>
      AnimationConverter.toThreeAnimation(anim)
    );

    exporter.parse(
      scene,
      (result) => {
        // Save with animations
      },
      (error) => console.error(error),
      {
        animations: threeAnimations,
        // ...
      }
    );
  }
}
```

#### Acceptance Criteria
- [ ] GLB export includes bones
- [ ] GLB export includes skin weights
- [ ] GLB export includes animations
- [ ] Exported file opens in Blender correctly
- [ ] Exported file works in game engines
- [ ] No data loss on export

#### Estimated Effort
**13 story points** (4-5 days)

---

### Epic 7: Testing & Polish
**Goal**: Comprehensive testing and refinement

#### Technical Tasks

**7.1 Unit Tests**
- `BoneConverter.test.ts` - Test import/export conversion
- `AutoWeight.test.ts` - Test automatic weighting algorithms
- `BoneAnimationEngine.test.ts` - Test animation application
- `boneStore.test.ts` - Test bone operations

**7.2 Integration Tests**
- Load GLB with bones → Edit → Export → Verify in Blender
- Create armature → Bind mesh → Animate → Play
- Weight paint → Deformation test
- Multi-armature scene handling

**7.3 Performance Testing**
- Test with 100+ bones
- Test with complex skin weights (1000+ vertices)
- Animation playback at 60fps
- Memory profiling

**7.4 Documentation**
- User guide for bones and rigging
- API documentation
- Tutorial: Rigging a character
- Tutorial: Weight painting

#### Acceptance Criteria
- [ ] 90%+ code coverage
- [ ] All integration tests pass
- [ ] Performance meets targets
- [ ] Documentation complete

#### Estimated Effort
**13 story points** (4-5 days)

---

## 📊 Timeline & Milestones

### Phase 1: Foundation (Week 1-2)
- Epic 1: Data Structures ✅
- Epic 2: GLB Import ✅

**Milestone**: Load rigged GLB files with bones visible

### Phase 2: Interaction (Week 3-4)
- Epic 3: Bone Visualization ✅
- Epic 4: Weight Painting (partial)

**Milestone**: Select and pose bones in viewport

### Phase 3: Animation (Week 5-6)
- Epic 4: Weight Painting (complete) ✅
- Epic 5: Bone Animation ✅

**Milestone**: Create and play bone animations

### Phase 4: Polish (Week 7-8)
- Epic 6: Export ✅
- Epic 7: Testing & Polish ✅

**Milestone**: Full round-trip GLB → Edit → GLB

---

## 🎯 Success Criteria

1. **Functional**
   - ✅ Load rigged GLB characters
   - ✅ Display bones in viewport
   - ✅ Pose bones with transform controls
   - ✅ Paint vertex weights
   - ✅ Animate bones with keyframes
   - ✅ Export with bones preserved

2. **Compatibility**
   - ✅ Files work in Blender 3.x+
   - ✅ Files work in Unity/Unreal
   - ✅ Standard GLTF 2.0 compliance

3. **Performance**
   - ✅ 60fps with 100+ bones
   - ✅ Real-time weight painting
   - ✅ Smooth animation playback

4. **UX**
   - ✅ Intuitive bone selection
   - ✅ Clear weight visualization
   - ✅ No learning curve for Blender users

---

## 🔧 Technical Debt & Risks

### Known Challenges
1. **IK Solving**: Inverse Kinematics is complex - start with FK only
2. **Weight Normalization**: Must sum to 1.0 per vertex
3. **Bone Constraints**: Full constraint system is out of scope
4. **Performance**: Many bones = many matrix calculations

### Mitigation
1. Start with Forward Kinematics (FK) only
2. Use proven algorithms (heat diffusion for auto-weights)
3. Limit to 4 bone influences per vertex (GPU standard)
4. Optimize matrix calculations with caching

---

## 📚 References

- [GLTF 2.0 Specification - Skins](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#skins)
- [THREE.js Skeleton/SkinnedMesh docs](https://threejs.org/docs/#api/en/objects/SkinnedMesh)
- [Blender Rigging Manual](https://docs.blender.org/manual/en/latest/animation/armatures/index.html)
- [Automatic Rigging (Pinocchio)](http://www.cs.cmu.edu/~kmcrane/Projects/ModelRepository/)

---

## ✅ Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Code reviewed
- [ ] User testing completed
- [ ] Export/Import verified in Blender

---

**Total Estimated Effort**: 102 story points (~7-8 weeks for 1 developer)

**Priority Tasks** (MVP):
1. Epic 1: Data Structures (8 pts)
2. Epic 2: GLB Import (13 pts)
3. Epic 3: Visualization (13 pts)
4. Epic 5: Animation (21 pts)

**Total MVP**: 55 points (~4 weeks)
