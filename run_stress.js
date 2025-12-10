const fetch = globalThis.fetch ?? require('node-fetch');

const CUSTOMER1 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywiZW1haWwiOiJjdXN0b21lcjFAZXhhbXBsZS5jb20iLCJyb2xlIjoiQ1VTVE9NRVIiLCJpYXQiOjE3NjUzNTczMTcsImV4cCI6MTc2NTk2MjExN30.FoeVVETtQsRcDNQR40v1697PiY_tR_237AGZ92eAPFY";
const CUSTOMER2 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwiZW1haWwiOiJjdXN0b21lcjJAZXhhbXBsZS5jb20iLCJyb2xlIjoiQ1VTVE9NRVIiLCJpYXQiOjE3NjUzNjEyODIsImV4cCI6MTc2NTk2NjA4Mn0.ClS-9in6d5tqSGu2505wPTY0uyyXUO4R6BbMr6w8oZ8";

const TOTAL_PER_CUSTOMER = 10; // 10 requests per customer -> 20 total
const URL = "http://127.0.0.1:3000/orders";

async function makeRequest(token, idx) {
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
    });
    const text = await res.text();
    return { idx, status: res.status, body: text };
  } catch (err) {
    return { idx, status: 0, body: String(err) };
  }
}

(async () => {
  const tasks = [];
  let counter = 0;
  for (let i=0;i<TOTAL_PER_CUSTOMER;i++){
    tasks.push(makeRequest(CUSTOMER1, ++counter));
    tasks.push(makeRequest(CUSTOMER2, ++counter));
  }

  // Shuffle to increase chance of collision
  for (let i = tasks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tasks[i], tasks[j]] = [tasks[j], tasks[i]];
  }

  console.log("Sending", tasks.length, "parallel requests...");
  const results = await Promise.all(tasks);

  let success = 0, conflict = 0, other = 0;
  for (const r of results) {
    console.log("----");
    console.log("req#", r.idx, "status:", r.status);
    console.log("body:", r.body);
    if (r.status === 201) success++;
    else if (r.status === 409 || (r.body && r.body.includes("Concurrent update"))) conflict++;
    else other++;
  }

  console.log("==== SUMMARY ====");
  console.log("total:", results.length, "success(201):", success, "conflict/insufficient:", conflict, "other:", other);

  process.exit(0);
})();
