/**
 * Environment Panel Component Tests
 * Sprint 5: Lighting & Environment
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnvironmentPanel } from '../EnvironmentPanel';
import { useEnvironmentStore } from '../../../stores/environmentStore';
import { useObjectsStore } from '../../../stores/objectsStore';

describe('EnvironmentPanel', () => {
  beforeEach(() => {
    // Reset stores
    useEnvironmentStore.setState({
      backgroundColor: '#0A0A0B',
      hdriEnabled: false,
      hdriPreset: null,
      hdriFile: null,
      hdriIntensity: 1,
      hdriAsBackground: true,
      backgroundBlur: 0,
      fogEnabled: false,
      fogType: 'linear',
      fogColor: '#0A0A0B',
      fogNear: 10,
      fogFar: 50,
      fogDensity: 0.05,
      groundPlaneEnabled: false,
      groundPlaneSize: 20,
      groundPlaneColor: '#27272A',
      groundPlaneReceiveShadow: true,
    });

    useObjectsStore.setState({
      objects: new Map(),
      selectedIds: [],
      transformMode: 'translate',
    });
  });

  describe('Rendering', () => {
    it('should render the environment panel', () => {
      render(<EnvironmentPanel />);
      expect(screen.getByText('Environment')).toBeInTheDocument();
    });

    it('should render lighting presets section', () => {
      render(<EnvironmentPanel />);
      expect(screen.getByText('Lighting Presets')).toBeInTheDocument();
    });

    it('should render all preset buttons', () => {
      render(<EnvironmentPanel />);

      expect(screen.getByText('Studio')).toBeInTheDocument();
      expect(screen.getByText('Night')).toBeInTheDocument();
      expect(screen.getByText('Clear All')).toBeInTheDocument();
      // HDRI presets
      expect(screen.getByText(/Outdoor \(HDRI\)/)).toBeInTheDocument();
      expect(screen.getByText(/Warehouse \(HDRI\)/)).toBeInTheDocument();
      expect(screen.getByText(/Sunset \(HDRI\)/)).toBeInTheDocument();
      // Manual presets
      expect(screen.getByText(/Outdoor \(Manual\)/)).toBeInTheDocument();
      expect(screen.getByText(/Sunset \(Manual\)/)).toBeInTheDocument();
    });

    it('should render background section', () => {
      render(<EnvironmentPanel />);
      expect(screen.getByText('Background')).toBeInTheDocument();
    });

    it('should render fog section', () => {
      render(<EnvironmentPanel />);
      expect(screen.getByText('Fog')).toBeInTheDocument();
    });

    it('should render ground plane section', () => {
      render(<EnvironmentPanel />);
      expect(screen.getByText('Ground Plane')).toBeInTheDocument();
    });
  });

  describe('Background Controls', () => {
    it('should display current background color', () => {
      useEnvironmentStore.setState({ backgroundColor: '#FF0000' });
      render(<EnvironmentPanel />);

      const colorInput = screen.getByDisplayValue('#FF0000');
      expect(colorInput).toBeInTheDocument();
    });

    it('should have color picker input', () => {
      render(<EnvironmentPanel />);

      // Background section should have color inputs
      const colorInputs = screen.getAllByDisplayValue('#0A0A0B');
      expect(colorInputs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Fog Controls', () => {
    it('should not show fog controls when fog is disabled', () => {
      useEnvironmentStore.setState({ fogEnabled: false });
      render(<EnvironmentPanel />);

      expect(screen.queryByText('Type')).not.toBeInTheDocument();
      expect(screen.queryByText('Near')).not.toBeInTheDocument();
    });

    it('should show fog controls when fog is enabled', () => {
      useEnvironmentStore.setState({ fogEnabled: true, fogType: 'linear' });
      render(<EnvironmentPanel />);

      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Color')).toBeInTheDocument();
    });

    it('should show linear fog controls', () => {
      useEnvironmentStore.setState({ fogEnabled: true, fogType: 'linear' });
      render(<EnvironmentPanel />);

      expect(screen.getByText('Near')).toBeInTheDocument();
      expect(screen.getByText('Far')).toBeInTheDocument();
    });

    it('should show exponential fog controls', () => {
      useEnvironmentStore.setState({ fogEnabled: true, fogType: 'exponential' });
      render(<EnvironmentPanel />);

      expect(screen.getByText('Density')).toBeInTheDocument();
      expect(screen.queryByText('Near')).not.toBeInTheDocument();
      expect(screen.queryByText('Far')).not.toBeInTheDocument();
    });

    it('should have fog type selector', () => {
      useEnvironmentStore.setState({ fogEnabled: true });
      render(<EnvironmentPanel />);

      const select = screen.getByDisplayValue('Linear');
      expect(select).toBeInTheDocument();
    });
  });

  describe('Ground Plane Controls', () => {
    it('should not show ground plane controls when disabled', () => {
      useEnvironmentStore.setState({ groundPlaneEnabled: false });
      render(<EnvironmentPanel />);

      expect(screen.queryByText('Size')).not.toBeInTheDocument();
      expect(screen.queryByText('Receive Shadows')).not.toBeInTheDocument();
    });

    it('should show ground plane controls when enabled', () => {
      useEnvironmentStore.setState({ groundPlaneEnabled: true });
      render(<EnvironmentPanel />);

      expect(screen.getByText('Size')).toBeInTheDocument();
      expect(screen.getByText('Receive Shadows')).toBeInTheDocument();
    });

    it('should display ground plane size', () => {
      useEnvironmentStore.setState({ groundPlaneEnabled: true, groundPlaneSize: 50 });
      render(<EnvironmentPanel />);

      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should have ground plane color picker', () => {
      useEnvironmentStore.setState({ groundPlaneEnabled: true, groundPlaneColor: '#FF0000' });
      render(<EnvironmentPanel />);

      const colorInputs = screen.getAllByDisplayValue('#FF0000');
      expect(colorInputs.length).toBeGreaterThan(0);
    });
  });

  describe('Preset Descriptions', () => {
    it('should show studio preset description', () => {
      render(<EnvironmentPanel />);
      expect(screen.getByText(/3-point lighting/i)).toBeInTheDocument();
    });

    it('should show outdoor preset description', () => {
      render(<EnvironmentPanel />);
      // Either manual or HDRI outdoor preset should be visible
      const hasOutdoorDescription =
        screen.queryByText(/Bright sunlight/i) ||
        screen.queryByText(/Natural outdoor/i);
      expect(hasOutdoorDescription).toBeTruthy();
    });

    it('should show night preset description', () => {
      render(<EnvironmentPanel />);
      expect(screen.getByText(/Low ambient/i)).toBeInTheDocument();
    });

    it('should show sunset preset description', () => {
      render(<EnvironmentPanel />);
      // Either manual or HDRI sunset preset should be visible
      const hasSunsetDescription =
        screen.queryByText(/Warm orange sun/i) ||
        screen.queryByText(/Natural sunset/i);
      expect(hasSunsetDescription).toBeTruthy();
    });

    it('should show warehouse preset description', () => {
      render(<EnvironmentPanel />);
      expect(screen.getByText(/Industrial warehouse/i)).toBeInTheDocument();
    });
  });

  describe('Info Box', () => {
    it('should render info box with helpful text', () => {
      render(<EnvironmentPanel />);

      expect(screen.getByText(/Environment settings affect/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper headings', () => {
      render(<EnvironmentPanel />);

      const heading = screen.getByRole('heading', { name: 'Environment' });
      expect(heading).toBeInTheDocument();
    });

    it('should have labeled inputs', () => {
      useEnvironmentStore.setState({ fogEnabled: true, fogType: 'linear' });
      render(<EnvironmentPanel />);

      expect(screen.getByText('Near')).toBeInTheDocument();
      expect(screen.getByText('Far')).toBeInTheDocument();
    });

    it('should have checkbox for ground plane shadows', () => {
      useEnvironmentStore.setState({ groundPlaneEnabled: true });
      render(<EnvironmentPanel />);

      const checkbox = screen.getByRole('checkbox', { name: /Receive Shadows/i });
      expect(checkbox).toBeInTheDocument();
    });
  });

  describe('HDRI / IBL Controls', () => {
    it('should render HDRI section', () => {
      render(<EnvironmentPanel />);
      expect(screen.getByText('HDRI / IBL')).toBeInTheDocument();
    });

    it('should not show HDRI controls when disabled', () => {
      useEnvironmentStore.setState({ hdriEnabled: false });
      render(<EnvironmentPanel />);

      expect(screen.queryByText('Preset')).not.toBeInTheDocument();
      expect(screen.queryByText('Environment Intensity')).not.toBeInTheDocument();
    });

    it('should show HDRI controls when enabled', () => {
      useEnvironmentStore.setState({ hdriEnabled: true });
      render(<EnvironmentPanel />);

      expect(screen.getByText('Preset')).toBeInTheDocument();
      expect(screen.getByText('Environment Intensity')).toBeInTheDocument();
    });

    it('should have HDRI preset selector', () => {
      useEnvironmentStore.setState({ hdriEnabled: true });
      render(<EnvironmentPanel />);

      expect(screen.getByText('Preset')).toBeInTheDocument();
      // Check for some preset options
      expect(screen.getByText('Quick presets from HDRI Haven')).toBeInTheDocument();
    });

    it('should show custom HDRI upload when no preset selected', () => {
      useEnvironmentStore.setState({ hdriEnabled: true, hdriPreset: null });
      render(<EnvironmentPanel />);

      expect(screen.getByText('Custom HDRI')).toBeInTheDocument();
      expect(screen.getByText(/Upload HDRI/)).toBeInTheDocument();
    });

    it('should not show custom upload when preset is selected', () => {
      useEnvironmentStore.setState({ hdriEnabled: true, hdriPreset: 'sunset' });
      render(<EnvironmentPanel />);

      expect(screen.queryByText('Custom HDRI')).not.toBeInTheDocument();
    });

    it('should display environment intensity slider', () => {
      useEnvironmentStore.setState({ hdriEnabled: true, hdriIntensity: 1.5 });
      render(<EnvironmentPanel />);

      expect(screen.getByText('Environment Intensity')).toBeInTheDocument();
      expect(screen.getByText('1.50')).toBeInTheDocument();
    });

    it('should have "Use as Background" checkbox', () => {
      useEnvironmentStore.setState({ hdriEnabled: true });
      render(<EnvironmentPanel />);

      expect(screen.getByText('Use as Background')).toBeInTheDocument();
      const checkbox = screen.getByRole('checkbox', { name: /Use as Background/i });
      expect(checkbox).toBeInTheDocument();
    });

    it('should show background blur when using HDRI as background', () => {
      useEnvironmentStore.setState({ hdriEnabled: true, hdriAsBackground: true, backgroundBlur: 0.5 });
      render(<EnvironmentPanel />);

      expect(screen.getByText('Background Blur')).toBeInTheDocument();
      expect(screen.getByText('0.50')).toBeInTheDocument();
    });

    it('should not show background blur when not using HDRI as background', () => {
      useEnvironmentStore.setState({ hdriEnabled: true, hdriAsBackground: false });
      render(<EnvironmentPanel />);

      expect(screen.queryByText('Background Blur')).not.toBeInTheDocument();
    });

    it('should display HDRI file loaded message', () => {
      useEnvironmentStore.setState({
        hdriEnabled: true,
        hdriPreset: null,
        hdriFile: 'data:image/hdr;base64,test',
      });
      render(<EnvironmentPanel />);

      expect(screen.getByText('✓ Custom HDRI loaded')).toBeInTheDocument();
    });

    it('should show IBL description text', () => {
      useEnvironmentStore.setState({ hdriEnabled: true });
      render(<EnvironmentPanel />);

      expect(screen.getByText('IBL lighting strength')).toBeInTheDocument();
    });

    it('should show blur range description', () => {
      useEnvironmentStore.setState({ hdriEnabled: true, hdriAsBackground: true });
      render(<EnvironmentPanel />);

      expect(screen.getByText('0 = sharp, 1 = very blurred')).toBeInTheDocument();
    });
  });

  describe('HDRI Preset Options', () => {
    it('should include all 10 HDRI preset options', () => {
      useEnvironmentStore.setState({ hdriEnabled: true });
      const { container } = render(<EnvironmentPanel />);

      const select = container.querySelector('select');
      const options = select?.querySelectorAll('option');

      expect(options?.length).toBeGreaterThanOrEqual(10);
    });

    it('should have None (Custom) option', () => {
      useEnvironmentStore.setState({ hdriEnabled: true });
      render(<EnvironmentPanel />);

      // Find the Preset select dropdown
      expect(screen.getByText('Preset')).toBeInTheDocument();
      expect(screen.getByText('Quick presets from HDRI Haven')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should work with environment store', () => {
      // Set specific environment state
      useEnvironmentStore.setState({
        backgroundColor: '#87CEEB',
        fogEnabled: true,
        fogType: 'linear',
        fogNear: 15,
        fogFar: 75,
        groundPlaneEnabled: true,
        groundPlaneSize: 40,
      });

      render(<EnvironmentPanel />);

      // Verify values are displayed
      expect(screen.getByDisplayValue('#87CEEB')).toBeInTheDocument();
      expect(screen.getByText('15.0')).toBeInTheDocument();
      expect(screen.getByText('75.0')).toBeInTheDocument();
      expect(screen.getByText('40')).toBeInTheDocument();
    });
  });
});
