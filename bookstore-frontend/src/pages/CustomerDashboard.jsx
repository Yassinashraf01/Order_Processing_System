import { useEffect, useState } from "react";
import api from "../api/axios";

export default function CustomerDashboard() {
  const [books, setBooks] = useState([]);

  useEffect(() => {
    api.get("/books").then(res => setBooks(res.data));
  }, []);

  const addToCart = (isbn) => {
    api.post("/cart", { isbn, quantity: 1 });
  };

  return (
    <div>
      <h2>Books</h2>
      {books.map(b => (
        <div key={b.isbn}>
          <h4>{b.title}</h4>
          <p>Price: {b.price}</p>
          <button onClick={() => addToCart(b.isbn)}>Add</button>
        </div>
      ))}
    </div>
  );
}
