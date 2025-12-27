import { Link } from "react-router-dom";

export default function Navbar({ role, onLogout }) {
  return (
    <nav style={{ padding: "10px", borderBottom: "1px solid #ccc" }}>
      {role === "customer" && (
        <>
          <Link to="/customer">Books</Link> |{" "}
          <Link to="/cart">Cart</Link>
        </>
      )}

      {role === "admin" && (
        <>
          <Link to="/admin">Admin Panel</Link> |{" "}
          <Link to="/reports">Reports</Link>
        </>
      )}

      {" | "}
      <button onClick={onLogout}>Logout</button>
    </nav>
  );
}
