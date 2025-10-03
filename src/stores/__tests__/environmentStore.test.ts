/**
 * Environment Store Unit Tests
 * Sprint 5: Lighting & Environment
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useEnvironmentStore } from '../environmentStore';

describe('environmentStore', () => {
  beforeEach(() => {
    // Reset store before each test
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
  });

  describe('Background Color', () => {
    it('should have default background color', () => {
      const { backgroundColor } = useEnvironmentStore.getState();
      expect(backgroundColor).toBe('#0A0A0B');
    });

    it('should update background color', () => {
      const { setBackgroundColor } = useEnvironmentStore.getState();
      setBackgroundColor('#FF0000');

      const { backgroundColor } = useEnvironmentStore.getState();
      expect(backgroundColor).toBe('#FF0000');
    });

    it('should accept hex color strings', () => {
      const { setBackgroundColor } = useEnvironmentStore.getState();
      setBackgroundColor('#87CEEB');

      const { backgroundColor } = useEnvironmentStore.getState();
      expect(backgroundColor).toBe('#87CEEB');
    });
  });

  describe('Fog Settings', () => {
    it('should have fog disabled by default', () => {
      const { fogEnabled } = useEnvironmentStore.getState();
      expect(fogEnabled).toBe(false);
    });

    it('should toggle fog enabled', () => {
      const { setFogEnabled } = useEnvironmentStore.getState();

      setFogEnabled(true);
      expect(useEnvironmentStore.getState().fogEnabled).toBe(true);

      setFogEnabled(false);
      expect(useEnvironmentStore.getState().fogEnabled).toBe(false);
    });

    it('should update fog type', () => {
      const { setFogType } = useEnvironmentStore.getState();

      setFogType('exponential');
      expect(useEnvironmentStore.getState().fogType).toBe('exponential');

      setFogType('linear');
      expect(useEnvironmentStore.getState().fogType).toBe('linear');
    });

    it('should update fog color', () => {
      const { setFogColor } = useEnvironmentStore.getState();
      setFogColor('#FFFFFF');

      expect(useEnvironmentStore.getState().fogColor).toBe('#FFFFFF');
    });

    it('should update linear fog parameters', () => {
      const { setFogNear, setFogFar } = useEnvironmentStore.getState();

      setFogNear(5);
      setFogFar(100);

      const state = useEnvironmentStore.getState();
      expect(state.fogNear).toBe(5);
      expect(state.fogFar).toBe(100);
    });

    it('should update exponential fog density', () => {
      const { setFogDensity } = useEnvironmentStore.getState();
      setFogDensity(0.1);

      expect(useEnvironmentStore.getState().fogDensity).toBe(0.1);
    });

    it('should handle fog density edge cases', () => {
      const { setFogDensity } = useEnvironmentStore.getState();

      setFogDensity(0);
      expect(useEnvironmentStore.getState().fogDensity).toBe(0);

      setFogDensity(0.5);
      expect(useEnvironmentStore.getState().fogDensity).toBe(0.5);
    });
  });

  describe('Ground Plane', () => {
    it('should have ground plane disabled by default', () => {
      const { groundPlaneEnabled } = useEnvironmentStore.getState();
      expect(groundPlaneEnabled).toBe(false);
    });

    it('should toggle ground plane', () => {
      const { setGroundPlaneEnabled } = useEnvironmentStore.getState();

      setGroundPlaneEnabled(true);
      expect(useEnvironmentStore.getState().groundPlaneEnabled).toBe(true);

      setGroundPlaneEnabled(false);
      expect(useEnvironmentStore.getState().groundPlaneEnabled).toBe(false);
    });

    it('should update ground plane size', () => {
      const { setGroundPlaneSize } = useEnvironmentStore.getState();
      setGroundPlaneSize(50);

      expect(useEnvironmentStore.getState().groundPlaneSize).toBe(50);
    });

    it('should update ground plane color', () => {
      const { setGroundPlaneColor } = useEnvironmentStore.getState();
      setGroundPlaneColor('#FF0000');

      expect(useEnvironmentStore.getState().groundPlaneColor).toBe('#FF0000');
    });

    it('should toggle shadow receiving', () => {
      const { setGroundPlaneReceiveShadow } = useEnvironmentStore.getState();

      setGroundPlaneReceiveShadow(false);
      expect(useEnvironmentStore.getState().groundPlaneReceiveShadow).toBe(false);

      setGroundPlaneReceiveShadow(true);
      expect(useEnvironmentStore.getState().groundPlaneReceiveShadow).toBe(true);
    });

    it('should have default ground plane properties', () => {
      const state = useEnvironmentStore.getState();

      expect(state.groundPlaneSize).toBe(20);
      expect(state.groundPlaneColor).toBe('#27272A');
      expect(state.groundPlaneReceiveShadow).toBe(true);
    });
  });

  describe('Complete Environment Setup', () => {
    it('should configure complete outdoor environment', () => {
      const store = useEnvironmentStore.getState();

      store.setBackgroundColor('#87CEEB');
      store.setFogEnabled(true);
      store.setFogType('linear');
      store.setFogColor('#C8E6FF');
      store.setFogNear(10);
      store.setFogFar(50);
      store.setGroundPlaneEnabled(true);
      store.setGroundPlaneColor('#90EE90');

      const state = useEnvironmentStore.getState();

      expect(state.backgroundColor).toBe('#87CEEB');
      expect(state.fogEnabled).toBe(true);
      expect(state.fogType).toBe('linear');
      expect(state.fogColor).toBe('#C8E6FF');
      expect(state.fogNear).toBe(10);
      expect(state.fogFar).toBe(50);
      expect(state.groundPlaneEnabled).toBe(true);
      expect(state.groundPlaneColor).toBe('#90EE90');
    });

    it('should configure night environment with exponential fog', () => {
      const store = useEnvironmentStore.getState();

      store.setBackgroundColor('#0A0A14');
      store.setFogEnabled(true);
      store.setFogType('exponential');
      store.setFogDensity(0.08);
      store.setGroundPlaneEnabled(true);

      const state = useEnvironmentStore.getState();

      expect(state.backgroundColor).toBe('#0A0A14');
      expect(state.fogType).toBe('exponential');
      expect(state.fogDensity).toBe(0.08);
      expect(state.groundPlaneEnabled).toBe(true);
    });
  });

  describe('HDRI / IBL Settings', () => {
    it('should have HDRI disabled by default', () => {
      const { hdriEnabled } = useEnvironmentStore.getState();
      expect(hdriEnabled).toBe(false);
    });

    it('should toggle HDRI enabled', () => {
      const { setHdriEnabled } = useEnvironmentStore.getState();

      setHdriEnabled(true);
      expect(useEnvironmentStore.getState().hdriEnabled).toBe(true);

      setHdriEnabled(false);
      expect(useEnvironmentStore.getState().hdriEnabled).toBe(false);
    });

    it('should set HDRI preset', () => {
      const { setHdriPreset } = useEnvironmentStore.getState();
      setHdriPreset('sunset');

      const state = useEnvironmentStore.getState();
      expect(state.hdriPreset).toBe('sunset');
      expect(state.hdriFile).toBeNull(); // File should be cleared when preset is set
    });

    it('should set custom HDRI file', () => {
      const { setHdriFile } = useEnvironmentStore.getState();
      setHdriFile('data:image/hdr;base64,abc123');

      const state = useEnvironmentStore.getState();
      expect(state.hdriFile).toBe('data:image/hdr;base64,abc123');
      expect(state.hdriPreset).toBeNull(); // Preset should be cleared when file is set
    });

    it('should update HDRI intensity', () => {
      const { setHdriIntensity } = useEnvironmentStore.getState();
      setHdriIntensity(2.5);

      expect(useEnvironmentStore.getState().hdriIntensity).toBe(2.5);
    });

    it('should have default HDRI intensity of 1', () => {
      const { hdriIntensity } = useEnvironmentStore.getState();
      expect(hdriIntensity).toBe(1);
    });

    it('should toggle HDRI as background', () => {
      const { setHdriAsBackground } = useEnvironmentStore.getState();

      setHdriAsBackground(false);
      expect(useEnvironmentStore.getState().hdriAsBackground).toBe(false);

      setHdriAsBackground(true);
      expect(useEnvironmentStore.getState().hdriAsBackground).toBe(true);
    });

    it('should have HDRI as background enabled by default', () => {
      const { hdriAsBackground } = useEnvironmentStore.getState();
      expect(hdriAsBackground).toBe(true);
    });

    it('should update background blur', () => {
      const { setBackgroundBlur } = useEnvironmentStore.getState();

      setBackgroundBlur(0.5);
      expect(useEnvironmentStore.getState().backgroundBlur).toBe(0.5);

      setBackgroundBlur(0);
      expect(useEnvironmentStore.getState().backgroundBlur).toBe(0);

      setBackgroundBlur(1);
      expect(useEnvironmentStore.getState().backgroundBlur).toBe(1);
    });

    it('should handle HDRI preset switching', () => {
      const { setHdriPreset } = useEnvironmentStore.getState();

      setHdriPreset('warehouse');
      expect(useEnvironmentStore.getState().hdriPreset).toBe('warehouse');

      setHdriPreset('park');
      expect(useEnvironmentStore.getState().hdriPreset).toBe('park');

      setHdriPreset(null);
      expect(useEnvironmentStore.getState().hdriPreset).toBeNull();
    });

    it('should configure complete HDRI environment', () => {
      const store = useEnvironmentStore.getState();

      store.setHdriEnabled(true);
      store.setHdriPreset('sunset');
      store.setHdriIntensity(1.5);
      store.setHdriAsBackground(true);
      store.setBackgroundBlur(0.3);

      const state = useEnvironmentStore.getState();

      expect(state.hdriEnabled).toBe(true);
      expect(state.hdriPreset).toBe('sunset');
      expect(state.hdriIntensity).toBe(1.5);
      expect(state.hdriAsBackground).toBe(true);
      expect(state.backgroundBlur).toBe(0.3);
    });

    it('should handle custom HDRI file with settings', () => {
      const store = useEnvironmentStore.getState();

      store.setHdriEnabled(true);
      store.setHdriFile('data:image/hdr;base64,test');
      store.setHdriIntensity(2);
      store.setHdriAsBackground(false);

      const state = useEnvironmentStore.getState();

      expect(state.hdriEnabled).toBe(true);
      expect(state.hdriFile).toBe('data:image/hdr;base64,test');
      expect(state.hdriPreset).toBeNull();
      expect(state.hdriIntensity).toBe(2);
      expect(state.hdriAsBackground).toBe(false);
    });
  });
});
