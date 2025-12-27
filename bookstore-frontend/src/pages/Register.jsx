import { useState } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const register = async () => {
    try {
      await api.post("/register", form);
      alert("Registration successful");
      navigate("/");
    } catch (err) {
      alert("Registration failed");
    }
  };

  return (
    <div>
      <h2>Customer Registration</h2>

      {Object.keys(form).map((key) => (
        <input
          key={key}
          name={key}
          placeholder={key}
          type={key === "password" ? "password" : "text"}
          onChange={handleChange}
        />
      ))}

      <button onClick={register}>Register</button>
    </div>
  );
}
