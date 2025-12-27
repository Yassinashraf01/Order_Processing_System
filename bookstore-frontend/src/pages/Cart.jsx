import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Cart() {
  const [cart, setCart] = useState([]);
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");

  useEffect(() => {
    api.get("/cart").then(res => setCart(res.data));
  }, []);

  const removeItem = async (isbn) => {
    await api.delete(`/cart/${isbn}`);
    setCart(cart.filter(item => item.isbn !== isbn));
  };

  const checkout = async () => {
    try {
      await api.post("/checkout", { card, expiry });
      alert("Order placed successfully");
      setCart([]);
    } catch {
      alert("Checkout failed");
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div>
      <h2>Shopping Cart</h2>

      {cart.map(item => (
        <div key={item.isbn}>
          <p>{item.title} × {item.quantity}</p>
          <p>Price: {item.price}</p>
          <button onClick={() => removeItem(item.isbn)}>Remove</button>
        </div>
      ))}

      <h3>Total: {total}</h3>

      <input placeholder="Card Number" onChange={e => setCard(e.target.value)} />
      <input placeholder="Expiry Date" onChange={e => setExpiry(e.target.value)} />

      <button onClick={checkout}>Checkout</button>
    </div>
  );
}
