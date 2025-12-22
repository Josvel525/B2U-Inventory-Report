function generatePDF() {
  const data = JSON.parse(localStorage.getItem("products")) || [];

  if (!data.length) {
    alert("No inventory data found.");
    return;
  }

  let rows = "";
  let grandTotal = 0;

  data.forEach(p => {
    const singles = p.singles || 0;
    const cases = p.cases || 0;
    const pack = p.pack || 24;
    const total = singles + cases * pack;
    grandTotal += total;

    rows += `
      <tr>
        <td>${p.name}</td>
        <td>${singles}</td>
        <td>${cases}</td>
        <td>${pack}</td>
        <td><strong>${total}</strong></td>
      </tr>
    `;
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Inventory Report</title>
  <style>
    body {
      font-family: Inter, Arial, sans-serif;
      padding: 24px;
    }
    h1 {
      margin-bottom: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: center;
    }
    th {
      background: #111;
      color: #fff;
    }
    td:first-child {
      text-align: left;
      font-weight: 600;
    }
    tfoot td {
      font-weight: 700;
      background: #f8fafc;
    }
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <h1>End of Night Inventory Report</h1>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Singles</th>
        <th>Cases</th>
        <th>Pack</th>
        <th>Total Units</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
    <tfoot>
      <tr>
        <td>Grand Total</td>
        <td colspan="3"></td>
        <td>${grandTotal}</td>
      </tr>
    </tfoot>
  </table>

  <script>
    window.onload = () => window.print();
  </script>
</body>
</html>
`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
}