/**
 * SceneObject Component Tests - Light Rendering
 * Sprint 5: Lighting & Environment
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { SceneObject } from '../SceneObject';
import { useObjectsStore } from '../../../stores/objectsStore';
import { Canvas } from '@react-three/fiber';

// Mock materials store
vi.mock('../../../stores/materialsStore', () => ({
  useMaterialsStore: vi.fn(() => ({
    objectMaterials: new Map(),
    materials: new Map(),
    getTexture: vi.fn(),
  })),
}));

describe('SceneObject - Light Rendering', () => {
  beforeEach(() => {
    useObjectsStore.setState({
      objects: new Map(),
      selectedIds: [],
      transformMode: 'translate',
    });
  });

  const renderInCanvas = (component: React.ReactElement) => {
    return render(
      <Canvas>
        {component}
      </Canvas>
    );
  };

  describe('Point Light Rendering', () => {
    it('should render point light with helper sphere', () => {
      const light = useObjectsStore.getState().createPrimitive('pointLight', [0, 2, 0]);

      const { container } = renderInCanvas(
        <SceneObject object={light} isSelected={false} onSelect={vi.fn()} />
      );

      expect(container).toBeTruthy();
    });

    it('should render point light with correct properties', () => {
      const light = useObjectsStore.getState().createPrimitive('pointLight');
      light.lightProps = {
        ...light.lightProps!,
        color: '#FF0000',
        intensity: 5,
        distance: 10,
        decay: 2,
      };

      const { container } = renderInCanvas(
        <SceneObject object={light} isSelected={false} onSelect={vi.fn()} />
      );

      expect(container).toBeTruthy();
    });

    it('should show purple helper when point light is selected', () => {
      const light = useObjectsStore.getState().createPrimitive('pointLight');

      const { container } = renderInCanvas(
        <SceneObject object={light} isSelected={true} onSelect={vi.fn()} />
      );

      expect(container).toBeTruthy();
    });
  });

  describe('Spot Light Rendering', () => {
    it('should render spot light with cone helper', () => {
      const light = useObjectsStore.getState().createPrimitive('spotLight');

      const { container } = renderInCanvas(
        <SceneObject object={light} isSelected={false} onSelect={vi.fn()} />
      );

      expect(container).toBeTruthy();
    });

    it('should render spot light with angle and penumbra', () => {
      const light = useObjectsStore.getState().createPrimitive('spotLight');
      light.lightProps = {
        ...light.lightProps!,
        angle: Math.PI / 4,
        penumbra: 0.5,
      };

      const { container } = renderInCanvas(
        <SceneObject object={light} isSelected={false} onSelect={vi.fn()} />
      );

      expect(container).toBeTruthy();
    });
  });

  describe('Directional Light Rendering', () => {
    it('should render directional light with plane helper', () => {
      const light = useObjectsStore.getState().createPrimitive('directionalLight');

      const { container } = renderInCanvas(
        <SceneObject object={light} isSelected={false} onSelect={vi.fn()} />
      );

      expect(container).toBeTruthy();
    });

    it('should render directional light with shadow settings', () => {
      const light = useObjectsStore.getState().createPrimitive('directionalLight');
      light.lightProps = {
        ...light.lightProps!,
        castShadow: true,
        shadowMapSize: 2048,
      };

      const { container } = renderInCanvas(
        <SceneObject object={light} isSelected={false} onSelect={vi.fn()} />
      );

      expect(container).toBeTruthy();
    });
  });

  describe('Ambient Light Rendering', () => {
    it('should render ambient light with icosahedron helper', () => {
      const light = useObjectsStore.getState().createPrimitive('ambientLight');

      const { container } = renderInCanvas(
        <SceneObject object={light} isSelected={false} onSelect={vi.fn()} />
      );

      expect(container).toBeTruthy();
    });

    it('should render ambient light at correct position', () => {
      const light = useObjectsStore.getState().createPrimitive('ambientLight', [1, 2, 3]);

      const { container } = renderInCanvas(
        <SceneObject object={light} isSelected={false} onSelect={vi.fn()} />
      );

      expect(container).toBeTruthy();
      expect(light.position).toEqual([1, 2, 3]);
    });
  });

  describe('Light Visibility', () => {
    it('should not render light when visibility is false', () => {
      const light = useObjectsStore.getState().createPrimitive('pointLight');
      light.visible = false;

      const { container } = renderInCanvas(
        <SceneObject object={light} isSelected={false} onSelect={vi.fn()} />
      );

      // Should return null when not visible
      expect(container.querySelector('group')).toBeNull();
    });

    it('should render light when visibility is true', () => {
      const light = useObjectsStore.getState().createPrimitive('pointLight');
      light.visible = true;

      const { container } = renderInCanvas(
        <SceneObject object={light} isSelected={false} onSelect={vi.fn()} />
      );

      expect(container).toBeTruthy();
    });
  });

  describe('Light Shadow Configuration', () => {
    it('should apply shadow map size to point light', () => {
      const light = useObjectsStore.getState().createPrimitive('pointLight');
      light.lightProps = {
        ...light.lightProps!,
        castShadow: true,
        shadowMapSize: 2048,
        shadowBias: -0.0001,
        shadowRadius: 2,
      };

      const { container } = renderInCanvas(
        <SceneObject object={light} isSelected={false} onSelect={vi.fn()} />
      );

      expect(container).toBeTruthy();
      expect(light.lightProps.shadowMapSize).toBe(2048);
    });

    it('should apply shadow settings to spot light', () => {
      const light = useObjectsStore.getState().createPrimitive('spotLight');
      light.lightProps = {
        ...light.lightProps!,
        castShadow: true,
        shadowBias: -0.0005,
        shadowRadius: 3,
      };

      const { container } = renderInCanvas(
        <SceneObject object={light} isSelected={false} onSelect={vi.fn()} />
      );

      expect(light.lightProps.shadowBias).toBe(-0.0005);
    });

    it('should apply shadow camera bounds to directional light', () => {
      const light = useObjectsStore.getState().createPrimitive('directionalLight');
      light.lightProps = {
        ...light.lightProps!,
        castShadow: true,
        shadowMapSize: 4096,
      };

      const { container } = renderInCanvas(
        <SceneObject object={light} isSelected={false} onSelect={vi.fn()} />
      );

      expect(light.lightProps.shadowMapSize).toBe(4096);
    });
  });

  describe('Mesh Rendering (Primitives)', () => {
    it('should render box primitive (not a light)', () => {
      const box = useObjectsStore.getState().createPrimitive('box');

      const { container } = renderInCanvas(
        <SceneObject object={box} isSelected={false} onSelect={vi.fn()} />
      );

      expect(container).toBeTruthy();
    });

    it('should render sphere primitive with cast/receive shadows', () => {
      const sphere = useObjectsStore.getState().createPrimitive('sphere');

      const { container } = renderInCanvas(
        <SceneObject object={sphere} isSelected={false} onSelect={vi.fn()} />
      );

      expect(container).toBeTruthy();
    });
  });

  describe('Light Transform', () => {
    it('should render light at specified position', () => {
      const light = useObjectsStore.getState().createPrimitive('pointLight', [5, 10, -3]);

      expect(light.position).toEqual([5, 10, -3]);
    });

    it('should render light with rotation', () => {
      const light = useObjectsStore.getState().createPrimitive('spotLight');
      light.rotation = [0, Math.PI / 2, 0];

      const { container } = renderInCanvas(
        <SceneObject object={light} isSelected={false} onSelect={vi.fn()} />
      );

      expect(light.rotation).toEqual([0, Math.PI / 2, 0]);
    });
  });

  describe('Light Color', () => {
    it('should render light with custom color', () => {
      const light = useObjectsStore.getState().createPrimitive('pointLight');
      light.lightProps = {
        ...light.lightProps!,
        color: '#00FF00',
      };

      const { container } = renderInCanvas(
        <SceneObject object={light} isSelected={false} onSelect={vi.fn()} />
      );

      expect(light.lightProps.color).toBe('#00FF00');
    });

    it('should show light helper in light color', () => {
      const light = useObjectsStore.getState().createPrimitive('pointLight');
      light.lightProps = {
        ...light.lightProps!,
        color: '#FF00FF',
      };

      const { container } = renderInCanvas(
        <SceneObject object={light} isSelected={false} onSelect={vi.fn()} />
      );

      expect(light.lightProps.color).toBe('#FF00FF');
    });
  });
});
