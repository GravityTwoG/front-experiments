import { HeatConduction2D } from './pages/HeatConduction2D/HeatConduction2D';
import { SeamCarving } from './pages/SeamCarving/SeamCarving';

export const routes = [
  {
    path: '/',
    component: HeatConduction2D,
    name: 'Heat Conduction 2D',
  },
  {
    path: '/seam-carving',
    component: SeamCarving,
    name: 'Seam Carving',
  },
];
