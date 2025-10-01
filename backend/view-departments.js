/**
 * Script to view all departments and department detection keywords
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function viewAllDepartmentsAndKeywords() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const Department = require('./models/Department');
    
    // Get all departments
    console.log('\n🏢 ALL DEPARTMENTS IN DATABASE:');
    console.log('=' .repeat(80));
    
    const allDepartments = await Department.find({})
      .select('name departmentType assignedCity assignedState assignedDistrict email contactNumber serviceAreas isActive')
      .lean();
    
    console.log(`\nFound ${allDepartments.length} total departments:\n`);
    
    // Group by city for better organization
    const departmentsByCity = {};
    allDepartments.forEach(dept => {
      const city = dept.assignedCity || 'Unknown';
      if (!departmentsByCity[city]) {
        departmentsByCity[city] = [];
      }
      departmentsByCity[city].push(dept);
    });
    
    // Display departments by city
    Object.keys(departmentsByCity).sort().forEach(city => {
      console.log(`\n🌆 ${city.toUpperCase()}:`);
      console.log('-'.repeat(40));
      
      departmentsByCity[city].forEach((dept, index) => {
        const status = dept.isActive ? '✅ Active' : '❌ Inactive';
        console.log(`\n${index + 1}. ${dept.name} ${status}`);
        console.log(`   Type: ${dept.departmentType}`);
        console.log(`   Location: ${dept.assignedCity}, ${dept.assignedState}`);
        if (dept.assignedDistrict) {
          console.log(`   District: ${dept.assignedDistrict}`);
        }
        console.log(`   Contact: ${dept.contactNumber}`);
        console.log(`   Email: ${dept.email}`);
        
        if (dept.serviceAreas && dept.serviceAreas.length > 0) {
          console.log(`   Services: ${dept.serviceAreas.slice(0, 3).join(', ')}${dept.serviceAreas.length > 3 ? '...' : ''}`);
        }
      });
    });
    
    // Show department detection keywords
    console.log('\n\n🤖 DEPARTMENT DETECTION KEYWORDS:');
    console.log('=' .repeat(80));
    
    const departmentDetectionService = require('./services/departmentDetectionService');
    
    // Read the department keywords from the service file
    const fs = require('fs');
    const serviceContent = fs.readFileSync('./services/departmentDetectionService.js', 'utf8');
    
    // Extract the departmentMap from the file content
    const departmentMapMatch = serviceContent.match(/const departmentMap = \{([\s\S]*?)\};/);
    
    if (departmentMapMatch) {
      console.log('\nKeywords used for automatic department detection:\n');
      
      // Parse the department keywords (simplified parsing)
      const lines = departmentMapMatch[1].split('\n');
      let currentDept = '';
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('"') && trimmed.includes('": [')) {
          currentDept = trimmed.split('"')[1];
          console.log(`\n📋 ${currentDept}:`);
        } else if (trimmed.startsWith('"') && currentDept) {
          // Extract keywords from the line
          const keywordLine = trimmed.replace(/"/g, '').replace(/,$/, '');
          const keywords = keywordLine.split(', ');
          console.log(`   Keywords: ${keywords.slice(0, 10).join(', ')}${keywords.length > 10 ? ' ...' : ''}`);
          console.log(`   Total Keywords: ${keywords.length}`);
        }
      });
    }
    
    // Show department type mapping
    console.log('\n\n🔄 DEPARTMENT TYPE MAPPING:');
    console.log('=' .repeat(80));
    console.log('\nHow AI-detected departments map to database department types:\n');
    
    const departmentTypeMappingMatch = serviceContent.match(/const departmentTypeMapping = \{([\s\S]*?)\};/);
    
    if (departmentTypeMappingMatch) {
      const mappingContent = departmentTypeMappingMatch[1];
      const mappingLines = mappingContent.split('\n');
      
      mappingLines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('"') && trimmed.includes('": [')) {
          const aiDept = trimmed.split('"')[1];
          const dbTypesMatch = trimmed.match(/\[(.*?)\]/);
          if (dbTypesMatch) {
            const dbTypes = dbTypesMatch[1].split(',').map(t => t.trim().replace(/"/g, ''));
            console.log(`\n🎯 AI Detects: "${aiDept}"`);
            console.log(`   Maps to DB Types: ${dbTypes.join(', ')}`);
          }
        }
      });
    }
    
    // Test department detection for common complaint types
    console.log('\n\n🧪 TESTING DEPARTMENT DETECTION:');
    console.log('=' .repeat(80));
    
    const testComplaints = [
      'Potholes on the main road need urgent repair',
      'Garbage not collected for 3 days in our area',
      'Fire emergency - building caught fire',
      'Water leakage from main pipeline',
      'Street lights not working in our locality',
      'Noise pollution from construction site',
      'Stray dogs creating problems',
      'Traffic signal not working properly'
    ];
    
    console.log('\nTesting automatic department detection for common complaints:\n');
    
    for (let i = 0; i < testComplaints.length; i++) {
      const complaint = testComplaints[i];
      console.log(`\n${i + 1}. "${complaint}"`);
      
      try {
        const detection = await departmentDetectionService.detectDepartment(
          complaint, 
          '', 
          { city: 'Chandigarh', state: 'Chandigarh' }
        );
        
        console.log(`   → Detected: ${detection.department}`);
        console.log(`   → Confidence: ${(detection.confidence * 100).toFixed(0)}%`);
        console.log(`   → Method: ${detection.analysis_method}`);
        if (detection.keywords_matched && detection.keywords_matched.length > 0) {
          console.log(`   → Keywords: ${detection.keywords_matched.slice(0, 3).join(', ')}`);
        }
      } catch (error) {
        console.log(`   → Error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

viewAllDepartmentsAndKeywords();