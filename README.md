# LaTeX Presentation Editor

A presentation editor that combines visual editing with LaTeX rendering, built with Electron, React, and TypeScript.

## Features

- Visual presentation editing interface
- LaTeX rendering for mathematical expressions and formatting
- Cross-platform desktop application (Windows, macOS, Linux)
- Modern React-based UI with TypeScript support
- Integrated development environment with hot reload

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development Scripts

- `npm run dev` - Start development server with hot reload
- `npm run start-react` - Start React development server only
- `npm run electron-dev` - Start Electron in development mode
- `npm run build` - Build both React and Electron for production
- `npm run build-react` - Build React app only
- `npm run build-electron` - Build Electron main process only
- `npm test` - Run tests once
- `npm run test:watch` - Run tests in watch mode
- `npm start` - Build and start production version
- `npm run dist` - Create distributable packages

### Project Structure

```
├── electron/           # Electron main process files
│   ├── main.ts        # Main Electron process
│   ├── preload.ts     # Preload script for secure IPC
│   └── tsconfig.json  # TypeScript config for Electron
├── src/               # React application source
│   ├── App.tsx        # Main React component
│   ├── index.tsx      # React entry point
│   └── ...
├── public/            # Static assets
├── build/             # Built application (generated)
└── dist/              # Distribution packages (generated)
```

### Development Workflow

1. Start the development environment:
   ```bash
   npm run dev
   ```
   This will start both the React development server and Electron application.

2. The React app will be available at `http://localhost:3000`
3. Electron will automatically load the React app and open the desktop application
4. Changes to React components will hot-reload automatically
5. Changes to Electron main process require restarting the Electron app

### Building for Production

1. Build the application:
   ```bash
   npm run build
   ```

2. Create distribution packages:
   ```bash
   npm run dist
   ```

### Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode during development:
```bash
npm run test:watch
```

## Architecture

- **Frontend**: React 18 with TypeScript
- **Desktop Framework**: Electron
- **State Management**: Redux Toolkit
- **Canvas Library**: Fabric.js for visual editing
- **Build Tool**: React Scripts with custom Electron integration
- **Testing**: Jest with React Testing Library

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.