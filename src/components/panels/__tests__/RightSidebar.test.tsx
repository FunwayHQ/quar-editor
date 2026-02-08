/**
 * Right Sidebar Component Tests
 * Sprint 5: Lighting & Environment - Environment Tab
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RightSidebar } from '../RightSidebar';
import { useObjectsStore } from '../../../stores/objectsStore';
import { useEnvironmentStore } from '../../../stores/environmentStore';
import { useCommandStore } from '../../../stores/commandStore';

describe('RightSidebar - Environment Tab Integration', () => {
  beforeEach(() => {
    // Reset all stores
    useObjectsStore.setState({
      objects: new Map(),
      selectedIds: [],
      transformMode: 'translate',
    });

    useEnvironmentStore.setState({
      backgroundColor: '#0A0A0B',
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

    useCommandStore.setState({
      history: [],
      currentIndex: -1,
      maxHistory: 100,
    });
  });

  describe('Tab Rendering', () => {
    it('should render all tabs', () => {
      render(<RightSidebar />);

      const tabs = screen.getAllByRole('button');
      // Now have 5 tabs: Properties, Material, Environment, Shape Keys, Modifiers
      // (Edit tab only shows when in edit mode)
      expect(tabs.length).toBeGreaterThanOrEqual(5);

      // Check tab text exists (use getAllByText since text might appear multiple times)
      expect(screen.getAllByText('Properties').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Material').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Environment').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Shape Keys').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Modifiers').length).toBeGreaterThan(0);
    });

    it('should show Properties tab by default', () => {
      render(<RightSidebar />);

      const tabs = screen.getAllByRole('button');
      const propertiesTab = tabs[0]; // First tab is Properties
      expect(propertiesTab).toHaveClass('border-[#7C3AED]');
    });

    it('should have all expected tabs', () => {
      render(<RightSidebar />);

      const tabs = screen.getAllByRole('button');
      expect(tabs.length).toBeGreaterThanOrEqual(5);
      // Verify tabs are buttons
      tabs.forEach(tab => {
        expect(tab.tagName).toBe('BUTTON');
      });
    });
  });

  describe('Tab Switching', () => {
    it('should switch to Material tab when clicked', () => {
      render(<RightSidebar />);

      const tabs = screen.getAllByRole('button');
      const materialTab = tabs[1]; // Second tab is Material
      fireEvent.click(materialTab);

      expect(materialTab).toHaveClass('border-[#7C3AED]');
    });

    it('should switch to Environment tab when clicked', () => {
      render(<RightSidebar />);

      const tabs = screen.getAllByRole('button');
      const environmentTab = tabs[2]; // Third tab is Environment
      fireEvent.click(environmentTab);

      expect(environmentTab).toHaveClass('border-[#7C3AED]');
    });

    it('should show Environment panel when Environment tab is active', () => {
      render(<RightSidebar />);

      const tabs = screen.getAllByRole('button');
      const environmentTab = tabs[2]; // Third tab
      fireEvent.click(environmentTab);

      // Environment panel should now be visible
      expect(screen.getByText('Lighting Presets')).toBeInTheDocument();
      expect(screen.getByText('Background')).toBeInTheDocument();
    });

    it('should show Properties panel when Properties tab is active', () => {
      render(<RightSidebar />);

      const tabs = screen.getAllByRole('button');
      const propertiesTab = tabs[0]; // First tab
      fireEvent.click(propertiesTab);

      // Properties panel should show "No object selected" when nothing is selected
      expect(screen.getByText('No object selected')).toBeInTheDocument();
    });
  });

  describe('Tab Styling', () => {
    it('should highlight active tab with purple border', () => {
      render(<RightSidebar />);

      const tabs = screen.getAllByRole('button');
      const propertiesTab = tabs[0];
      expect(propertiesTab).toHaveClass('border-[#7C3AED]');
      expect(propertiesTab).toHaveClass('text-[#FAFAFA]');
    });

    it('should show inactive tabs with gray text', () => {
      render(<RightSidebar />);

      const tabs = screen.getAllByRole('button');
      const materialTab = tabs[1];
      const environmentTab = tabs[2];

      expect(materialTab).toHaveClass('text-[#A1A1AA]');
      expect(environmentTab).toHaveClass('text-[#A1A1AA]');
    });

    it('should change styling when tab becomes active', () => {
      render(<RightSidebar />);

      const tabs = screen.getAllByRole('button');
      const environmentTab = tabs[2];

      // Before click - inactive
      expect(environmentTab).toHaveClass('text-[#A1A1AA]');

      // Click tab
      fireEvent.click(environmentTab);

      // After click - active
      expect(environmentTab).toHaveClass('border-[#7C3AED]');
      expect(environmentTab).toHaveClass('text-[#FAFAFA]');
    });
  });

  describe('Responsive Design', () => {
    it('should have scrollable tabs container', () => {
      render(<RightSidebar />);

      // Tabs container should be scrollable
      const tabsContainer = document.querySelector('.overflow-x-auto');
      expect(tabsContainer).toBeInTheDocument();
    });

    it('should show all tab labels with whitespace-nowrap', () => {
      render(<RightSidebar />);

      // All tabs should show their labels (use getAllByText for multiple matches)
      expect(screen.getAllByText('Properties').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Material').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Environment').length).toBeGreaterThan(0);
    });
  });

  describe('Integration with Environment Panel', () => {
    it('should show all environment presets when Environment tab is active', () => {
      render(<RightSidebar />);

      const tabs = screen.getAllByRole('button');
      fireEvent.click(tabs[2]); // Environment tab

      expect(screen.getByText('Studio')).toBeInTheDocument();
      expect(screen.getByText('Night')).toBeInTheDocument();
      expect(screen.getByText('Clear All')).toBeInTheDocument();
      // HDRI and Manual presets (multiple with same base name)
      const outdoorPresets = screen.getAllByText(/Outdoor/);
      const sunsetPresets = screen.getAllByText(/Sunset/);
      const warehousePresets = screen.getAllByText(/Warehouse/);
      expect(outdoorPresets.length).toBeGreaterThan(0);
      expect(sunsetPresets.length).toBeGreaterThan(0);
      expect(warehousePresets.length).toBeGreaterThan(0);
    });

    it('should show fog controls when Environment tab is active', () => {
      render(<RightSidebar />);

      const tabs = screen.getAllByRole('button');
      fireEvent.click(tabs[2]); // Environment tab

      expect(screen.getByText('Fog')).toBeInTheDocument();
    });

    it('should show ground plane controls when Environment tab is active', () => {
      render(<RightSidebar />);

      const tabs = screen.getAllByRole('button');
      fireEvent.click(tabs[2]); // Environment tab

      expect(screen.getByText('Ground Plane')).toBeInTheDocument();
    });
  });

  describe('Integration with Properties Panel', () => {
    it('should show object properties when object is selected and Properties tab is active', () => {
      const box = useObjectsStore.getState().createPrimitive('box');
      useObjectsStore.getState().addObject(box);
      useObjectsStore.setState({ selectedIds: [box.id] });

      render(<RightSidebar />);

      expect(screen.getByText('Transform')).toBeInTheDocument();
    });

    it('should show light properties when light is selected and Properties tab is active', () => {
      const light = useObjectsStore.getState().createPrimitive('pointLight');
      useObjectsStore.getState().addObject(light);
      useObjectsStore.setState({ selectedIds: [light.id] });

      render(<RightSidebar />);

      // Properties panel should be visible
      expect(screen.getByText('Transform')).toBeInTheDocument();

      // Light Properties should also be visible within Properties panel
      expect(screen.getByText('Light Properties')).toBeInTheDocument();
    });
  });

  describe('Panel Content Rendering', () => {
    it('should only render active panel content', () => {
      render(<RightSidebar />);

      // Properties panel should be visible by default
      expect(screen.getByText('No object selected')).toBeInTheDocument();

      // Environment panel content should not be visible
      expect(screen.queryByText('Lighting Presets')).not.toBeInTheDocument();
    });

    it('should switch panel content when changing tabs', () => {
      render(<RightSidebar />);

      // Start with Properties
      expect(screen.getByText('No object selected')).toBeInTheDocument();

      // Switch to Environment
      const tabs = screen.getAllByRole('button');
      fireEvent.click(tabs[2]); // Environment tab
      expect(screen.getByText('Lighting Presets')).toBeInTheDocument();
      expect(screen.queryByText('No object selected')).not.toBeInTheDocument();

      // Switch back to Properties
      fireEvent.click(tabs[0]); // Properties tab
      expect(screen.getByText('No object selected')).toBeInTheDocument();
      expect(screen.queryByText('Lighting Presets')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      render(<RightSidebar />);

      const buttons = screen.getAllByRole('button');
      // Now have 5+ tabs (Properties, Material, Environment, Shape Keys, Modifiers, maybe Edit)
      expect(buttons.length).toBeGreaterThanOrEqual(5);
      // All should be buttons
      buttons.forEach(btn => expect(btn.tagName).toBe('BUTTON'));
    });

    it('should have accessible tab navigation', () => {
      render(<RightSidebar />);

      const tabs = screen.getAllByRole('button');
      tabs.forEach(tab => {
        expect(tab).toBeInTheDocument();
      });
    });
  });

  describe('Layout', () => {
    it('should have fixed width sidebar', () => {
      const { container } = render(<RightSidebar />);

      const sidebar = container.firstChild as HTMLElement;
      expect(sidebar).toHaveClass('w-80');
    });

    it('should have glassmorphism styling', () => {
      const { container } = render(<RightSidebar />);

      const sidebar = container.firstChild as HTMLElement;
      expect(sidebar).toHaveClass('bg-[#18181B]/80');
      expect(sidebar).toHaveClass('backdrop-blur-md');
    });

    it('should have proper border', () => {
      const { container } = render(<RightSidebar />);

      const sidebar = container.firstChild as HTMLElement;
      expect(sidebar).toHaveClass('border-l');
      expect(sidebar).toHaveClass('border-[#27272A]');
    });
  });
});
