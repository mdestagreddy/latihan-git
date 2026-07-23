import { Link } from "react-router";

function NoMatchLayout() {
  return (
    <div>
      <h2>Tidak ada apa-apa disini</h2>
      <p>
        <Link to="/">Kembali ke halaman utama</Link>
      </p>
    </div>
  );
}

export default NoMatchLayout