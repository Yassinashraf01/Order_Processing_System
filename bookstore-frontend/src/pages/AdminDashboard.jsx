import { useState } from "react";
import api from "../api/axios";

export default function AdminDashboard() {
  const [title, setTitle] = useState("");

  const addBook = async () => {
    await api.post("/admin/books", { title });
    alert("Book added");
  };

  return (
    <div>
      <h2>Admin Panel</h2>
      <input onChange={e => setTitle(e.target.value)} placeholder="Book Title" />
      <button onClick={addBook}>Add Book</button>
    </div>
  );
}
