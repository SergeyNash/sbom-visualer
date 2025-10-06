import { SBOMComponent } from '../types/sbom';

export const mockSBOMData: SBOMComponent[] = [
  {
    id: 'app-main',
    name: 'MyApplication',
    type: 'application',
    license: 'MIT',
    version: '1.0.0',
    riskLevel: 'low',
    cveCount: 0,
    dependencies: ['react', 'axios', 'lodash', 'express'],
    description: 'Main application component'
  },
  {
    id: 'react',
    name: 'React',
    type: 'library',
    license: 'MIT',
    version: '18.3.1',
    riskLevel: 'low',
    cveCount: 0,
    dependencies: ['react-dom', 'scheduler'],
    description: 'A JavaScript library for building user interfaces'
  },
  {
    id: 'react-dom',
    name: 'ReactDOM',
    type: 'library',
    license: 'MIT',
    version: '18.3.1',
    riskLevel: 'low',
    cveCount: 0,
    dependencies: [],
    description: 'React package for working with the DOM'
  },
  {
    id: 'axios',
    name: 'Axios',
    type: 'library',
    license: 'MIT',
    version: '1.6.2',
    riskLevel: 'medium',
    cveCount: 2,
    dependencies: ['follow-redirects'],
    description: 'Promise based HTTP client for the browser and node.js'
  },
  {
    id: 'lodash',
    name: 'Lodash',
    type: 'library',
    license: 'MIT',
    version: '4.17.21',
    riskLevel: 'high',
    cveCount: 5,
    dependencies: [],
    description: 'A utility library delivering consistency, modularity, performance, & extras'
  },
  {
    id: 'express',
    name: 'Express',
    type: 'library',
    license: 'MIT',
    version: '4.18.2',
    riskLevel: 'medium',
    cveCount: 1,
    dependencies: ['body-parser', 'cookie-parser'],
    description: 'Fast, unopinionated, minimalist web framework for node'
  },
  {
    id: 'follow-redirects',
    name: 'follow-redirects',
    type: 'dependency',
    license: 'MIT',
    version: '1.15.4',
    riskLevel: 'low',
    cveCount: 0,
    dependencies: [],
    description: 'HTTP and HTTPS modules that follow redirects'
  },
  {
    id: 'body-parser',
    name: 'body-parser',
    type: 'dependency',
    license: 'MIT',
    version: '1.20.1',
    riskLevel: 'low',
    cveCount: 0,
    dependencies: [],
    description: 'Node.js body parsing middleware'
  },
  {
    id: 'cookie-parser',
    name: 'cookie-parser',
    type: 'dependency',
    license: 'MIT',
    version: '1.4.6',
    riskLevel: 'low',
    cveCount: 0,
    dependencies: [],
    description: 'Parse Cookie header and populate req.cookies'
  },
  {
    id: 'scheduler',
    name: 'Scheduler',
    type: 'dependency',
    license: 'MIT',
    version: '0.23.0',
    riskLevel: 'low',
    cveCount: 0,
    dependencies: [],
    description: 'Cooperative scheduler for the browser environment'
  },
  {
    id: 'moment',
    name: 'Moment.js',
    type: 'library',
    license: 'MIT',
    version: '2.29.4',
    riskLevel: 'medium',
    cveCount: 3,
    dependencies: [],
    description: 'Parse, validate, manipulate, and display dates in javascript'
  },
  {
    id: 'webpack',
    name: 'Webpack',
    type: 'dependency',
    license: 'MIT',
    version: '5.89.0',
    riskLevel: 'low',
    cveCount: 0,
    dependencies: ['webpack-cli'],
    description: 'A module bundler'
  },
  {
    id: 'webpack-cli',
    name: 'webpack-cli',
    type: 'dependency',
    license: 'MIT',
    version: '5.1.4',
    riskLevel: 'low',
    cveCount: 0,
    dependencies: [],
    description: 'CLI for webpack & friends'
  }
];