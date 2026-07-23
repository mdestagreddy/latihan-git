import { Link, Outlet } from "react-router";

function MainLayout() {
  return (
    <div>
      <nav>
        <ul>
          <li>
            <Link to="/">Beranda</Link>
          </li>
          <li>
            <Link to="/crud-axios">Crud Axios</Link>
          </li>
          <li>
            <Link to="/category">Kategori</Link>
          </li>
          <li>
            <Link to="/nothing-here">Nothing Here</Link>
          </li>
        </ul>
      </nav>
      <Outlet />
    </div>
  );
}

export default MainLayout