import App from './src/app/App';
import pack from './assets/pack.json';

export default function RootApp() {
  return <App pack={pack} />;
}
