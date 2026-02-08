# QUAR Editor - Open Source Version

A next-generation, web-based 3D design platform that runs 100% in your browser. No backend, no cloud, no tracking - just pure local 3D editing power.

## Features

✅ **Full 3D Editing** - Create, transform, and manipulate 3D objects
✅ **Material System** - PBR materials with texture support
✅ **Lighting & Environment** - HDRI, IBL, multiple light types
✅ **Animation Timeline** - Keyframe animation with bezier curve editor
✅ **Polygon Editing** - Vertex/edge/face manipulation (MVP)
✅ **File Import/Export** - GLB, GLTF, FBX, OBJ, USDZ support
✅ **100% Offline** - Works without internet (PWA)
✅ **Privacy-First** - All data stays on your device
✅ **Open Source** - MIT licensed, community-driven

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/FunwayHQ/quar-editor.git
cd quar-editor

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

The app will open at `http://localhost:3000`

### Build for Production

```bash
# Standard build
npm run build

# PWA build (with offline support)
npm run build:pwa

# Preview production build
npm run preview
```

## Project Structure

```
quar-editor/
├── src/
│   ├── components/       # React components
│   ├── lib/
│   │   ├── storage/     # IndexedDB & LocalStorage adapters
│   │   ├── scene/       # Scene serialization
│   │   ├── file-system/ # File import/export
│   │   └── three/       # Three.js utilities
│   ├── stores/          # Zustand stores
│   ├── hooks/           # React hooks
│   └── App.tsx          # Main app component
├── public/              # Static assets
└── tests/               # Test files
```

## Storage

All data is stored locally:

- **IndexedDB**: Scene data, projects, assets, undo history
- **LocalStorage**: User preferences, theme, shortcuts
- **Files**: Download/upload `.quar` scene files

## Testing

```bash
# Run unit tests
npm test

# Run tests with UI
npm run test:ui

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

## Development

```bash
# Linting
npm run lint
npm run lint:fix

# Type checking
npm run type-check
```

## Architecture

### Storage Abstraction

The app uses a storage adapter pattern that works with IndexedDB:

```typescript
import { getStorageAdapter } from '@/lib/storage';

const storage = getStorageAdapter(); // Returns IndexedDB adapter
await storage.saveProject(projectData);
```

### Feature Flags

Cloud features are disabled by default (`VITE_CLOUD_ENABLED=false`). The codebase is designed to share 80% of code with the commercial cloud version.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Community

- **Discord**: [discord.gg/quareditor](https://discord.gg/quareditor)
- **Twitter**: [@quareditor](https://twitter.com/quareditor)
- **GitHub Discussions**: [github.com/FunwayHQ/quar-editor/discussions](https://github.com/FunwayHQ/quar-editor/discussions)

## Comparison with Cloud Version

| Feature | Open Source | Cloud Version |
|---------|-------------|---------------|
| 3D Editing | ✅ | ✅ |
| Materials & Lighting | ✅ | ✅ |
| Animation | ✅ | ✅ |
| Polygon Editing (MVP) | ✅ | ✅ Advanced |
| Export Formats | ✅ | ✅ |
| Visual Scripting | ❌ | ✅ (Premium) |
| Storage | IndexedDB (local) | Cloud + S3 |
| Collaboration | ❌ | ✅ Real-time |
| Version History | Manual `.quar` files | ✅ Git-like |
| AI Generation | ❌ | ✅ Built-in |
| Authentication | ❌ | ✅ |
| Cost | Free forever | Freemium |

## Support

- **Issues**: [GitHub Issues](https://github.com/FunwayHQ/quar-editor/issues)
- **Documentation**: [docs.quar.pro](https://docs.quar.pro)

---

Made with 💜 by the QUAR Team and contributors worldwide.
