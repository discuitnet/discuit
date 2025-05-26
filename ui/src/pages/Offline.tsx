import Navbar from '../components/Navbar';

const Offline = () => {
  const handleRetry = () => window.location.reload();
  return (
    <>
      <Navbar offline />
      <div className="page-content page-notfound page-offline">
        <h1>{"You're offline"}</h1>
        <p>Check your internet connection.</p>
        <button onClick={handleRetry}>Retry</button>
      </div>
    </>
  );
};

export default Offline;
