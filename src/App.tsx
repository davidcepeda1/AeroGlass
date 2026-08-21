import coverPlaceholder from "./assets/cover-placeholder.svg";
import "./App.css";

function App() {
  return (
    <main className="card">
      <div className="content">
        <img src={coverPlaceholder} alt="Album cover" className="cover" />
        <div className="info">
          <p className="title">No track playing</p>
          <p className="artist">—</p>
        </div>
      </div>

      <div className="controls"></div>
    </main>
  );
}

export default App;
