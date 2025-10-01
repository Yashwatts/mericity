const http = require("http");

function testRegistration(phone, password, name) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ phone, password, name });

    const options = {
      hostname: "localhost",
      port: 5000,
      path: "/auth/register",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };

    console.log(`\n=== Testing Registration for ${phone} ===`);
    console.log(`Data:`, { phone, password, name });

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        console.log(`Status: ${res.statusCode}`);
        try {
          const jsonBody = JSON.parse(body);
          console.log(`Response:`, jsonBody);
        } catch (e) {
          console.log(`Response (raw):`, body);
        }
        resolve({ status: res.statusCode, body: body });
      });
    });

    req.on("error", (err) => {
      console.error(`Error: ${err.message}`);
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

async function testNewRegistrations() {
  console.log("Testing New Mobile Registrations...\n");

  // Test valid Indian phone numbers
  const testCases = [
    { phone: "8765432109", password: "test456", name: "Test User 1" },
    { phone: "9123456789", password: "test789", name: "Test User 2" },
    { phone: "7890123456", password: "test101", name: "Test User 3" },
  ];

  for (const testCase of testCases) {
    try {
      await testRegistration(testCase.phone, testCase.password, testCase.name);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait between tests
    } catch (error) {
      console.error("Test failed:", error);
    }
  }

  console.log("\n=== All registration tests completed ===");
}

testNewRegistrations();
