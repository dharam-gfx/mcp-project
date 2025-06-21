import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import AIAgent from './components/AIAgent'
import './App.css'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AIAgent />
    </ThemeProvider>
  );
}

export default App;
