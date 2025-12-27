export default function BookCard({ book, onAddToCart }) {
  return (
    <div style={{ border: "1px solid #ccc", margin: "10px", padding: "10px" }}>
      <h4>{book.title}</h4>
      <p>ISBN: {book.isbn}</p>
      <p>Price: {book.price}</p>
      <p>Stock: {book.quantity}</p>

      {onAddToCart && (
        <button onClick={() => onAddToCart(book.isbn)}>
          Add to Cart
        </button>
      )}
    </div>
  );
}
