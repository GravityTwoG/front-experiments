import { ElectroMagneticField2DWidget } from './pages/ElectroMagneticField/ElectroMagneticField2DWidget';
import { HeatConductionWidget } from './pages/HeatConductionWidget/HeatConductionWidget';
import { ImageShaderWidget } from './pages/ImageShader/ImageShaderWidget';
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
  {
    path: '/electro-magnetic-field',
    component: ElectroMagneticField2DWidget,
    name: 'Electro Magnetic Field 2D',
  },
  {
    path: '/image-shaders',
    component: ImageShaderWidget,
    name: 'Image Shaders',
  },
];
