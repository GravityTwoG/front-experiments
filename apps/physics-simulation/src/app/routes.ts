import { HeatConductionWidget } from './pages/HeatConductionWidget/HeatConductionWidget';
import { SeamCarving } from './pages/SeamCarving/SeamCarving';

export const routes = [
  {
    path: '/',
    component: HeatConductionWidget,
    name: 'Heat Conduction 2D',
  },
  {
    path: '/seam-carving',
    component: SeamCarving,
    name: 'Seam Carving',
  },
];
