const fetch = globalThis.fetch ?? require('node-fetch');

const CUSTOMER1 = "...CUSTOMER1_TOKEN...";
const CUSTOMER2 = "...CUSTOMER2_TOKEN...";

const TOTAL_PER_CUSTOMER = 10; // 10 each -> 20 total
const URL_ADD = "http://127.0.0.1:3000/cart/items";
const URL_ORDER = "http://127.0.0.1:3000/orders";

async function addToCart(token) {
  const res = await fetch(URL_ADD, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ productId: 1, quantity: 1 })
  });
  return res.status;
}

async function placeOrder(token) {
  const res = await fetch(URL_ORDER, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

async function attempt(token, idx) {
  // add then order
  await addToCart(token);
  return await placeOrder(token);
}

(async () => {
  const tasks = [];
  for (let i=0;i<TOTAL_PER_CUSTOMER;i++){
    tasks.push(attempt(CUSTOMER1, i+1));
    tasks.push(attempt(CUSTOMER2, i+1));
  }
  // shuffle
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
