/**
 * Three.js Singleton for Tests
 *
 * Ensures all test files use the same Three.js instance
 * Sprint Y: Fix "Multiple instances of Three.js" warning
 */

import * as THREE from 'three';

// Set global flag to prevent warning
if (typeof window !== 'undefined' && !(window as any).__THREE__) {
  (window as any).__THREE__ = THREE.REVISION;
}

// Export the singleton instance
export { THREE };
export default THREE;
