/**
 * Lighting Presets Unit Tests
 * Sprint 5: Lighting & Environment
 */

import { describe, it, expect } from 'vitest';
import { lightingPresets, createLightFromPreset } from '../lightingPresets';

describe('lightingPresets', () => {
  describe('Preset Definitions', () => {
    it('should have 8 presets defined', () => {
      expect(lightingPresets).toHaveLength(8);
    });

    it('should have all required preset properties', () => {
      lightingPresets.forEach((preset) => {
        expect(preset).toHaveProperty('id');
        expect(preset).toHaveProperty('name');
        expect(preset).toHaveProperty('description');
        expect(preset).toHaveProperty('lights');
        expect(typeof preset.id).toBe('string');
        expect(typeof preset.name).toBe('string');
        expect(typeof preset.description).toBe('string');
        expect(Array.isArray(preset.lights)).toBe(true);
      });
    });

    it('should have unique preset IDs', () => {
      const ids = lightingPresets.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(lightingPresets.length);
    });

    it('should have preset names', () => {
      const names = lightingPresets.map((p) => p.name);
      expect(names).toContain('Studio');
      expect(names).toContain('Night');
      expect(names).toContain('Clear All');
      // HDRI presets
      expect(names.some(n => n.includes('Outdoor'))).toBe(true);
      expect(names.some(n => n.includes('Warehouse'))).toBe(true);
      expect(names.some(n => n.includes('Sunset'))).toBe(true);
    });
  });

  describe('Studio Preset', () => {
    const studio = lightingPresets.find((p) => p.id === 'studio')!;

    it('should exist', () => {
      expect(studio).toBeDefined();
    });

    it('should have 4 lights (key, fill, rim, ambient)', () => {
      expect(studio.lights).toHaveLength(4);
    });

    it('should have a key light with shadow casting', () => {
      const keyLight = studio.lights.find((l) => l.name === 'Key Light');
      expect(keyLight).toBeDefined();
      expect(keyLight?.type).toBe('spotLight');
      expect(keyLight?.lightProps?.castShadow).toBe(true);
      expect(keyLight?.lightProps?.intensity).toBeGreaterThan(2);
    });

    it('should have environment settings', () => {
      expect(studio.environment).toBeDefined();
      expect(studio.environment?.backgroundColor).toBeDefined();
      expect(studio.environment?.groundPlaneEnabled).toBe(true);
    });

    it('should have proper light positioning', () => {
      studio.lights.forEach((light) => {
        expect(light.position).toBeDefined();
        expect(light.position).toHaveLength(3);
        expect(light.rotation).toHaveLength(3);
        expect(light.scale).toHaveLength(3);
      });
    });
  });

  describe('Outdoor Manual Preset', () => {
    const outdoor = lightingPresets.find((p) => p.id === 'outdoor-manual')!;

    it('should exist', () => {
      expect(outdoor).toBeDefined();
    });

    it('should have 2 lights (sun + sky)', () => {
      expect(outdoor.lights).toHaveLength(2);
    });

    it('should have a directional sun light', () => {
      const sun = outdoor.lights.find((l) => l.name === 'Sun');
      expect(sun).toBeDefined();
      expect(sun?.type).toBe('directionalLight');
      expect(sun?.lightProps?.castShadow).toBe(true);
      expect(sun?.lightProps?.intensity).toBeGreaterThan(2);
    });

    it('should have sky ambient light', () => {
      const sky = outdoor.lights.find((l) => l.name === 'Sky Light');
      expect(sky).toBeDefined();
      expect(sky?.type).toBe('ambientLight');
      expect(sky?.lightProps?.color).toContain('#');
    });

    it('should have fog enabled', () => {
      expect(outdoor.environment?.fogEnabled).toBe(true);
      expect(outdoor.environment?.fogType).toBe('linear');
    });
  });

  describe('Night Preset', () => {
    const night = lightingPresets.find((p) => p.id === 'night')!;

    it('should exist', () => {
      expect(night).toBeDefined();
    });

    it('should have 4 lights (moon + accents)', () => {
      expect(night.lights).toHaveLength(4);
    });

    it('should have moonlight', () => {
      const moon = night.lights.find((l) => l.name === 'Moonlight');
      expect(moon).toBeDefined();
      expect(moon?.type).toBe('directionalLight');
      expect(moon?.lightProps?.intensity).toBeLessThan(1.5);
    });

    it('should have colored accent lights', () => {
      const streetLamp = night.lights.find((l) => l.name === 'Street Lamp');
      const neon = night.lights.find((l) => l.name === 'Neon Light');

      expect(streetLamp).toBeDefined();
      expect(neon).toBeDefined();
      expect(streetLamp?.lightProps?.color).toBeDefined();
      expect(neon?.lightProps?.color).toBeDefined();
    });

    it('should have dark background', () => {
      expect(night.environment?.backgroundColor).toBeDefined();
      expect(night.environment?.backgroundColor?.startsWith('#')).toBe(true);
    });

    it('should have exponential fog', () => {
      expect(night.environment?.fogType).toBe('exponential');
    });
  });

  describe('Sunset Manual Preset', () => {
    const sunset = lightingPresets.find((p) => p.id === 'sunset')!;

    it('should exist', () => {
      expect(sunset).toBeDefined();
    });

    it('should have warm sun light', () => {
      const sun = sunset.lights.find((l) => l.name === 'Setting Sun');
      expect(sun).toBeDefined();
      expect(sun?.type).toBe('directionalLight');
      expect(sun?.lightProps?.color).toContain('FF');
    });

    it('should have purple/blue ambient', () => {
      const ambient = sunset.lights.find((l) => l.name === 'Sky Ambient');
      expect(ambient).toBeDefined();
      expect(ambient?.type).toBe('ambientLight');
    });
  });

  describe('HDRI Presets', () => {
    it('should have Outdoor HDRI preset', () => {
      const outdoor = lightingPresets.find((p) => p.id === 'outdoor');
      expect(outdoor).toBeDefined();
      expect(outdoor?.environment?.hdriEnabled).toBe(true);
      expect(outdoor?.environment?.hdriPreset).toBe('park');
      expect(outdoor?.lights).toHaveLength(0); // HDRI provides lighting
    });

    it('should have Warehouse HDRI preset', () => {
      const warehouse = lightingPresets.find((p) => p.id === 'warehouse');
      expect(warehouse).toBeDefined();
      expect(warehouse?.environment?.hdriEnabled).toBe(true);
      expect(warehouse?.environment?.hdriPreset).toBe('warehouse');
      expect(warehouse?.environment?.hdriIntensity).toBeGreaterThan(1);
    });

    it('should have Sunset HDRI preset', () => {
      const sunset = lightingPresets.find((p) => p.id === 'sunset-hdri');
      expect(sunset).toBeDefined();
      expect(sunset?.environment?.hdriEnabled).toBe(true);
      expect(sunset?.environment?.hdriPreset).toBe('sunset');
      expect(sunset?.environment?.hdriAsBackground).toBe(true);
    });

    it('should configure HDRI as background for HDRI presets', () => {
      const hdriPresets = lightingPresets.filter((p) => p.environment?.hdriEnabled);

      hdriPresets.forEach((preset) => {
        expect(preset.environment?.hdriAsBackground).toBe(true);
        expect(preset.environment?.hdriPreset).toBeDefined();
      });
    });

    it('should have no manual lights in HDRI presets', () => {
      const outdoor = lightingPresets.find((p) => p.id === 'outdoor');
      const warehouse = lightingPresets.find((p) => p.id === 'warehouse');
      const sunset = lightingPresets.find((p) => p.id === 'sunset-hdri');

      expect(outdoor?.lights).toHaveLength(0);
      expect(warehouse?.lights).toHaveLength(0);
      expect(sunset?.lights).toHaveLength(0);
    });

    it('should have environment intensity configured', () => {
      const hdriPresets = lightingPresets.filter((p) => p.environment?.hdriEnabled);

      hdriPresets.forEach((preset) => {
        expect(preset.environment?.hdriIntensity).toBeDefined();
        expect(preset.environment?.hdriIntensity).toBeGreaterThan(0);
      });
    });

    it('should enable ground plane for HDRI presets', () => {
      const hdriPresets = lightingPresets.filter((p) => p.environment?.hdriEnabled);

      hdriPresets.forEach((preset) => {
        expect(preset.environment?.groundPlaneEnabled).toBe(true);
      });
    });

    it('should have background blur settings', () => {
      const sunset = lightingPresets.find((p) => p.id === 'sunset-hdri');
      expect(sunset?.environment?.backgroundBlur).toBeDefined();
      expect(sunset?.environment?.backgroundBlur).toBeGreaterThanOrEqual(0);
      expect(sunset?.environment?.backgroundBlur).toBeLessThanOrEqual(1);
    });
  });

  describe('Clear All Preset', () => {
    const clear = lightingPresets.find((p) => p.id === 'clear')!;

    it('should exist', () => {
      expect(clear).toBeDefined();
    });

    it('should have no lights', () => {
      expect(clear.lights).toHaveLength(0);
    });

    it('should reset environment to defaults', () => {
      expect(clear.environment?.backgroundColor).toBe('#0A0A0B');
      expect(clear.environment?.fogEnabled).toBe(false);
      expect(clear.environment?.groundPlaneEnabled).toBe(false);
    });
  });

  describe('createLightFromPreset', () => {
    it('should create a complete SceneObject from preset data', () => {
      const studio = lightingPresets.find((p) => p.id === 'studio')!;
      const presetLight = studio.lights[0];

      const light = createLightFromPreset(presetLight);

      expect(light.id).toBeDefined();
      expect(light.id).toContain('light_');
      expect(light.createdAt).toBeDefined();
      expect(light.modifiedAt).toBeDefined();
      expect(light.name).toBe(presetLight.name);
      expect(light.type).toBe(presetLight.type);
      expect(light.lightProps).toBeDefined();
    });

    it('should generate unique IDs for each light', () => {
      const studio = lightingPresets.find((p) => p.id === 'studio')!;
      const light1 = createLightFromPreset(studio.lights[0]);
      const light2 = createLightFromPreset(studio.lights[0]);

      expect(light1.id).not.toBe(light2.id);
    });

    it('should preserve light properties', () => {
      const studio = lightingPresets.find((p) => p.id === 'studio')!;
      const keyLight = studio.lights.find((l) => l.name === 'Key Light')!;

      const light = createLightFromPreset(keyLight);

      expect(light.lightProps?.color).toBe(keyLight.lightProps?.color);
      expect(light.lightProps?.intensity).toBe(keyLight.lightProps?.intensity);
      expect(light.lightProps?.castShadow).toBe(keyLight.lightProps?.castShadow);
      expect(light.position).toEqual(keyLight.position);
      expect(light.rotation).toEqual(keyLight.rotation);
    });

    it('should set timestamps', () => {
      const studio = lightingPresets.find((p) => p.id === 'studio')!;
      const beforeTime = Date.now();
      const light = createLightFromPreset(studio.lights[0]);
      const afterTime = Date.now();

      expect(light.createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(light.createdAt).toBeLessThanOrEqual(afterTime);
      expect(light.modifiedAt).toBe(light.createdAt);
    });
  });

  describe('Light Properties Validation', () => {
    it('should have valid light properties for all presets', () => {
      lightingPresets.forEach((preset) => {
        preset.lights.forEach((light) => {
          if (light.lightProps) {
            expect(light.lightProps.color).toBeDefined();
            expect(light.lightProps.intensity).toBeGreaterThan(0);

            // Type-specific validations
            if (light.type === 'pointLight' || light.type === 'spotLight') {
              expect(light.lightProps.distance).toBeGreaterThanOrEqual(0);
              expect(light.lightProps.decay).toBeGreaterThanOrEqual(0);
            }

            if (light.type === 'spotLight') {
              expect(light.lightProps.angle).toBeGreaterThan(0);
              expect(light.lightProps.angle).toBeLessThanOrEqual(Math.PI / 2);
              expect(light.lightProps.penumbra).toBeGreaterThanOrEqual(0);
              expect(light.lightProps.penumbra).toBeLessThanOrEqual(1);
            }
          }
        });
      });
    });

    it('should have valid positions for all lights', () => {
      lightingPresets.forEach((preset) => {
        preset.lights.forEach((light) => {
          expect(light.position).toHaveLength(3);
          light.position.forEach((coord) => {
            expect(typeof coord).toBe('number');
            expect(isFinite(coord)).toBe(true);
          });
        });
      });
    });
  });
});
