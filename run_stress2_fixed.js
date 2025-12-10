const fetch = globalThis.fetch ?? require('node-fetch');

const CUSTOMER1 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywiZW1haWwiOiJjdXN0b21lcjFAZXhhbXBsZS5jb20iLCJyb2xlIjoiQ1VTVE9NRVIiLCJpYXQiOjE3NjUzNTczMTcsImV4cCI6MTc2NTk2MjExN30.FoeVVETtQsRcDNQR40v1697PiY_tR_237AGZ92eAPFY";
const CUSTOMER2 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwiZW1haWwiOiJjdXN0b21lcjJAZXhhbXBsZS5jb20iLCJyb2xlIjoiQ1VTVE9NRVIiLCJpYXQiOjE3NjUzNjEyODIsImV4cCI6MTc2NTk2NjA4Mn0.ClS-9in6d5tqSGu2505wPTY0uyyXUO4R6BbMr6w8oZ8";

const TOTAL_PER_CUSTOMER = 10; // 10 each -> 20 total
const URL_ADD = "http://127.0.0.1:3000/cart/items";
const URL_ORDER = "http://127.0.0.1:3000/orders";

async function addToCart(token) {
  try {
    const res = await fetch(URL_ADD, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ productId: 1, quantity: 1 })
    });
    return res.status;
  } catch (e) {
    return 0;
  }
}

async function placeOrder(token) {
  try {
    const res = await fetch(URL_ORDER, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
    });
    const text = await res.text();
    return { status: res.status, body: text };
  } catch (err) {
    return { status: 0, body: String(err) };
  }
}

async function attempt(token) {
  await addToCart(token);
  return await placeOrder(token);
}

(async () => {
  const tasks = [];
  for (let i = 0; i < TOTAL_PER_CUSTOMER; i++) {
    tasks.push(attempt(CUSTOMER1));
    tasks.push(attempt(CUSTOMER2));
  }

  // shuffle tasks
  for (let i = tasks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tasks[i], tasks[j]] = [tasks[j], tasks[i]];
  }

  console.log('Running', tasks.length, 'concurrent add+order attempts...');
  const results = await Promise.all(tasks);

  let success = 0, conflict = 0, empty = 0, other = 0;
  for (const r of results) {
    if (r.status === 201) success++;
    else if (r.status === 409 || (r.body && r.body.includes('Concurrent update'))) conflict++;
    else if (r.status === 400 && r.body && r.body.includes('Cart is empty')) empty++;
    else other++;
    console.log('->', r.status, r.body);
  }

  console.log('SUMMARY:', { total: results.length, success, conflict, empty, other });
  process.exit(0);
})();
