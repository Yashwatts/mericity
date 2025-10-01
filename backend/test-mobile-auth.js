const http = require("http");

function testEndpoint(path, data, description) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: "localhost",
      port: 5000,
      path: path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    console.log(`\n=== Testing ${description} ===`);
    console.log(`URL: http://localhost:5000${path}`);
    console.log(`Data:`, data);

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

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  try {
    // Test 1: Register with mobile number
    await testEndpoint(
      "/auth/register",
      {
        phone: "9876543210",
        password: "test123",
        name: "Mobile Test User",
      },
      "Mobile Registration"
    );

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test 2: Login with mobile number
    await testEndpoint(
      "/auth/login",
      {
        phone: "9876543210",
        password: "test123",
      },
      "Mobile Login"
    );

    // Test 3: Register with different mobile number (to test uniqueness)
    await testEndpoint(
      "/auth/register",
      {
        phone: "8765432109",
        password: "test456",
        name: "Another Mobile User",
      },
      "Another Mobile Registration"
    );

    // Test 4: Try to register with same mobile number (should fail)
    await testEndpoint(
      "/auth/register",
      {
        phone: "9876543210",
        password: "test789",
        name: "Duplicate Mobile User",
      },
      "Duplicate Mobile Registration (should fail)"
    );

    // Test 5: Login with wrong password
    await testEndpoint(
      "/auth/login",
      {
        phone: "9876543210",
        password: "wrongpassword",
      },
      "Mobile Login with Wrong Password (should fail)"
    );

    // Test 6: Login with non-existent mobile
    await testEndpoint(
      "/auth/login",
      {
        phone: "1234567890",
        password: "test123",
      },
      "Login with Non-existent Mobile (should fail)"
    );
  } catch (error) {
    console.error("Test failed:", error);
  }
}

console.log("Starting Mobile Authentication Tests...");
runTests()
  .then(() => {
    console.log("\n=== All tests completed ===");
  })
  .catch((err) => {
    console.error("Tests failed:", err);
  });
