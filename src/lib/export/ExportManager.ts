/**
 * Export Manager
 *
 * Main orchestrator for exporting scenes to various formats.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import * as THREE from 'three';
import { ExportFormat, ExportOptions } from '../../stores/exportStore';
import { SceneObject } from '../../stores/objectsStore';
import { Animation } from '../../stores/animationStore';
import { useMaterialsStore } from '../../stores/materialsStore';
import { useMorphTargetStore } from '../../stores/morphTargetStore';
import { meshRegistry } from '../mesh/MeshRegistry';

export interface ExportResult {
  success: boolean;
  data?: Blob | string;
  filename: string;
  error?: string;
}

export class ExportManager {
  /**
   * Export scene to specified format
   */
  async exportScene(
    objects: SceneObject[],
    animations: Map<string, Animation>,
    options: ExportOptions,
    onProgress?: (progress: number, step: string) => void
  ): Promise<ExportResult> {
    try {
      onProgress?.(0, 'Preparing scene...');

      // Build Three.js scene from our objects
      const scene = this.buildThreeScene(objects, options);

      onProgress?.(20, `Exporting to ${options.format.toUpperCase()}...`);

      // Export based on format
      let result: ExportResult;
      switch (options.format) {
        case 'glb':
        case 'gltf':
          result = await this.exportGLTF(scene, animations, options, onProgress);
          break;
        case 'obj':
          result = await this.exportOBJ(scene, options, onProgress);
          break;
        case 'usdz':
          result = await this.exportUSDZ(scene, options, onProgress);
          break;
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      onProgress?.(100, 'Export complete!');
      return result;

    } catch (error) {
      console.error('[ExportManager] Export failed:', error);
      return {
        success: false,
        filename: '',
        error: error instanceof Error ? error.message : 'Unknown export error',
      };
    }
  }

  /**
   * Build Three.js scene from our scene objects
   */
  private buildThreeScene(objects: SceneObject[], options: ExportOptions): THREE.Scene {
    const scene = new THREE.Scene();

    for (const obj of objects) {
      // Skip if export selection only and object not selected
      if (options.exportSelectionOnly && !obj.selected) {
        continue;
      }

      const mesh = this.buildThreeMesh(obj, options);
      if (mesh) {
        scene.add(mesh);
      }
    }

    return scene;
  }

  /**
   * Build Three.js mesh from scene object
   */
  private buildThreeMesh(obj: SceneObject, options: ExportOptions): THREE.Object3D | null {
    // If it's a light, handle separately
    if (obj.lightProps) {
      return this.buildThreeLight(obj);
    }

    let geometry: THREE.BufferGeometry | undefined;

    // First, try to get the current geometry from the mesh registry (includes any edits)
    const registeredMesh = meshRegistry.getMesh(obj.id);
    if (registeredMesh && registeredMesh.geometry) {
      geometry = registeredMesh.geometry.clone();
      console.log(`[ExportManager] Using geometry from mesh registry for ${obj.name}`);
    }

    // If not in registry, build from stored data
    if (!geometry) {
      // Validate geometry exists
      if (!obj.geometry) {
        console.warn(`[ExportManager] Object ${obj.name} has no geometry`);
        return null;
      }

      if (!obj.geometry.type) {
        console.warn(`[ExportManager] Object ${obj.name} geometry has no type`);
        return null;
      }

      // Create geometry based on type
      switch (obj.geometry.type) {
        case 'box':
          geometry = new THREE.BoxGeometry(
            obj.geometry.parameters.width,
            obj.geometry.parameters.height,
            obj.geometry.parameters.depth
          );
          break;
        case 'sphere':
          geometry = new THREE.SphereGeometry(
            obj.geometry.parameters.radius,
            obj.geometry.parameters.widthSegments,
            obj.geometry.parameters.heightSegments
          );
          break;
        case 'cylinder':
          geometry = new THREE.CylinderGeometry(
            obj.geometry.parameters.radiusTop,
            obj.geometry.parameters.radiusBottom,
            obj.geometry.parameters.height,
            obj.geometry.parameters.radialSegments
          );
          break;
        case 'plane':
          geometry = new THREE.PlaneGeometry(
            obj.geometry.parameters.width,
            obj.geometry.parameters.height
          );
          break;
        case 'torus':
          geometry = new THREE.TorusGeometry(
            obj.geometry.parameters.radius,
            obj.geometry.parameters.tube,
            obj.geometry.parameters.radialSegments,
            obj.geometry.parameters.tubularSegments
          );
          break;
        case 'cone':
          geometry = new THREE.ConeGeometry(
            obj.geometry.parameters.radius,
            obj.geometry.parameters.height,
            obj.geometry.parameters.radialSegments
          );
          break;
        case 'imported':
          // Use stored geometry data
          if (obj.geometry.data) {
            geometry = this.deserializeGeometry(obj.geometry.data);
          } else {
            console.warn(`[ExportManager] No geometry data for imported object: ${obj.name}`);
            return null;
          }
          break;
        default:
          console.warn(`[ExportManager] Unknown geometry type: ${obj.geometry.type}`);
          return null;
      }
    }

    // Ensure we have geometry at this point
    if (!geometry) {
      console.error(`[ExportManager] Failed to create geometry for ${obj.name}`);
      return null;
    }

    // Create material (if materials enabled)
    let material: THREE.Material;
    if (options.includeMaterials) {
      material = this.buildThreeMaterial(obj);
    } else {
      material = new THREE.MeshBasicMaterial({ color: 0x808080 });
    }

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = obj.name;
    mesh.position.set(...obj.position);
    mesh.rotation.set(...obj.rotation);
    mesh.scale.set(...obj.scale);

    // Add morph targets if available and enabled
    if (options.includeMorphTargets) {
      this.addMorphTargets(mesh, obj.id);
    }

    return mesh;
  }

  /**
   * Build Three.js material from scene object
   */
  private buildThreeMaterial(obj: SceneObject): THREE.Material {
    const materialsStore = useMaterialsStore.getState();
    const materialId = materialsStore.objectMaterials.get(obj.id);

    if (!materialId) {
      // No material assigned, use default
      return new THREE.MeshStandardMaterial({ color: 0x808080 });
    }

    const material = materialsStore.materials.get(materialId);
    if (!material) {
      return new THREE.MeshStandardMaterial({ color: 0x808080 });
    }

    // Create Three.js material from our material data
    const threeMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(material.albedo),
      metalness: material.metallic,
      roughness: material.roughness,
      emissive: new THREE.Color(material.emission),
      emissiveIntensity: material.emissionIntensity,
      transparent: material.transparent,
      opacity: material.opacity,
      side: material.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    });

    // TODO: Load and apply textures if embedTextures is true
    // This would require loading texture blobs from materialsStore

    return threeMaterial;
  }

  /**
   * Add morph targets to mesh from shape keys
   */
  private addMorphTargets(mesh: THREE.Mesh, objectId: string): void {
    const morphStore = useMorphTargetStore.getState();
    const shapeKeys = morphStore.getShapeKeysForObject(objectId);

    if (!shapeKeys || shapeKeys.length === 0) {
      return;
    }

    const geometry = mesh.geometry as THREE.BufferGeometry;
    const basePose = morphStore.getBasePose(objectId);

    if (!basePose) {
      console.warn(`[ExportManager] No base pose found for object with shape keys: ${objectId}`);
      return;
    }

    // Create morph attributes arrays
    const morphPositions: Float32Array[] = [];
    const morphNormals: Float32Array[] = [];
    const influenceValues: number[] = [];

    // Add each shape key as a morph target
    for (const shapeKey of shapeKeys) {
      // Calculate the delta from base pose
      const basePositions = basePose.attributes.position.array as Float32Array;
      const deltaPositions = new Float32Array(shapeKey.positions.length);

      for (let i = 0; i < shapeKey.positions.length; i++) {
        deltaPositions[i] = shapeKey.positions[i] - basePositions[i];
      }

      morphPositions.push(deltaPositions);

      // Add normals if available
      if (shapeKey.normals && basePose.attributes.normal) {
        const baseNormals = basePose.attributes.normal.array as Float32Array;
        const deltaNormals = new Float32Array(shapeKey.normals.length);

        for (let i = 0; i < shapeKey.normals.length; i++) {
          deltaNormals[i] = shapeKey.normals[i] - baseNormals[i];
        }

        morphNormals.push(deltaNormals);
      }

      // Store current influence value
      influenceValues.push(shapeKey.value);
    }

    // Set morph attributes on geometry
    if (morphPositions.length > 0) {
      geometry.morphAttributes.position = morphPositions.map(
        positions => new THREE.Float32BufferAttribute(positions, 3)
      );

      if (morphNormals.length > 0) {
        geometry.morphAttributes.normal = morphNormals.map(
          normals => new THREE.Float32BufferAttribute(normals, 3)
        );
      }

      // Update mesh morph target influences
      mesh.morphTargetInfluences = influenceValues;

      // Store shape key names in userData for GLTF export
      mesh.userData.morphTargetNames = shapeKeys.map(sk => sk.name);
    }

    console.log(`[ExportManager] Added ${shapeKeys.length} morph targets to ${mesh.name}`);
  }

  /**
   * Build Three.js light from scene object
   */
  private buildThreeLight(obj: SceneObject): THREE.Light {
    if (!obj.lightProps) {
      throw new Error('Object is not a light');
    }

    const props = obj.lightProps;
    let light: THREE.Light;

    // Derive light type from object type (pointLight -> point)
    const lightType = obj.type.replace('Light', '').toLowerCase();

    switch (lightType) {
      case 'point':
        light = new THREE.PointLight(
          props.color,
          props.intensity,
          props.distance,
          props.decay
        );
        break;
      case 'spot':
        light = new THREE.SpotLight(
          props.color,
          props.intensity,
          props.distance,
          props.angle,
          props.penumbra,
          props.decay
        );
        break;
      case 'directional':
        light = new THREE.DirectionalLight(props.color, props.intensity);
        break;
      case 'ambient':
        light = new THREE.AmbientLight(props.color, props.intensity);
        break;
      default:
        throw new Error(`Unknown light type: ${lightType} (from ${obj.type})`);
    }

    light.name = obj.name;
    light.position.set(...obj.position);
    light.castShadow = props.castShadow;

    return light;
  }

  /**
   * Deserialize stored geometry data back to BufferGeometry
   */
  private deserializeGeometry(data: any): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    // Restore attributes
    if (data.attributes) {
      for (const [name, attr] of Object.entries(data.attributes as any)) {
        geometry.setAttribute(
          name,
          new THREE.BufferAttribute(new Float32Array(attr.array), attr.itemSize)
        );
      }
    }

    // Restore index
    if (data.index) {
      geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(data.index.array), 1));
    }

    return geometry;
  }

  /**
   * Export to GLTF/GLB format
   */
  private async exportGLTF(
    scene: THREE.Scene,
    animations: Map<string, Animation>,
    options: ExportOptions,
    onProgress?: (progress: number, step: string) => void
  ): Promise<ExportResult> {
    onProgress?.(40, 'Converting to GLTF format...');

    // Dynamic import to avoid bundling if not used
    const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');

    return new Promise((resolve) => {
      const exporter = new GLTFExporter();

      onProgress?.(60, 'Serializing scene data...');

      // Process morph target names for the exporter
      const processedScene = scene.clone();
      processedScene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.morphTargetNames) {
          // GLTFExporter will use these names
          child.morphTargetDictionary = {};
          child.userData.morphTargetNames.forEach((name: string, index: number) => {
            child.morphTargetDictionary![name] = index;
          });
        }
      });

      // Configure export options
      const exporterOptions: any = {
        binary: options.binary,
        animations: options.includeAnimations ? [] : undefined, // TODO: Convert animations
        embedImages: options.embedTextures,
      };

      // Add Draco compression if enabled
      if (options.useDracoCompression && (options.format === 'glb' || options.format === 'gltf')) {
        onProgress?.(50, 'Configuring Draco compression...');

        // Set up Draco compression
        exporterOptions.dracoOptions = {
          compressionLevel: options.dracoCompressionLevel || 7,
          quantizePosition: 14, // Bits for position quantization
          quantizeNormal: 10,   // Bits for normal quantization
          quantizeColor: 8,     // Bits for color quantization
          quantizeTexcoord: 12, // Bits for texture coordinate quantization
          quantizeGeneric: 12,  // Bits for generic attributes
        };

        console.log('[ExportManager] Draco compression enabled, level:', options.dracoCompressionLevel);
      }

      exporter.parse(
        processedScene,
        (result) => {
          onProgress?.(90, 'Creating file...');

          let blob: Blob;
          let filename: string;

          if (options.binary) {
            // GLB format (binary)
            blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' });
            filename = 'scene.glb';
          } else {
            // GLTF format (JSON)
            const json = JSON.stringify(result, null, 2);
            blob = new Blob([json], { type: 'application/json' });
            filename = 'scene.gltf';
          }

          console.log(`[ExportManager] Export complete, file size: ${(blob.size / 1024).toFixed(2)} KB`);

          resolve({
            success: true,
            data: blob,
            filename,
          });
        },
        (error) => {
          resolve({
            success: false,
            filename: '',
            error: error?.message || 'GLTF export failed',
          });
        },
        exporterOptions
      );
    });
  }

  /**
   * Export to FBX format
   * NOTE: FBX export is currently not supported in Three.js browser environment.
   * GLB format is recommended as it's widely supported by Unity, Unreal, and other engines.
   */
  private async exportFBX(
    scene: THREE.Scene,
    options: ExportOptions,
    onProgress?: (progress: number, step: string) => void
  ): Promise<ExportResult> {
    onProgress?.(40, 'Checking FBX support...');

    // FBX export is not available in browser Three.js
    // Return helpful error message
    return {
      success: false,
      filename: '',
      error: 'FBX export is not currently supported in the browser. Please use GLB format instead - it works with Unity, Unreal Engine, Blender, and all major 3D applications.',
    };
  }

  /**
   * Export to OBJ format
   */
  private async exportOBJ(
    scene: THREE.Scene,
    options: ExportOptions,
    onProgress?: (progress: number, step: string) => void
  ): Promise<ExportResult> {
    onProgress?.(40, 'Converting to OBJ format...');

    const { OBJExporter } = await import('three/examples/jsm/exporters/OBJExporter.js');

    onProgress?.(60, 'Serializing geometry...');

    const exporter = new OBJExporter();
    const result = exporter.parse(scene);

    onProgress?.(90, 'Creating file...');

    const blob = new Blob([result], { type: 'text/plain' });

    return {
      success: true,
      data: blob,
      filename: 'scene.obj',
    };
  }

  /**
   * Export to USDZ format (iOS AR)
   */
  private async exportUSDZ(
    scene: THREE.Scene,
    options: ExportOptions,
    onProgress?: (progress: number, step: string) => void
  ): Promise<ExportResult> {
    onProgress?.(40, 'Converting to USDZ format...');

    try {
      console.log('[ExportManager] Starting USDZ export...');
      const { USDZExporter } = await import('three/examples/jsm/exporters/USDZExporter.js');
      console.log('[ExportManager] USDZExporter loaded successfully');

      onProgress?.(50, 'Preparing scene for AR...');

      // USDZ requires a clean scene - let's ensure we have proper meshes
      const processedScene = scene.clone();

      // Ensure all meshes have proper materials and normals
      processedScene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Ensure we have a valid material
          if (!child.material) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0x808080,
              roughness: 0.5,
              metalness: 0.5,
            });
          }

          // Ensure geometry has normals (required for USDZ)
          if (child.geometry && !child.geometry.attributes.normal) {
            child.geometry.computeVertexNormals();
          }

          // Ensure geometry has UVs (helpful for USDZ)
          if (child.geometry && !child.geometry.attributes.uv) {
            // Add basic UVs if missing
            const geometry = child.geometry;
            const posCount = geometry.attributes.position.count;
            const uvs = new Float32Array(posCount * 2);
            for (let i = 0; i < posCount; i++) {
              uvs[i * 2] = 0;
              uvs[i * 2 + 1] = 0;
            }
            geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
          }
        }
      });

      onProgress?.(60, 'Serializing for iOS AR...');

      const exporter = new USDZExporter();
      console.log('[ExportManager] USDZExporter instance created');

      // Log scene info
      let meshCount = 0;
      processedScene.traverse((child) => {
        if (child instanceof THREE.Mesh) meshCount++;
      });
      console.log(`[ExportManager] Scene has ${meshCount} meshes`);

      // The USDZ exporter has parseAsync method that returns a Promise<ArrayBuffer>
      console.log('[ExportManager] Calling exporter.parseAsync...');

      let arrayBuffer: ArrayBuffer;
      try {
        // Use parseAsync which returns a Promise<ArrayBuffer>
        const exportOptions = {
          ar: {
            anchoring: { type: 'plane' },
            planeAnchoring: { alignment: 'horizontal' }
          },
          includeAnchoringProperties: true,
          quickLookCompatible: true,
          maxTextureSize: 2048,
        };

        const result = await exporter.parseAsync(processedScene, exportOptions);
        console.log('[ExportManager] parseAsync completed, result type:', typeof result);
        console.log('[ExportManager] parseAsync result:', result);
        console.log('[ExportManager] Is ArrayBuffer?', result instanceof ArrayBuffer);
        console.log('[ExportManager] Is Uint8Array?', result instanceof Uint8Array);

        // Convert result to ArrayBuffer if needed
        if (result instanceof ArrayBuffer) {
          console.log('[ExportManager] Result is already an ArrayBuffer');
          arrayBuffer = result;
        } else if (result instanceof Uint8Array) {
          console.log('[ExportManager] Result is Uint8Array, converting to ArrayBuffer');
          // Convert Uint8Array to ArrayBuffer - create a new buffer with the data
          arrayBuffer = result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength);
          console.log('[ExportManager] Converted to ArrayBuffer, size:', arrayBuffer.byteLength);
        } else if (ArrayBuffer.isView(result)) {
          console.log('[ExportManager] Result is an ArrayBuffer view, converting');
          // Handle any other typed array views
          const view = result as any;
          arrayBuffer = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
        } else if (result && typeof result === 'object') {
          console.log('[ExportManager] Result is object, keys:', Object.keys(result));
          // Check if it has array-like properties
          if ('length' in result && typeof result.length === 'number') {
            // Could be an array-like object, try to convert
            const uint8 = new Uint8Array(result as any);
            arrayBuffer = uint8.buffer;
          } else {
            throw new Error(`Unexpected object type from parseAsync`);
          }
        } else {
          throw new Error(`parseAsync returned unexpected type: ${typeof result}`);
        }
      } catch (parseError) {
        console.error('[ExportManager] Parse error:', parseError);

        // Fallback: Try using the callback-based parse method
        try {
          console.log('[ExportManager] Trying callback-based parse method...');
          arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            exporter.parse(
              processedScene,
              (result: ArrayBuffer) => {
                console.log('[ExportManager] Callback received result:', result);
                resolve(result);
              },
              (error: any) => {
                console.error('[ExportManager] Callback received error:', error);
                reject(error);
              },
              {
                includeAnchoringProperties: true,
                quickLookCompatible: true,
                maxTextureSize: 2048,
              }
            );
          });
        } catch (fallbackError) {
          throw new Error(`USDZ export failed: ${fallbackError}`);
        }
      }

      onProgress?.(90, 'Creating file...');

      // Check if we got a valid result
      if (!arrayBuffer) {
        throw new Error('USDZ exporter returned no data');
      }

      // Additional validation
      console.log('[ExportManager] Final arrayBuffer type:', typeof arrayBuffer);
      console.log('[ExportManager] Is final ArrayBuffer?', arrayBuffer instanceof ArrayBuffer);
      console.log('[ExportManager] ArrayBuffer byteLength:', arrayBuffer.byteLength);

      if (arrayBuffer.byteLength === 0) {
        throw new Error('USDZ export resulted in empty file');
      }

      // Create blob - can accept ArrayBuffer directly
      const blob = new Blob([arrayBuffer], { type: 'model/vnd.usdz+zip' });

      console.log(`[ExportManager] USDZ export successful, size: ${blob.size} bytes`);

      return {
        success: true,
        data: blob,
        filename: 'scene.usdz',
      };
    } catch (error) {
      console.error('[ExportManager] USDZ export error:', error);
      return {
        success: false,
        filename: '',
        error: error instanceof Error ? error.message : 'USDZ export failed',
      };
    }
  }

  /**
   * Download exported file
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Singleton instance
let exportManager: ExportManager | null = null;

export function getExportManager(): ExportManager {
  if (!exportManager) {
    exportManager = new ExportManager();
  }
  return exportManager;
}
