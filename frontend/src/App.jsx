const API_URL = import.meta.env.VITE_API_URL;

function App() {
  return (
    <div>
      <h1>App</h1>
      <p>API: {API_URL}</p>
    </div>
  );
}

export default App;
