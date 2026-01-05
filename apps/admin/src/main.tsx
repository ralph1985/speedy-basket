import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const theme = extendTheme({
  styles: {
    global: {
      body: {
        background: '#0f1117',
        color: '#eef1ff',
      },
    },
  },
  fonts: {
    heading: "'Space Grotesk', system-ui, sans-serif",
    body: "'Space Grotesk', system-ui, sans-serif",
  },
});

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  );
}
