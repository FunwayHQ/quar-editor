/**
 * Light Properties Panel Component Tests
 * Sprint 5: Lighting & Environment
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LightPropertiesPanel } from '../LightPropertiesPanel';
import { useObjectsStore } from '../../../stores/objectsStore';
import { useCommandStore } from '../../../stores/commandStore';

describe('LightPropertiesPanel', () => {
  beforeEach(() => {
    // Reset stores
    useObjectsStore.setState({
      objects: new Map(),
      selectedIds: [],
      transformMode: 'translate',
    });

    useCommandStore.setState({
      history: [],
      currentIndex: -1,
      maxHistory: 100,
    });
  });

  it('should render nothing when no object is selected', () => {
    const { container } = render(<LightPropertiesPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when selected object is not a light', () => {
    const box = useObjectsStore.getState().createPrimitive('box');
    useObjectsStore.getState().addObject(box);
    useObjectsStore.setState({ selectedIds: [box.id] });

    const { container } = render(<LightPropertiesPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('should render when a point light is selected', () => {
    const light = useObjectsStore.getState().createPrimitive('pointLight');
    useObjectsStore.getState().addObject(light);
    useObjectsStore.setState({ selectedIds: [light.id] });

    render(<LightPropertiesPanel />);

    expect(screen.getByText('Light Properties')).toBeInTheDocument();
    expect(screen.getByText('Color')).toBeInTheDocument();
    expect(screen.getByText('Intensity')).toBeInTheDocument();
    expect(screen.getByText('Distance (0 = infinite)')).toBeInTheDocument();
    expect(screen.getByText('Decay')).toBeInTheDocument();
  });

  it('should render spot light specific controls', () => {
    const light = useObjectsStore.getState().createPrimitive('spotLight');
    useObjectsStore.getState().addObject(light);
    useObjectsStore.setState({ selectedIds: [light.id] });

    render(<LightPropertiesPanel />);

    expect(screen.getByText('Angle (degrees)')).toBeInTheDocument();
    expect(screen.getByText('Penumbra (soft edge)')).toBeInTheDocument();
  });

  it('should not render distance controls for directional light', () => {
    const light = useObjectsStore.getState().createPrimitive('directionalLight');
    useObjectsStore.getState().addObject(light);
    useObjectsStore.setState({ selectedIds: [light.id] });

    render(<LightPropertiesPanel />);

    expect(screen.queryByText('Distance')).not.toBeInTheDocument();
    expect(screen.queryByText('Decay')).not.toBeInTheDocument();
  });

  it('should not render distance controls for ambient light', () => {
    const light = useObjectsStore.getState().createPrimitive('ambientLight');
    useObjectsStore.getState().addObject(light);
    useObjectsStore.setState({ selectedIds: [light.id] });

    render(<LightPropertiesPanel />);

    expect(screen.queryByText('Distance')).not.toBeInTheDocument();
    expect(screen.queryByText('Decay')).not.toBeInTheDocument();
  });

  it('should render shadow controls for non-ambient lights', () => {
    const light = useObjectsStore.getState().createPrimitive('pointLight');
    useObjectsStore.getState().addObject(light);
    useObjectsStore.setState({ selectedIds: [light.id] });

    render(<LightPropertiesPanel />);

    expect(screen.getByText('Cast Shadows')).toBeInTheDocument();
  });

  it('should render shadow settings when shadows are enabled', () => {
    const light = useObjectsStore.getState().createPrimitive('pointLight', [0, 0, 0]);
    light.lightProps = {
      ...light.lightProps!,
      castShadow: true,
    };
    useObjectsStore.getState().addObject(light);
    useObjectsStore.setState({ selectedIds: [light.id] });

    render(<LightPropertiesPanel />);

    expect(screen.getByText('Shadow Settings')).toBeInTheDocument();
    expect(screen.getByText('Shadow Map Size')).toBeInTheDocument();
    expect(screen.getByText('Shadow Bias')).toBeInTheDocument();
    expect(screen.getByText('Shadow Radius')).toBeInTheDocument();
  });

  it('should display correct default values for point light', () => {
    const light = useObjectsStore.getState().createPrimitive('pointLight');
    useObjectsStore.getState().addObject(light);
    useObjectsStore.setState({ selectedIds: [light.id] });

    render(<LightPropertiesPanel />);

    // Check that color input exists with default value
    const colorInput = screen.getByDisplayValue('#FFFFFF');
    expect(colorInput).toBeInTheDocument();

    // Check intensity slider shows 1.00 (use getAllByText since multiple values might exist)
    const intensityValues = screen.getAllByText('1.00');
    expect(intensityValues.length).toBeGreaterThan(0);
  });

  it('should handle multiple selected lights (shows first only)', () => {
    const light1 = useObjectsStore.getState().createPrimitive('pointLight');
    const light2 = useObjectsStore.getState().createPrimitive('spotLight');
    useObjectsStore.getState().addObject(light1);
    useObjectsStore.getState().addObject(light2);
    useObjectsStore.setState({ selectedIds: [light1.id, light2.id] });

    render(<LightPropertiesPanel />);

    // Should show properties for first selected light (point light)
    expect(screen.getByText('Light Properties')).toBeInTheDocument();
    // Should not show spot light specific controls
    expect(screen.queryByText('Angle (degrees)')).not.toBeInTheDocument();
  });
});
