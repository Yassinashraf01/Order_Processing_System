import { useState } from "react";
import api from "../api/axios";

export default function Reports() {
  const [report, setReport] = useState(null);

  const loadReport = async (type) => {
    const res = await api.get(`/admin/reports/${type}`);
    setReport(res.data);
  };

  return (
    <div>
      <h2>System Reports</h2>

      <button onClick={() => loadReport("monthly-sales")}>
        Monthly Sales
      </button>

      <button onClick={() => loadReport("daily-sales")}>
        Daily Sales
      </button>

      <button onClick={() => loadReport("top-customers")}>
        Top Customers
      </button>

      <button onClick={() => loadReport("top-books")}>
        Top Books
      </button>

      <pre>{JSON.stringify(report, null, 2)}</pre>
    </div>
  );
}
