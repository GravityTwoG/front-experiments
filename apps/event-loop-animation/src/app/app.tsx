import styles from './app.module.scss';
import { Button } from '@front-experiments/ui';

export function App() {
  return (
    <div className={styles['App']}>
      <Button>Hello</Button>
    </div>
  );
}

export default App;
