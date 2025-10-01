const axios = require('axios');

const BASE_URL = 'https://sih-project-backend-2a8n.onrender.com';

async function testComplaintEndpoints() {
    console.log('🧪 Testing Complaint API Endpoints\n');
    console.log(`🌐 Base URL: ${BASE_URL}\n`);

    const endpoints = [
        '/api/complaints',
        '/api/complaints/open', 
        '/api/complaints/closed',
        '/api/complaints/resolved'
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`📡 Testing ${endpoint}...`);
            const response = await axios.get(`${BASE_URL}${endpoint}`);
            
            console.log(`   ✅ Status: ${response.status}`);
            console.log(`   📊 Count: ${response.data.length || response.data.complaints?.length || 'N/A'} complaints`);
            
            // Analyze response structure
            if (response.data.length > 0) {
                const sample = response.data[0];
                console.log(`   🏷️ Sample Status: ${sample.status}`);
                console.log(`   📂 Sample Category: ${sample.category || 'N/A'}`);
            } else if (response.data.complaints && response.data.complaints.length > 0) {
                const sample = response.data.complaints[0];
                console.log(`   🏷️ Sample Status: ${sample.status}`);
                console.log(`   📂 Sample Category: ${sample.category || 'N/A'}`);
            } else {
                console.log(`   ℹ️ No complaints returned`);
            }
            
            // Show specific info for closed endpoint
            if (endpoint === '/api/complaints/closed') {
                const data = response.data.length ? response.data : response.data.complaints;
                if (data && data.length > 0) {
                    console.log(`   🚫 Closed Complaint Statuses:`);
                    const statusCount = {};
                    data.forEach(complaint => {
                        statusCount[complaint.status] = (statusCount[complaint.status] || 0) + 1;
                    });
                    Object.entries(statusCount).forEach(([status, count]) => {
                        console.log(`      • ${status}: ${count}`);
                    });
                }
            }
            
            console.log('');
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.response?.status} - ${error.response?.statusText || error.message}`);
            if (error.response?.data) {
                console.log(`   📄 Response: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
            }
            console.log('');
        }
    }

    console.log('🎯 ANALYSIS:');
    console.log('If /api/complaints/closed returns complaints but frontend doesn\'t show them:');
    console.log('1. Frontend is using wrong endpoint');
    console.log('2. Frontend filtering logic is incorrect');
    console.log('3. Frontend needs to refresh/clear cache');
    console.log('4. Frontend is looking for wrong status values');
}

testComplaintEndpoints().catch(console.error);