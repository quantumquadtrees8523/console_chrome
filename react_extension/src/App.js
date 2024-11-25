import './App.css';
import console_daytime_background from './console_daytime_background.jpeg';
import console_night_background from './console_night_background.jpeg';
import console_dusk_background from './console_dusk_background.jpeg';


import RetroInput from './components/retroInput';
import GreetingCard from './components/greetingCard';
import ThreadCard from './components/threadCard';

function App() {
  return (
    <div className="App" style={{
      backgroundImage: `url(${(() => {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 17) {
          return console_daytime_background;
        } else if (hour >= 17 && hour < 20) {
          return console_dusk_background;
        } else {
          return console_night_background;
        }
      })()})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '2rem'
    }}>
      <GreetingCard />
      <ThreadCard />
      <RetroInput />
    </div>
  );
}

export default App;
