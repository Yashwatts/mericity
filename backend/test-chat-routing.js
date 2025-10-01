const mongoose = require("mongoose");
const Chat = require("./models/Chat");
const Complaint = require("./models/Complaint");
const User = require("./models/User");
const Admin = require("./models/Admin");
const Department = require("./models/Department");

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/SIH2024", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Connected to MongoDB");
  testChatRouting();
}).catch((err) => {
  console.error("MongoDB connection error:", err);
});

async function testChatRouting() {
  try {
    console.log("\n=== Testing Chat Routing ===");
    
    // Find a complaint with in_progress status
    const complaint = await Complaint.findOne({ status: 'in_progress' })
      .populate('userId', 'name email')
      .populate('assignedAdmin', 'name email')
      .populate('assignedDepartment', 'name email');
    
    if (!complaint) {
      console.log("No in_progress complaint found.");
      process.exit(1);
    }
    
    console.log(`\nUsing complaint: ${complaint._id}`);
    console.log(`User: ${complaint.userId?.name || 'None'}`);
    console.log(`Admin: ${complaint.assignedAdmin?.name || 'None'}`);
    console.log(`Department: ${complaint.assignedDepartment?.name || 'None'}`);
    
    // Check existing chats for this complaint
    const existingChats = await Chat.find({ complaintId: complaint._id });
    console.log(`\nExisting chats for this complaint: ${existingChats.length}`);
    
    existingChats.forEach((chat, index) => {
      console.log(`  ${index + 1}. Type: ${chat.chatType}, Messages: ${chat.messages.length}`);
      console.log(`     Participants: ${chat.participants.map(p => `${p.participantRole}(${p.participantName})`).join(', ')}`);
    });
    
    // Simulate department creating chat with admin
    if (complaint.assignedDepartment) {
      console.log('\n--- Testing Department → Admin Chat ---');
      
      let deptToAdminChat = await Chat.findOne({ 
        complaintId: complaint._id, 
        chatType: 'admin-department' 
      });
      
      if (!deptToAdminChat) {
        console.log('Creating admin-department chat (dept initiated)');
        
        // Find an admin for this city
        let admin = complaint.assignedAdmin;
        if (!admin) {
          admin = await Admin.findOne({
            assignedCity: { $regex: new RegExp(`^${complaint.location.city}$`, "i") },
            assignedState: { $regex: new RegExp(`^${complaint.location.state}$`, "i") },
            isActive: true
          });
        }
        
        if (admin) {
          deptToAdminChat = new Chat({
            complaintId: complaint._id,
            chatType: 'admin-department',
            participants: [
              {
                participantId: admin._id,
                participantModel: 'Admin',
                participantName: admin.name,
                participantRole: 'admin'
              },
              {
                participantId: complaint.assignedDepartment._id,
                participantModel: 'Department',
                participantName: complaint.assignedDepartment.name,
                participantRole: 'department'
              }
            ]
          });
          
          await deptToAdminChat.save();
          console.log(`Created chat: ${deptToAdminChat._id}`);
        }
      } else {
        console.log(`Found existing admin-department chat: ${deptToAdminChat._id}`);
      }
      
      // Add a test message from department
      if (deptToAdminChat) {
        const testMessage = {
          senderId: complaint.assignedDepartment._id,
          senderModel: 'Department',
          senderName: complaint.assignedDepartment.name,
          senderRole: 'department',
          content: `Test message from department to admin at ${new Date().toLocaleString()}`,
          messageType: 'text',
          timestamp: new Date(),
          isRead: []
        };
        
        deptToAdminChat.messages.push(testMessage);
        await deptToAdminChat.save();
        console.log(`Added message. Chat now has ${deptToAdminChat.messages.length} messages`);
      }
    }
    
    // Test admin trying to retrieve the same chat
    console.log('\n--- Testing Admin Chat Retrieval ---');
    
    const adminDepartmentChat = await Chat.findOne({
      complaintId: complaint._id,
      chatType: 'admin-department'
    });
    
    if (adminDepartmentChat) {
      console.log(`Admin found chat: ${adminDepartmentChat._id} with ${adminDepartmentChat.messages.length} messages`);
      
      // Show the last message
      if (adminDepartmentChat.messages.length > 0) {
        const lastMsg = adminDepartmentChat.messages[adminDepartmentChat.messages.length - 1];
        console.log(`Last message: [${lastMsg.senderName}] ${lastMsg.content}`);
      }
    } else {
      console.log('❌ Admin could not find the admin-department chat!');
    }
    
    console.log('\n✅ Chat routing test completed');
    
  } catch (error) {
    console.error("❌ Chat routing test failed:", error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}